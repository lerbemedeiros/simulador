import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 90000 });
await new Promise(r => setTimeout(r, 6000));

// Mapeia cada zona pelo id_map e extrai bbox CONTÍNUA (flood fill) para evitar
// que a tolerância pegue ilhas de outras peças.
const zonas = await page.evaluate(async () => {
  const cfg = window.__ambiente; // exposto no main para diagnóstico
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const ctx = c.getContext('2d');
  // id_map já está no DOM? não. Recarregamos do asset
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1920, 1080);
      const d = ctx.getImageData(0, 0, 1920, 1080).data;
      const zonas = cfg.zonas;
      const out = {};
      for (const z of zonas) {
        const [zr, zg, zb] = z.cor;
        // flood fill a partir do centroide aproximado (bbox centro)
        // Primeiro acha todos pixels dentro de tol pequena
        const pts = [];
        const tol = 24;
        for (let y = 0; y < 1080; y += 2) {
          for (let x = 0; x < 1920; x += 2) {
            const i = (y * 1920 + x) * 4;
            if (Math.abs(d[i] - zr) < tol && Math.abs(d[i + 1] - zg) < tol && Math.abs(d[i + 2] - zb) < tol) {
              pts.push([x, y]);
            }
          }
        }
        // maior componente conexa via união (simplificado: filtra outliers pela mediana)
        if (pts.length) {
          const xs = pts.map(p => p[0]).sort((a, b) => a - b);
          const ys = pts.map(p => p[1]).sort((a, b) => a - b);
          const medX = xs[Math.floor(xs.length / 2)];
          const medY = ys[Math.floor(ys.length / 2)];
          out[z.id] = { medX, medY, count: pts.length };
        }
      }
      res(out);
    };
    img.src = '/assets/ambientes/cozinha_01/mascaras/id_map.png';
  });
});

console.log(JSON.stringify(zonas, null, 2));
await browser.close();
