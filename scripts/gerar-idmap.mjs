// ============================================================
// GERA ID_MAP a partir de uma máscara binária (PNG branco/preto).
// Cada componente conexa (peça) recebe uma cor única, criando um
// id_map compatível com o simulador (detecção de clique por cor).
// Uso: node scripts/gerar-idmap.mjs <mascara.png> <saida.png> [WxH]
// ============================================================
import sharp from 'sharp';

const [, , entrada, saida, dims] = process.argv;
if (!entrada || !saida) {
  console.error('Uso: node scripts/gerar-idmap.mjs <mascara.png> <saida.png> [WxH]');
  process.exit(1);
}
const [W = 1920, H = 1080] = (dims || '').split('x').map(Number);

// Lê a máscara em RGBA cru
const { data } = await sharp(entrada).resize(W, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });

const mask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  mask[i] = data[i * 3] * 0.299 + data[i * 3 + 1] * 0.587 + data[i * 3 + 2] * 0.114 > 100 ? 1 : 0;
}

// Flood fill para achar componentes conexas
const comp = new Int32Array(W * H).fill(-1);
const fila = new Int32Array(W * H);
let compCount = 0;
const paleta = [
  [215, 26, 202], // rosa
  [122, 172, 23], // verde
  [157, 128, 194], // lilás
  [111, 94, 150], // roxo
  [51, 202, 106], // verde-claro
  [235, 172, 92], // laranja
  [69, 116, 193], // azul
  [237, 40, 46], // vermelho
  [198, 225, 87], // amarelo-verde
  [92, 50, 155], // roxo escuro
];

const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  if (mask[i] === 1 && comp[i] === -1) {
    let head = 0,
      tail = 0;
    fila[tail++] = i;
    comp[i] = compCount;
    while (head < tail) {
      const idx = fila[head++];
      const x = idx % W,
        y = (idx / W) | 0;
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
    compCount++;
  }
}

// Pinta cada componente com cor única
for (let i = 0; i < W * H; i++) {
  if (comp[i] >= 0) {
    const c = paleta[comp[i] % paleta.length];
    out[i * 4] = c[0];
    out[i * 4 + 1] = c[1];
    out[i * 4 + 2] = c[2];
    out[i * 4 + 3] = 255;
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(saida);
console.log(`id_map gerado: ${compCount} peças -> ${saida}`);
