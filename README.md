# Zine WASM

A JavaScript library for assembling individual pages into **print-ready zine layouts**. Image processing is performed with `imagemagick-wasm` in the browser.

## What it does

When printing a booklet or zine, pages must be arranged on a large sheet in a specific order so that after folding and cutting, each page appears in the correct sequence. This library handles all the math and compositing automatically in the browser — no server required.

## API

All functions accept `Uint8Array` image bytes (PNG or JPEG) and return PNG bytes. The library runs fully in the browser and uses `imagemagick-wasm` for image operations.

| Function | Description |
| --- | --- |
| `pages_to_print_ready(p1…p8)` | 8 individual pages → print-ready sheet |

## Quick start

### Use in the browser

See `example.html` for a working demo. The pattern is simple:

```javascript
import init, { pages_to_print_ready } from './src/index.js';

await init(); // loads and initializes imagemagick-wasm

const resultBytes = pages_to_print_ready(
  page1, page2, page3, page4,
  page5, page6, page7, page8
);
```
