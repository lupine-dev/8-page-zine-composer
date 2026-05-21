# Zine WASM

A Rust + WebAssembly library for assembling individual pages into **print-ready zine layouts**. Image processing is performed with `imagemagick-wasm` in the browser.

## What it does

When printing a booklet or zine, pages must be arranged on a large sheet in a specific order so that after folding and cutting, each page appears in the correct sequence. This library handles all the math and compositing automatically in the browser — no server required.

## API

All functions accept `&[u8]` bytes (PNG or JPEG) and return `Vec<u8>` PNG bytes. Built with [`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen), using `imagemagick-wasm` for image operations.

| Function | Description |
| --- | --- |
| `pages_to_print_ready(p1…p8)` | 8 individual pages → print-ready sheet |
| `pages_to_digital_ready(p1…p8)` | 8 individual pages → digital sheet |
| `digital_to_print_ready(sheet_bytes)` | Digital sheet → print-ready sheet |
| `print_ready_to_digital(sheet_bytes)` | Print-ready sheet → digital sheet |

## Quick start

### Build the WASM module

```bash
# Install wasm-pack if you haven't already
cargo install wasm-pack

# Build for the web
wasm-pack build --target web
```

This produces bindings in `pkg/` (e.g. `pkg/zine_wasm.js`).

### Use in the browser

See `example.html` for a working demo. The pattern is simple:

```javascript
import init, { digital_to_print_ready } from './pkg/zine_wasm.js';

await init(); // loads and initializes WebAssembly

const resultBytes = digital_to_print_ready(imageBytes);
```
