import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 30000 });

// analisa a máscara: conta componentes conexas (ilhas brancas) e bboxes
const analise = await p.evaluate(async () => {
  const img = new Image();
  const out = await new Promise(resolve => {
    img.onload = () => {
      const W = 1920,
        H = 1080;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      const mask = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        const p = i * 4;
        mask[i] = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114 > 100 ? 1 : 0;
      }
      // componentes conexas
      const comp = new Int32Array(W * H).fill(-1);
      const fila = new Int32Array(W * H);
      let compCount = 0;
      const bboxes = [];
      for (let i = 0; i < W * H; i++) {
        if (mask[i] === 1 && comp[i] === -1) {
          let head = 0,
            tail = 0,
            minX = W,
            minY = H,
            maxX = 0,
            maxY = 0,
            count = 0;
          fila[tail++] = i;
          comp[i] = compCount;
          while (head < tail) {
            const idx = fila[head++];
            const x = idx % W,
              y = (idx / W) | 0;
            count++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            const viz = [];
            if (x > 0) viz.push(idx - 1);
            if (x < W - 1) viz.push(idx + 1);
            if (y > 0) viz.push(idx - W);
            if (y < H - 1) viz.push(idx + W);
            for (const n of viz) {
              if (mask[n] === 1 && comp[n] === -1) {
                comp[n] = compCount;
                fila[tail++] = n;
              }
            }
          }
          if (count > 50) bboxes.push({ comp: compCount, minX, minY, maxX, maxY, count });
          compCount++;
        }
      }
      resolve({ compCount, bboxes: bboxes.sort((a, b) => a.count - b.count) });
    };
    img.src = '/assets/ambientes/cozinha_01/mascaras/armarios_superiores.png';
  });
  return out;
});

console.log(JSON.stringify(analise, null, 2));
await b.close();
