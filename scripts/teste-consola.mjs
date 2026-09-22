import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('[PAGEERROR]', e.message));
p.on('console', m => {
  if (m.type() === 'error') console.log('[CONSOLE]', m.text());
});
await p.setViewport({ width: 1600, height: 900 });
try {
  await p.goto('http://localhost:3000/?nocache=' + Date.now(), { waitUntil: 'networkidle2', timeout: 90000 });
  await p.waitForSelector('canvas', { timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  console.log('canvas ok');
  const r = await p.evaluate(() => {
    const c = window.__comp;
    if (!c) return 'sem __comp';
    const zona = c.env.cfg.zonas.find(z => z.id === 'sup_centro');
    const mask = c._gerarMascara(zona);
    const x = c.ctx;
    x.drawImage(mask, 0, 0, c.W, c.H);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = '#00ff00';
    x.fillRect(0, 0, c.W, c.H);
    x.globalCompositeOperation = 'source-over';
    return 'pintou';
  });
  console.log('resultado:', r);
  await p.screenshot({ path: 'C:/Users/lerbe/AppData/Local/Temp/opencode/mascara_verde.png' });
  console.log('screenshot ok');
} catch (e) {
  console.log('ERRO:', e.message);
}
await b.close();
