const OUTPUT_DPI = 300;
const SHEET_WIDTH_INCHES = 11;
const SHEET_HEIGHT_INCHES = 8.5;
const OUTPUT_WIDTH = SHEET_WIDTH_INCHES * OUTPUT_DPI;
const OUTPUT_HEIGHT = SHEET_HEIGHT_INCHES * OUTPUT_DPI;
const COLUMN_COUNT = 4;
const ROW_COUNT = 2;
const SLOT_WIDTH = OUTPUT_WIDTH / COLUMN_COUNT;
const SLOT_HEIGHT = OUTPUT_HEIGHT / ROW_COUNT;

const LAYOUT = [
  { x: 0 * SLOT_WIDTH, y: 0 * SLOT_HEIGHT, rotate: true },
  { x: 1 * SLOT_WIDTH, y: 0 * SLOT_HEIGHT, rotate: true },
  { x: 2 * SLOT_WIDTH, y: 0 * SLOT_HEIGHT, rotate: true },
  { x: 3 * SLOT_WIDTH, y: 0 * SLOT_HEIGHT, rotate: true },
  { x: 0 * SLOT_WIDTH, y: 1 * SLOT_HEIGHT, rotate: false },
  { x: 1 * SLOT_WIDTH, y: 1 * SLOT_HEIGHT, rotate: false },
  { x: 2 * SLOT_WIDTH, y: 1 * SLOT_HEIGHT, rotate: false },
  { x: 3 * SLOT_WIDTH, y: 1 * SLOT_HEIGHT, rotate: false },
];

const PAGE_NAMES = [
  'Front Cover (Page 1)',
  'Page 2',
  'Page 3',
  'Page 4',
  'Page 5',
  'Page 6',
  'Page 7',
  'Back Cover (Page 8)',
];

// ---- canvas layer ----

export async function init() {
  ensureBrowserSupport();
}

export async function pagesToPrintReady(p1, p2, p3, p4, p5, p6, p7, p8) {
  ensureBrowserSupport();

  const pages = [p5, p4, p3, p2, p6, p7, p8, p1];
  const decodedPages = await Promise.all(pages.map((page) => decodeImage(page)));
  const canvas = createCanvas(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const context = getContext(canvas);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  try {
    decodedPages.forEach((image, index) => {
      drawPage(context, image, LAYOUT[index]);
    });
  } finally {
    decodedPages.forEach((image) => {
      if (typeof image.close === "function") {
        image.close();
      }
    });
  }

  return canvasToPngBytes(canvas);
}

function ensureBrowserSupport() {
  const canCreateCanvas = typeof OffscreenCanvas !== "undefined" || typeof document !== "undefined";
  const canDecodeImages = typeof createImageBitmap !== "undefined" || typeof Image !== "undefined";

  if (!canCreateCanvas || !canDecodeImages || typeof Blob === "undefined") {
    throw new Error("This library requires browser canvas, Blob, and image decoding APIs.");
  }
}

function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getContext(canvas) {
  const context = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });

  if (!context) {
    throw new Error("Unable to acquire a 2D canvas context.");
  }

  return context;
}

async function decodeImage(bytes) {
  const blob = new Blob([bytes]);

  if (typeof createImageBitmap !== "undefined") {
    return createImageBitmap(blob);
  }

  const objectUrl = URL.createObjectURL(blob);

  try {
    return await decodeImageElement(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function decodeImageElement(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode input image."));
    image.src = objectUrl;
  });
}

function drawPage(context, image, slot) {
  const scale = Math.min(SLOT_WIDTH / image.width, SLOT_HEIGHT / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const centerX = slot.x + SLOT_WIDTH / 2;
  const centerY = slot.y + SLOT_HEIGHT / 2;

  context.save();
  context.translate(centerX, centerY);

  if (slot.rotate) {
    context.rotate(Math.PI);
  }

  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

async function canvasToPngBytes(canvas) {
  let blob;

  if (typeof canvas.convertToBlob === "function") {
    blob = await canvas.convertToBlob({ type: "image/png" });
  } else {
    blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Canvas export failed."));
      }, "image/png");
    });
  }

  return new Uint8Array(await blob.arrayBuffer());
}

// ---- dom / UI layer ----

export class UI {
  constructor() {
    this.fileInputMap = new Map();
  }

  async init() {
    await init();
    this.setupProcessButton();
  }

  readFile(input) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(input);
    });
  }

  setupProcessButton() {
    document.getElementById('processBtn').addEventListener('click', async () => {
      const btn = document.getElementById('processBtn');
      try {
        btn.disabled = true;
        btn.textContent = 'Processing...';
        const files = [];
        const inputs = [...document.querySelectorAll("#fileInputs input")];
        for (let i = 0; i < 8; i++) {
          const input = inputs[i];
          if (!input.files[0]) {
            throw new Error('Missing file for ' + PAGE_NAMES[i]);
          }
          files.push(await this.readFile(input.files[0]));
        }

        const printReadyBytes = await pagesToPrintReady(
          files[0], files[1], files[2], files[3],
          files[4], files[5], files[6], files[7]
        );

        const blob = new Blob([printReadyBytes], { type: 'image/png' });
        const url = URL.createObjectURL(blob);

        const img = document.getElementById('resultImage');
        img.src = url;
        img.style.display = 'block';

        const dl = document.getElementById('downloadLink');
        dl.href = url;
        dl.download = 'print_ready.png';
        dl.style.display = 'inline';

      } catch (error) {
        console.error('Processing failed:', error);
      } finally {
        btn.textContent = 'Done';
      }
    });
  }
}

export const ui = new UI();
ui.init().catch(console.error);
