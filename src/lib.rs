use wasm_bindgen::prelude::*;
use image::{imageops, RgbaImage, ImageOutputFormat};
use std::io::Cursor;

/// Helper function to load raw bytes from JS into an RgbaImage
fn load_rgba(bytes: &[u8]) -> Result<RgbaImage, JsValue> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;
    Ok(img.into_rgba8())
}

/// Helper function to encode an RgbaImage back into PNG bytes for JS
fn encode_rgba(img: RgbaImage) -> Result<Vec<u8>, JsValue> {
    let mut out = Vec::new();
    let dyn_img = image::DynamicImage::ImageRgba8(img);
    dyn_img.write_to(&mut Cursor::new(&mut out), ImageOutputFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("Failed to encode image: {}", e)))?;
    Ok(out)
}

#[wasm_bindgen]
pub fn pages_to_print_ready(
    p1: &[u8], p2: &[u8], p3: &[u8], p4: &[u8],
    p5: &[u8], p6: &[u8], p7: &[u8], p8: &[u8]
) -> Result<Vec<u8>, JsValue> {
    let imgs = vec![
        load_rgba(p1)?, load_rgba(p2)?, load_rgba(p3)?, load_rgba(p4)?,
        load_rgba(p5)?, load_rgba(p6)?, load_rgba(p7)?, load_rgba(p8)?
    ];

    let w = imgs[0].width();
    let h = imgs[0].height();
    let mut canvas = RgbaImage::new(w * 4, h * 2);

    // Top row: Pages 1, 8, 7, 6 (all upside down)
    imageops::overlay(&mut canvas, &imageops::rotate180(&imgs[0]), 0, 0);
    imageops::overlay(&mut canvas, &imageops::rotate180(&imgs[7]), w as i64, 0);
    imageops::overlay(&mut canvas, &imageops::rotate180(&imgs[6]), (w * 2) as i64, 0);
    imageops::overlay(&mut canvas, &imageops::rotate180(&imgs[5]), (w * 3) as i64, 0);

    // Bottom row: Pages 2, 3, 4, 5 (right side up)
    imageops::overlay(&mut canvas, &imgs[1], 0, h as i64);
    imageops::overlay(&mut canvas, &imgs[2], w as i64, h as i64);
    imageops::overlay(&mut canvas, &imgs[3], (w * 2) as i64, h as i64);
    imageops::overlay(&mut canvas, &imgs[4], (w * 3) as i64, h as i64);

    encode_rgba(canvas)
}

#[wasm_bindgen]
pub fn pages_to_digital_ready(
    p1: &[u8], p2: &[u8], p3: &[u8], p4: &[u8],
    p5: &[u8], p6: &[u8], p7: &[u8], p8: &[u8]
) -> Result<Vec<u8>, JsValue> {
    let imgs = vec![
        load_rgba(p1)?, load_rgba(p2)?, load_rgba(p3)?, load_rgba(p4)?,
        load_rgba(p5)?, load_rgba(p6)?, load_rgba(p7)?, load_rgba(p8)?
    ];

    let w = imgs[0].width();
    let h = imgs[0].height();
    let mut canvas = RgbaImage::new(w * 4, h * 2);

    // Top row: 1, 2, 3, 4 (right side up)
    imageops::overlay(&mut canvas, &imgs[0], 0, 0);
    imageops::overlay(&mut canvas, &imgs[1], w as i64, 0);
    imageops::overlay(&mut canvas, &imgs[2], (w * 2) as i64, 0);
    imageops::overlay(&mut canvas, &imgs[3], (w * 3) as i64, 0);

    // Bottom row: 5, 6, 7, 8 (right side up)
    imageops::overlay(&mut canvas, &imgs[4], 0, h as i64);
    imageops::overlay(&mut canvas, &imgs[5], w as i64, h as i64);
    imageops::overlay(&mut canvas, &imgs[6], (w * 2) as i64, h as i64);
    imageops::overlay(&mut canvas, &imgs[7], (w * 3) as i64, h as i64);

    encode_rgba(canvas)
}

#[wasm_bindgen]
pub fn digital_to_print_ready(sheet_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut sheet = load_rgba(sheet_bytes)?;
    let w = sheet.width() / 4;
    let h = sheet.height() / 2;
    let mut canvas = RgbaImage::new(sheet.width(), sheet.height());

    // Extract pages from the digital layout
    let p1 = imageops::crop(&mut sheet, 0, 0, w, h).to_image();
    let p2 = imageops::crop(&mut sheet, w, 0, w, h).to_image();
    let p3 = imageops::crop(&mut sheet, w * 2, 0, w, h).to_image();
    let p4 = imageops::crop(&mut sheet, w * 3, 0, w, h).to_image();
    let p5 = imageops::crop(&mut sheet, 0, h, w, h).to_image();
    let p6 = imageops::crop(&mut sheet, w, h, w, h).to_image();
    let p7 = imageops::crop(&mut sheet, w * 2, h, w, h).to_image();
    let p8 = imageops::crop(&mut sheet, w * 3, h, w, h).to_image();

    // Map to the print layout
    imageops::overlay(&mut canvas, &imageops::rotate180(&p1), 0, 0);
    imageops::overlay(&mut canvas, &imageops::rotate180(&p8), w as i64, 0);
    imageops::overlay(&mut canvas, &imageops::rotate180(&p7), (w * 2) as i64, 0);
    imageops::overlay(&mut canvas, &imageops::rotate180(&p6), (w * 3) as i64, 0);

    imageops::overlay(&mut canvas, &p2, 0, h as i64);
    imageops::overlay(&mut canvas, &p3, w as i64, h as i64);
    imageops::overlay(&mut canvas, &p4, (w * 2) as i64, h as i64);
    imageops::overlay(&mut canvas, &p5, (w * 3) as i64, h as i64);

    encode_rgba(canvas)
}

#[wasm_bindgen]
pub fn print_ready_to_digital(sheet_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut sheet = load_rgba(sheet_bytes)?;
    let w = sheet.width() / 4;
    let h = sheet.height() / 2;
    let mut canvas = RgbaImage::new(sheet.width(), sheet.height());

    // Extract pages from their specific positions in the print layout
    // The top row needs to be un-rotated (which means rotating 180 again)
    let p1 = imageops::rotate180(&imageops::crop(&mut sheet, 0, 0, w, h).to_image());
    let p8 = imageops::rotate180(&imageops::crop(&mut sheet, w, 0, w, h).to_image());
    let p7 = imageops::rotate180(&imageops::crop(&mut sheet, w * 2, 0, w, h).to_image());
    let p6 = imageops::rotate180(&imageops::crop(&mut sheet, w * 3, 0, w, h).to_image());

    // Bottom row pages are already right-side up
    let p2 = imageops::crop(&mut sheet, 0, h, w, h).to_image();
    let p3 = imageops::crop(&mut sheet, w, h, w, h).to_image();
    let p4 = imageops::crop(&mut sheet, w * 2, h, w, h).to_image();
    let p5 = imageops::crop(&mut sheet, w * 3, h, w, h).to_image();

    // Reassemble into the digital format
    imageops::overlay(&mut canvas, &p1, 0, 0);
    imageops::overlay(&mut canvas, &p2, w as i64, 0);
    imageops::overlay(&mut canvas, &p3, (w * 2) as i64, 0);
    imageops::overlay(&mut canvas, &p4, (w * 3) as i64, 0);

    imageops::overlay(&mut canvas, &p5, 0, h as i64);
    imageops::overlay(&mut canvas, &p6, w as i64, h as i64);
    imageops::overlay(&mut canvas, &p7, (w * 2) as i64, h as i64);
    imageops::overlay(&mut canvas, &p8, (w * 3) as i64, h as i64);

    encode_rgba(canvas)
}
