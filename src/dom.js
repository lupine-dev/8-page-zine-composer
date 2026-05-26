import init, { pages_to_print_ready } from './index.js';

const PAGE_NAMES = [
  'Front Cover',
  'Page 1',
  'Page 2',
  'Page 3',
  'Page 4',
  'Page 5',
  'Page 6',
  'Back Cover',
];

export class UI {
  constructor() {
    this.fileInputMap = new Map();
  }

  async init() {
    await init();
    this.createFileInputs();
    this.setupProcessButton();
  }

  createFileInputs() {
    const container = document.getElementById('fileInputs');
    PAGE_NAMES.forEach((name, i) => {
      const row = document.createElement('div');
      row.textContent = name + ': ';

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.id = 'page' + i;
      row.appendChild(input);

      container.appendChild(row);
      container.appendChild(document.createElement('br'));
    });
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
      try {
        const files = [];
        for (let i = 0; i < 8; i++) {
          const input = document.getElementById('page' + i);
          if (!input.files[0]) {
            throw new Error('Missing file for ' + PAGE_NAMES[i]);
          }
          files.push(await this.readFile(input.files[0]));
        }

        const printReadyBytes = await pages_to_print_ready(
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
      }
    });
  }
}

export const ui = new UI();
ui.init().catch(console.error);
