// ============================================================
// BUILD: gera thumbs/diffuse em webp a partir das texturas JPG
// - Incremental: só re-processa se src for mais novo que dest
// - Thumbs 256 cover, diffuse 1024 preservando proporção
// ============================================================
import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..', 'public', 'assets');
const DIR_TEX = path.join(RAIZ, 'texturas');
const DIR_THUMB = path.join(DIR_TEX, 'thumbs');
const DIR_DIFF = path.join(DIR_TEX, 'diffuse');

await mkdir(DIR_THUMB, { recursive: true });
await mkdir(DIR_DIFF, { recursive: true });

// Carrega catálogo editável (espelho do Berneck) se existir — fonte para nome/categoria/acabamento
let catalogoJSON = null;
const mapaPorArquivo = new Map();
const mapaPorId = new Map();
try {
  const raw = await readFile(path.join(DIR_TEX, 'texturas.json'), 'utf8');
  catalogoJSON = JSON.parse(raw);
  const arr = Array.isArray(catalogoJSON) ? catalogoJSON : catalogoJSON.texturas || [];
  for (const e of arr) {
    const id = e.id || (e.arquivo ? e.arquivo.replace(/\.(jpe?g|png|webp)$/i, '') : '');
    if (!id) continue;
    mapaPorId.set(id, e);
    if (e.arquivo) mapaPorArquivo.set(e.arquivo, e);
  }
  console.log(`Catálogo texturas.json: ${arr.length} entradas`);
} catch {
  console.log('Sem texturas.json — usando apenas arquivos JPG para indexar');
}

const EXT = /\.(jpe?g|png|webp)$/i;
const arquivos = (await readdir(DIR_TEX)).filter(f => EXT.test(f) && !f.startsWith('.'));
const index = [];

async function isNewer(src, dest) {
  try {
    const [s, d] = await Promise.all([stat(src), stat(dest)]);
    return s.mtimeMs > d.mtimeMs;
  } catch {
    return true;
  }
}

console.log(`Gerando thumbnails/diffuse de ${arquivos.length} texturas (incremental)...`);
let gerados = 0,
  reaproveitados = 0;

for (const arq of arquivos) {
  const id = arq.replace(EXT, '');
  const src = path.join(DIR_TEX, arq);
  const thumbDest = path.join(DIR_THUMB, `${id}.webp`);
  const diffDest = path.join(DIR_DIFF, `${id}.webp`);
  const precisaThumb = await isNewer(src, thumbDest);
  const precisaDiff = await isNewer(src, diffDest);

  try {
    if (precisaThumb) {
      await sharp(src).resize(256, 256, { fit: 'cover' }).webp({ quality: 72, effort: 4 }).toFile(thumbDest);
      gerados++;
    } else reaproveitados++;
    if (precisaDiff) {
      // preserva proporção, sem cortar veio
      await sharp(src)
        .resize({ width: 1024, withoutEnlargement: true })
        .webp({ quality: 70, effort: 4 })
        .toFile(diffDest);
      if (!precisaThumb) gerados++;
    }
    // enriquece com dados do texturas.json quando existir
    const meta = mapaPorArquivo.get(arq) || mapaPorId.get(id);
    const nome = meta
      ? meta.acabamento
        ? `${meta.nome} ${meta.acabamento}`
        : meta.nome
      : id.replace(/_/g, ' ');
    const entry = { id, arquivo: arq, nome };
    if (meta) {
      if (meta.categoria) entry.categoria = meta.categoria;
      if (meta.acabamento) entry.acabamento = meta.acabamento;
      if (meta.novo) entry.novo = true;
    }
    index.push(entry);
  } catch (err) {
    console.warn(`  [skip] ${arq}: ${err.message}`);
  }
}

// Avisa sobre texturas declaradas no JSON mas sem arquivo JPG
if (mapaPorId.size) {
  const existentes = new Set(arquivos.map(f => f.replace(EXT, '')));
  for (const [id, e] of mapaPorId) {
    if (!existentes.has(id)) {
      console.warn(
        `  [aviso] ${e.arquivo || id} listado em texturas.json mas JPG não encontrado em public/assets/texturas/`
      );
    }
  }
}

await writeFile(path.join(DIR_TEX, 'index.json'), JSON.stringify(index, null, 2));
console.log(
  `Concluído. ${index.length} texturas indexadas — ${gerados} gerados, ${reaproveitados} reaproveitados.`
);
