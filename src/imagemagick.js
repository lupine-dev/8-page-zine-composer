import initMagick from "https://cdn.jsdelivr.net/npm/imagemagick-wasm@0.3.0/magick.js";

const MAGICK_WASM_URL = "https://cdn.jsdelivr.net/npm/imagemagick-wasm@0.3.0/magick.wasm";

let magickPromise = null;
let magickModule = null;
let requestCounter = 0;

export function init() {
  if (!magickPromise) {
    magickPromise = initMagick({
      noInitialRun: true,
      locateFile(path) {
        if (path.endsWith(".wasm")) {
          return MAGICK_WASM_URL;
        }
        return path;
      },
    });
  }
  return magickPromise.then((module) => {
    magickModule = module;
    return module;
  });
}

function runMagick(magick, args, commandName) {
  const exitCode = magick.callMain(args);
  if (exitCode !== 0) {
    throw new Error(`ImageMagick command failed (${commandName}) with exit code ${exitCode}`);
  }
}

function safeUnlink(magick, path) {
  try {
    magick.FS.unlink(path);
  } catch (_) {
    // no-op
  }
}

export function pagesToPrintReady(p1, p2, p3, p4, p5, p6, p7, p8) {
  const magick = magickModule;
  if (!magick) {
    throw new Error("ImageMagick is not initialized. Call and await init() first.");
  }

  const id = ++requestCounter;
  const names = {
    p1: `/zine-${id}-p1`,
    p2: `/zine-${id}-p2`,
    p3: `/zine-${id}-p3`,
    p4: `/zine-${id}-p4`,
    p5: `/zine-${id}-p5`,
    p6: `/zine-${id}-p6`,
    p7: `/zine-${id}-p7`,
    p8: `/zine-${id}-p8`,
    top: `/zine-${id}-top.png`,
    bottom: `/zine-${id}-bottom.png`,
    out: `/zine-${id}-out.png`,
  };

  try {
    magick.FS.writeFile(names.p1, p1);
    magick.FS.writeFile(names.p2, p2);
    magick.FS.writeFile(names.p3, p3);
    magick.FS.writeFile(names.p4, p4);
    magick.FS.writeFile(names.p5, p5);
    magick.FS.writeFile(names.p6, p6);
    magick.FS.writeFile(names.p7, p7);
    magick.FS.writeFile(names.p8, p8);

    runMagick(magick, [
      "(",
      names.p1, "-rotate", "180",
      ")",
      "(",
      names.p8, "-rotate", "180",
      ")",
      "(",
      names.p7, "-rotate", "180",
      ")",
      "(",
      names.p6, "-rotate", "180",
      ")",
      "+append",
      names.top,
    ], "top-row-composition");

    runMagick(magick, [
      names.p2,
      names.p3,
      names.p4,
      names.p5,
      "+append",
      names.bottom,
    ], "bottom-row-composition");

    runMagick(magick, [names.top, names.bottom, "-append", names.out], "final-composition");

    return magick.FS.readFile(names.out);
  } finally {
    safeUnlink(magick, names.p1);
    safeUnlink(magick, names.p2);
    safeUnlink(magick, names.p3);
    safeUnlink(magick, names.p4);
    safeUnlink(magick, names.p5);
    safeUnlink(magick, names.p6);
    safeUnlink(magick, names.p7);
    safeUnlink(magick, names.p8);
    safeUnlink(magick, names.top);
    safeUnlink(magick, names.bottom);
    safeUnlink(magick, names.out);
  }
}
