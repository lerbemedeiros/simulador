import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise(r => setTimeout(r, 6000));

// injeta geração de máscaras por flood fill a partir dos seeds e pinta cada zona
// com uma cor sólida única, salva composição em um canvas e devolve como dataURL
const composicao = await page.evaluate(async () => {
  const cfg = JSON.parse(localStorage.getItem('__cfg') || 'null');
  const seeds = {
    sup_porta: [900, 180],
    inf_esq: [500, 900],
    inf_centro: [1100, 900],
    inf_dir: [1250, 900],
    inf_fino: [300, 900],
    bancada: [900, 800],
  };
  const cores = {
    sup_porta: '#ff0000',
    inf_esq: '#00ff00',
    inf_centro: '#0000ff',
    inf_dir: '#ffff00',
    inf_fino: '#ff00ff',
    bancada: '#00ffff',
  };
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const ctx = c.getContext('2d');
  const img = new Image();
  const out = await new Promise(resolve => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1920, 1080);
      const d = ctx.getImageData(0, 0, 1920, 1080).data;
      const W = 1920,
        H = 1080;
      const zonas = [
        { id: 'sup_porta', cor: [215, 26, 202], seed: [900, 180] },
        { id: 'inf_esq', cor: [122, 172, 23], seed: [500, 900] },
        { id: 'inf_centro', cor: [157, 128, 194], seed: [1100, 900] },
        { id: 'inf_dir', cor: [111, 94, 150], seed: [1250, 900] },
        { id: 'inf_fino', cor: [51, 202, 106], seed: [300, 900] },
        { id: 'bancada', cor: [228, 216, 199], seed: [850, 760] },
      ];
      const tol = 22;
      const corOut = {
        sup_porta: [255, 0, 0],
        inf_esq: [0, 255, 0],
        inf_centro: [0, 0, 255],
        inf_dir: [255, 255, 0],
        inf_fino: [255, 0, 255],
        bancada: [0, 255, 255],
      };
      for (const z of zonas) {
        const [zr, zg, zb] = z.cor;
        const [sx, sy] = z.seed;
        const visitado = new Uint8Array(W * H);
        const fila = new Int32Array(W * H);
        let head = 0,
          tail = 0;
        const si = sy * W + sx;
        fila[tail++] = si;
        visitado[si] = 1;
        const co = corOut[z.id];
        while (head < tail) {
          const idx = fila[head++];
          const x = idx % W,
            y = (idx / W) | 0;
          const pi = idx * 4;
          if (
            Math.abs(d[pi] - zr) < tol &&
            Math.abs(d[pi + 1] - zg) < tol &&
            Math.abs(d[pi + 2] - zb) < tol
          ) {
            d[pi] = co[0];
            d[pi + 1] = co[1];
            d[pi + 2] = co[2];
            d[pi + 3] = 255;
            if (x > 0) {
              const n = idx - 1;
              if (!visitado[n]) {
                visitado[n] = 1;
                fila[tail++] = n;
              }
            }
            if (x < W - 1) {
              const n = idx + 1;
              if (!visitado[n]) {
                visitado[n] = 1;
                fila[tail++] = n;
              }
            }
            if (y > 0) {
              const n = idx - W;
              if (!visitado[n]) {
                visitado[n] = 1;
                fila[tail++] = n;
              }
            }
            if (y < H - 1) {
              const n = idx + W;
              if (!visitado[n]) {
                visitado[n] = 1;
                fila[tail++] = n;
              }
            }
          }
        }
      }
      ctx.putImageData(new ImageData(d, W, H), 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = '/assets/ambientes/cozinha_01/mascaras/id_map.png';
  });
  return out;
});

// salva
const fs = await import('fs');
fs.writeFileSync(
  'C:/Users/lerbe/AppData/Local/Temp/opencode/mascaras.png',
  Buffer.from(composicao.split(',')[1], 'base64')
);
console.log('salvo mascaras.png');
await browser.close();
