// Servidor estático simples (sem dependências) para o simulador.
// Uso: node scripts/servidor.mjs [porta]
import http from 'http';
import { readFile, stat } from 'fs/promises';
import { dirname, extname, join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, '..', 'public');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath === '/') urlPath = '/index.html';
    // remove barra inicial e resolve relativo ao diretório público
    const rel = urlPath.replace(/^[/\\]+/, '');
    const filePath = resolve(PUB, rel);
    if (!filePath.startsWith(resolve(PUB) + sep) && filePath !== resolve(PUB)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const s = await stat(filePath).catch(() => null);
    if (!s || !s.isFile()) {
      res.writeHead(404);
      res.end('404');
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Content-Length': data.length,
    });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end('Erro interno');
  }
});

server.listen(PORT, () => {
  console.log(`Simulador em http://localhost:${PORT}`);
});

// mantém vivo mesmo se o processo pai morrer
process.on('uncaughtException', () => {});
