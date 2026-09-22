// ============================================================
// LOADER: carrega camadas, id_map e indexa as texturas.
// ============================================================
import {
  BASE_URL,
  AMBIENTES,
  TEXTURAS,
  GRUPOS,
  META_TEXTURAS,
  getMetaTextura,
  labelDoGrupo,
  getAmbiente,
} from './config.js';

// Catálogo de texturas da pasta assets/texturas
export const CATALOGO = {};

// Detecta o "acabamento" pelo sufixo do nome do arquivo.
export function acabamentoDoSufixo(nome) {
  const s = nome.split('_').pop().toLowerCase();
  const mapa = {
    alumi: 'Alumi',
    design: 'Design',
    grann: 'Grann',
    lsf: 'LSF',
    micro: 'Micro',
    poro: 'Poro',
    rust: 'Rust',
    tatto: 'Tatto',
    tx: 'TX',
    vel: 'Vel',
  };
  return mapa[s] || '';
}

// Resolve o grupo (categoria) e o acabamento de uma textura:
// usa o mapa Berneck (com suporte a aliases legados) quando existe, senão deriva do sufixo.
function metaDe(id) {
  const m = (typeof getMetaTextura === 'function' ? getMetaTextura(id) : null) || META_TEXTURAS[id];
  if (m) return { ...m };
  const ac = acabamentoDoSufixo(id);
  if (!ac) return { grupo: null, acabamento: '' };
  const grupo = ['Tatto', 'Grann', 'Design', 'Poro', 'Micro'].includes(ac)
    ? 'g1'
    : ac === 'Rust'
      ? 'g3'
      : ac === 'Alumi'
        ? 'g4'
        : 'g2';
  return { grupo, acabamento: ac };
}

function rotuloGrupo(grupo) {
  if (!grupo) return '';
  // usa helper profissional quando disponível
  if (typeof labelDoGrupo === 'function') return labelDoGrupo(grupo);
  const g = GRUPOS.find(x => x.key === grupo);
  return g ? g.label : '';
}

// Garante que todos os arquivos de imagem carreguem antes de iniciar.
// Com timeout: sem ele, uma imagem pendurada deixava a Promise pendente
// para sempre e travava as trocas seguintes (o UI aguarda o load).
export function loadImage(src, { decodeAsync = true, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timer = null;
    const limpar = () => {
      if (timer) clearTimeout(timer);
    };
    if (decodeAsync && 'decoding' in img) img.decoding = 'async';
    img.onload = () => {
      limpar();
      resolve(img);
    };
    img.onerror = () => {
      limpar();
      reject(new Error(`Falha ao carregar: ${src}`));
    };
    if (timeout > 0) {
      timer = setTimeout(() => {
        img.src = '';
        reject(new Error(`Timeout ao carregar: ${src}`));
      }, timeout);
    }
    img.src = src;
  });
}

// Detecta o "estilo" da textura pelo sufixo do nome
export function detectarCategoria(nome) {
  const n = nome.toLowerCase();
  if (n.includes('grann')) return 'Madeira';
  if (n.includes('tatto')) return 'Madeira';
  if (n.includes('micro')) return 'Microcimento';
  if (n.includes('vel')) return 'Veludo';
  if (n.includes('poro')) return 'Porcelanato';
  if (n.includes('alumi')) return 'Alumínio';
  if (n.includes('design')) return 'Design';
  if (n.includes('tx')) return 'TX';
  if (n.includes('_lsf') || n.includes('lsf')) return 'LSF';
  return 'Outros';
}

// Lista todos os arquivos de textura — fonte primária: texturas.json (espelho editável de texturas.js do Berneck)
// Fallback: index.json (build) ou TEXTURAS do config.
export async function carregarCatalogo() {
  let lista = [];
  const metaPorArquivo = new Map();

  // 1) Carrega texturas.json como fonte de metadados (editável, igual ao site Berneck)
  try {
    const r = await fetch(`${BASE_URL}texturas/texturas.json`);
    if (r.ok) {
      const j = await r.json();
      const arr = Array.isArray(j) ? j : j.texturas || [];
      for (const e of arr) {
        const id = e.id || (e.arquivo ? e.arquivo.replace(/\.(jpe?g|png|webp)$/i, '') : '');
        if (!id) continue;
        metaPorArquivo.set(id, e);
      }
    }
  } catch (_) {
    /* sem texturas.json */
  }

  // 2) Lista vem do index.json (só arquivos que realmente existem) — evita "undefined" e thumbs quebrados
  try {
    const r = await fetch(`${BASE_URL}texturas/index.json`);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && j.length) lista = j;
    }
  } catch (_) {
    /* sem index */
  }

  // 3) Fallback: se não há index (dev sem build), usa texturas.json como lista
  if (!lista.length && metaPorArquivo.size) {
    lista = [...metaPorArquivo.values()].map(e => ({
      id: e.id || (e.arquivo ? e.arquivo.replace(/\.(jpe?g|png|webp)$/i, '') : ''),
      nome: e.nome ? (e.acabamento ? `${e.nome} ${e.acabamento}` : e.nome) : e.id || '',
      arquivo: e.arquivo,
      acabamento: e.acabamento,
      grupo: e.categoria,
      novo: !!e.novo,
    }));
  }

  if (!lista.length) {
    // Fallback final: extrai da lista de TEXTURAS do config
    lista = Object.entries(TEXTURAS).map(([id, t]) => ({ id, arquivo: t.arquivo, nome: t.nome }));
  }

  for (const item of lista) {
    const id = item.id || item.arquivo.replace(/\.(jpe?g|png|webp)$/i, '');
    const metaArquivo = metaPorArquivo.get(id);
    const nomeBase = item.nome || id.replace(/_/g, ' ');
    const arquivo = item.arquivo || `${id}.jpg`;
    const meta = metaDe(id);
    // grupo vem de texturas.json (categoria=g1..g6) ou do index/meta
    const grupoRaw =
      (metaArquivo && (metaArquivo.grupo || metaArquivo.categoria)) || item.grupo || item.categoria;
    const grupo = typeof grupoRaw === 'string' && /^g[1-6]$/.test(grupoRaw) ? grupoRaw : meta.grupo;
    const cat = rotuloGrupo(grupo) || detectarCategoria(id);
    const acab = item.acabamento || (metaArquivo && metaArquivo.acabamento) || meta.acabamento;
    CATALOGO[id] = {
      id,
      nome: nomeBase,
      nomeBase: metaArquivo ? metaArquivo.nome || nomeBase.replace(/\s+\S+$/, '') : nomeBase,
      arquivo,
      categoria: cat,
      grupo,
      acabamento: acab,
      novo: !!(item.novo || (metaArquivo && metaArquivo.novo)),
      thumb: `${BASE_URL}texturas/thumbs/${id}.webp`,
      diffuse: `${BASE_URL}texturas/diffuse/${id}.webp`,
      src: `${BASE_URL}texturas/${arquivo}`,
    };
  }
  return CATALOGO;
}

// Carga compartilhada com dedup: chamadas simultâneas p/ a mesma
// textura reutilizam a mesma Promise (evita baixar o JPG de 35MB duas
// vezes) e FALHA TRANSITÓRIA NÃO É PERMANENTE: quem chama pode tentar
// de novo depois (antes, um erro no preload marcava `_erro` e a textura
// só voltava com refresh na página).
export function carregarImagemTextura(t) {
  if (t._img) return Promise.resolve(t._img);
  if (t._loading) return t._loading;
  const candidatos = [t.diffuse, t.src].filter(Boolean);
  t._loading = (async () => {
    for (const url of candidatos) {
      try {
        const img = await loadImage(url);
        // textura pronta p/ tiling; evita re-decode a cada troca
        if (img.decode) {
          try {
            await img.decode();
          } catch (_) {}
        }
        t._img = img;
        t._erro = false;
        return img;
      } catch (_) {
        /* tenta próximo candidato */
      }
    }
    t._erro = Date.now();
    throw new Error(`Falha ao carregar textura: ${t.id}`);
  })();
  // limpa o marcador ao assentar (este .then também conta como
  // tratamento, evitando rejection não-tratada)
  t._loading.then(
    () => {
      t._loading = null;
    },
    () => {
      t._loading = null;
    }
  );
  return t._loading;
}
// (webp ~50-200KB) em vez do JPG original (até 35MB).
// Prioriza texturas majoritárias e usa requestIdleCallback quando disponível.
function batchAdaptativo(fallback = 6) {
  try {
    const cores = navigator.hardwareConcurrency || 4;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const save = conn && conn.saveData;
    const eff = conn && conn.effectiveType; // 'slow-2g','2g','3g','4g'
    if (save || eff === 'slow-2g' || eff === '2g') return 2;
    if (eff === '3g') return 3;
    if (cores <= 2) return 3;
    if (cores >= 8) return 8;
    return fallback;
  } catch (_) {
    return fallback;
  }
}
export async function preloadTexturas(cat, { batch, onProgress, priorizadas = [] } = {}) {
  const b = batch ?? batchAdaptativo(6);
  const todos = Object.values(cat);
  // ordena: priorizadas primeiro
  const prioSet = new Set(priorizadas);
  const itens = [...todos.filter(t => prioSet.has(t.id)), ...todos.filter(t => !prioSet.has(t.id))];
  let done = 0;
  const carregarUma = async t => {
    if (t._img) return;
    try {
      await carregarImagemTextura(t);
    } catch (_) {
      /* marca _erro; o toque do usuário tenta de novo */
    }
  };
  const idleYield = () =>
    new Promise(r => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => r(), { timeout: 200 });
      else setTimeout(r, 0);
    });
  for (let i = 0; i < itens.length; i += b) {
    await Promise.all(itens.slice(i, i + b).map(carregarUma));
    done = Math.min(itens.length, i + b);
    if (onProgress) onProgress(done, itens.length);
    await idleYield();
  }
}

// Garante UMA textura sob demanda (troca instantânea mesmo se o
// preload ainda não chegou nela). Falha transitória não envenena:
// retorna null e o próximo toque tenta de novo. Usado pelo Compositor/main.
export async function ensureTextura(cat, texId) {
  const t = cat[texId];
  if (!t || t._img) return t ? t._img : null;
  try {
    return await carregarImagemTextura(t);
  } catch (_) {
    return null;
  }
}

// Prepara as camadas de um ambiente (base, sombras, reflexos, idMap)
export async function carregarAmbiente(ambId) {
  const cfg = (typeof getAmbiente === 'function' ? getAmbiente(ambId) : null) || AMBIENTES[ambId];
  // getAmbiente já filtra indisponivel; fallback mantém mensagens legadas
  if (!cfg) {
    const raw = AMBIENTES[ambId];
    if (!raw) throw new Error(`Ambiente não encontrado: ${ambId}`);
    if (raw.indisponivel) throw new Error(`Ambiente "${ambId}" em breve`);
    throw new Error(`Ambiente não encontrado: ${ambId}`);
  }
  if (!cfg.camadas || !cfg.idMap) throw new Error(`Ambiente "${ambId}" ainda sem renders (indisponível)`);

  const [base, sombras, reflexos, idMap] = await Promise.all([
    loadImage(`${BASE_URL}${cfg.camadas.base}`),
    loadImage(`${BASE_URL}${cfg.camadas.sombras}`),
    loadImage(`${BASE_URL}${cfg.camadas.reflexos}`),
    loadImage(`${BASE_URL}${cfg.idMap}`),
  ]);

  // Carrega as máscaras (arquivos PNG) referenciadas pelas zonas
  const caminhos = [...new Set(cfg.zonas.filter(z => z.mascara).map(z => z.mascara))];
  const mascaras = {};
  await Promise.all(
    caminhos.map(async p => {
      mascaras[p] = await loadImage(`${BASE_URL}${p}`);
    })
  );

  return {
    cfg,
    base,
    sombras,
    reflexos,
    idMap,
    mascaras,
    pronto: null,
  };
}

// ============================================================
// PRELOADER CASA REUTILIZÁVEL — para qualquer atividade que
// dependa de imagens (ex.: trocar ambiente, galeria, export).
// Usa o mesmo overlay #loading com casa líquida.
// ============================================================
function _elsCasa() {
  return {
    root: document.querySelector('#preloader') || document.querySelector('#loading'),
    fill: document.querySelector('#houseFillRect'),
    wave: document.querySelector('#houseWaveGroup'),
    pct: document.querySelector('#housePercent'),
    bar: document.querySelector('#loadBar'),
    msg: document.querySelector('#loadMsg'),
    sub: document.querySelector('#loadSub'),
  };
}
export function mostrarPreloaderCasa({ mensagem = 'Carregando…', sub = 'Preparando imagens', pct = 0 } = {}) {
  const { root, msg, sub: subEl } = _elsCasa();
  if (!root) return;
  root.classList.remove('done', 'erro');
  root.setAttribute('aria-busy', 'true');
  root.style.display = 'flex';
  if (msg) msg.textContent = mensagem;
  if (subEl) subEl.textContent = sub;
  atualizarPreloaderCasa(pct, mensagem, sub);
}
export function atualizarPreloaderCasa(pct, mensagem, sub) {
  const { fill, wave, pct: pctEl, bar, msg, sub: subEl } = _elsCasa();
  const v = Math.max(0, Math.min(1, pct ?? 0));
  const n = Math.round(v * 100);
  if (bar) bar.style.width = `${n}%`;
  if (fill) {
    const h = 110 * v;
    fill.setAttribute('y', String(110 - h));
    fill.setAttribute('height', String(h));
  }
  if (wave) wave.setAttribute('transform', `translate(0,${110 - 110 * v})`);
  if (pctEl) {
    pctEl.textContent = `${n}%`;
    pctEl.classList.toggle('pct-dark', v < 0.32);
  }
  if (mensagem && msg) msg.textContent = mensagem;
  if (sub && subEl) subEl.textContent = sub;
}
export function esconderPreloaderCasa({ delay = 420 } = {}) {
  const { root } = _elsCasa();
  if (!root) return Promise.resolve();
  return new Promise(r =>
    setTimeout(() => {
      root.classList.add('done');
      root.setAttribute('aria-busy', 'false');
      r();
    }, delay)
  );
}
/**
 * Preload genérico de lista de URLs com casa — eficiente, com
 * concorrência adaptativa, retry e progresso na casa.
 * @param {string[]} urls
 * @param {{batch?:number, mensagem?:string, sub?:string, onProgress?:(done,total)=>void}} opts
 */
export async function preloadListaComCasa(
  urls,
  { batch, mensagem = 'Carregando imagens…', sub = '', onProgress } = {}
) {
  const lista = [...new Set(urls.filter(Boolean))];
  if (!lista.length) return [];
  const b = batch ?? batchAdaptativo(6);
  mostrarPreloaderCasa({ mensagem, sub, pct: 0 });
  let done = 0;
  const total = lista.length;
  const idleYield = () =>
    new Promise(r => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => r(), { timeout: 180 });
      else setTimeout(r, 0);
    });
  for (let i = 0; i < lista.length; i += b) {
    const chunk = lista.slice(i, i + b);
    await Promise.all(
      chunk.map(async url => {
        // retry 1x com backoff curto
        try {
          await loadImage(url);
        } catch (_) {
          await new Promise(r => setTimeout(r, 220));
          try {
            await loadImage(url);
          } catch (_) {}
        }
      })
    );
    done = Math.min(total, i + chunk.length);
    const pct = done / total;
    atualizarPreloaderCasa(pct, mensagem, sub || `${done}/${total}`);
    if (onProgress) onProgress(done, total);
    await idleYield();
  }
  await esconderPreloaderCasa({ delay: 380 });
  return lista;
}
