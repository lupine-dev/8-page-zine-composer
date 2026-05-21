const OUTPUT_DPI = 300;
const SHEET_WIDTH_INCHES = 11;
const SHEET_HEIGHT_INCHES = 8.5;
const OUTPUT_WIDTH = SHEET_WIDTH_INCHES * OUTPUT_DPI;
const OUTPUT_HEIGHT = SHEET_HEIGHT_INCHES * OUTPUT_DPI;
const COLUMN_COUNT = 4;
const ROW_COUNT = 2;
const SLOT_WIDTH = OUTPUT_WIDTH / COLUMN_COUNT;
const SLOT_HEIGHT = OUTPUT_HEIGHT / ROW_COUNT;
const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const PNG_PIXELS_PER_METER = Math.round(OUTPUT_DPI / 0.0254);
const PNG_ENCODER = new TextEncoder();
const CRC32_TABLE = createCrc32Table();

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

export async function init() {
  ensureBrowserSupport();
}

export async function pagesToPrintReady(p1, p2, p3, p4, p5, p6, p7, p8) {
  ensureBrowserSupport();

  const pages = [p1, p8, p7, p6, p2, p3, p4, p5];
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

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return setPngResolution(bytes, PNG_PIXELS_PER_METER);
}

function setPngResolution(pngBytes, pixelsPerMeter) {
  if (!hasPngSignature(pngBytes)) {
    return pngBytes;
  }

  const physChunk = createPhysChunk(pixelsPerMeter);
  const chunks = [pngBytes.subarray(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  let insertedPhys = false;

  while (offset + 12 <= pngBytes.length) {
    const length = readUint32(pngBytes, offset);
    const chunkEnd = offset + 12 + length;

    if (chunkEnd > pngBytes.length) {
      return pngBytes;
    }

    const typeOffset = offset + 4;
    const type = readChunkType(pngBytes, typeOffset);
    const chunk = pngBytes.subarray(offset, chunkEnd);

    if (type === "pHYs") {
      if (!insertedPhys) {
        chunks.push(physChunk);
        insertedPhys = true;
      }
    } else {
      chunks.push(chunk);

      if (type === "IHDR" && !insertedPhys) {
        chunks.push(physChunk);
        insertedPhys = true;
      }
    }

    offset = chunkEnd;
  }

  if (!insertedPhys) {
    return pngBytes;
  }

  return concatBytes(chunks);
}

function hasPngSignature(bytes) {
  if (bytes.length < PNG_SIGNATURE.length) {
    return false;
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      return false;
    }
  }

  return true;
}

function createPhysChunk(pixelsPerMeter) {
  const data = new Uint8Array(9);
  writeUint32(data, 0, pixelsPerMeter);
  writeUint32(data, 4, pixelsPerMeter);
  data[8] = 1;
  return createChunk("pHYs", data);
}

function createChunk(type, data) {
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(PNG_ENCODER.encode(type), 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

function readChunkType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

function readUint32(bytes, offset) {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  ) >>> 0;
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((value & 1) === 1) {
        value = 0xedb88320 ^ (value >>> 1);
      } else {
        value >>>= 1;
      }
    }

    table[index] = value >>> 0;
  }

  return table;
}

function concatBytes(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    combined.set(chunk, offset);
    offset += chunk.length;
  });

  return combined;
}
