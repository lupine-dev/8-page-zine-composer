use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "/src/imagemagick.js")]
extern "C" {
    #[wasm_bindgen(catch, js_name = pagesToPrintReady)]
    fn pages_to_print_ready_js(
        p1: &[u8], p2: &[u8], p3: &[u8], p4: &[u8],
        p5: &[u8], p6: &[u8], p7: &[u8], p8: &[u8]
    ) -> Result<Vec<u8>, JsValue>;
}

#[wasm_bindgen]
pub fn pages_to_print_ready(
    p1: &[u8], p2: &[u8], p3: &[u8], p4: &[u8],
    p5: &[u8], p6: &[u8], p7: &[u8], p8: &[u8]
) -> Result<Vec<u8>, JsValue> {
    pages_to_print_ready_js(p1, p2, p3, p4, p5, p6, p7, p8)
}
