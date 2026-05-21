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

