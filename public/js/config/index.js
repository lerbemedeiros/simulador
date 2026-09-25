// ============================================================
// config/index.js — barrel profissional (fonte da verdade)
// ============================================================
import {
  BASE_URL,
  CONFIG_VERSION,
  DEFAULT_CHAPA,
  DEFAULT_TEXTURA_REPETICAO,
  defineAmbiente,
} from './defaults.js';
import { GRUPOS, GRUPOS_MAP, labelDoGrupo, isGrupoValido } from './grupos.js';
import { AMBIENTES_RAW } from './ambientes.js';
import { TEXTURAS, META_TEXTURAS, getMetaTextura, ALIASES_LEGADOS } from './texturas.js';
import { validarTodos } from './schema.js';

// Valida em dev/build — falha rápido com mensagem clara
try {
  validarTodos(AMBIENTES_RAW);
} catch (e) {
  // Em produção, loga mas não quebra a renderização (permite fallback)
  if (typeof console !== 'undefined' && console.error) console.error(e.message);
  // Em dev/test, propaga para falhar testes
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    throw e;
  }
}

/** @type {Record<string, import('./schema.js').Ambiente>} */
export const AMBIENTES = Object.freeze({
  ...AMBIENTES_RAW,
  // Alias legado (cozinha_01 -> cozinha) — mantém compat com hash antigo, incluído antes do freeze
  cozinha_01: AMBIENTES_RAW.cozinha,
});

// Derivados — gerados, não editáveis (exclui alias cozinha_01 para não duplicar card)
// `thumb` é a imagem do card no seletor de ambientes (personalizável em assets/.../thumb/thumb.png).
// Se não existir, o seletor faz fallback para `imagem` (base do modelo).
export const AMBIENTES_DISPONIVEIS = Object.freeze(
  Object.fromEntries(
    Object.entries(AMBIENTES_RAW).map(([k, v]) => [
      k,
      Object.freeze({
        id: v.id,
        nome: v.nome,
        icone: v.icone,
        imagem: v.imagem,
        thumb: v.thumb || v.imagem,
        indisponivel: !!v.indisponivel,
      }),
    ])
  )
);

export const AMBIENTE_ATUAL = 'cozinha';

/**
 * Lista apenas ambientes disponíveis (não indisponivel)
 * @returns {Array<{id:string,nome:string,icone:string,imagem:string}>}
 */
export function listarDisponiveis() {
  return Object.values(AMBIENTES_DISPONIVEIS).filter(a => !a.indisponivel);
}

/**
 * Busca ambiente por id com validação
 * @param {string} id
 * @returns {import('./schema.js').Ambiente|null}
 */
export function getAmbiente(id) {
  const amb = AMBIENTES[id];
  if (!amb || amb.indisponivel) return null;
  return amb;
}

/**
 * Resolve ambiente pela URL hash — 100% dinâmico (não precisa editar regex ao adicionar ambiente)
 * Suporta: #env=quarto , #quarto , #c=...&env=quarto
 * @param {string} hash
 * @returns {string}
 */
export function resolverAmbienteAtual(hash = typeof location !== 'undefined' ? location.hash : '') {
  const h = hash || '';
  const mEnv = h.match(/env=([^&]+)/);
  if (mEnv) {
    const cand = mEnv[1];
    if (AMBIENTES[cand] && !AMBIENTES[cand].indisponivel) return cand;
  }
  // hash puro: #quarto ou #cozinha
  const mHash = h.match(/^#([a-z0-9_-]+)\b/i);
  if (mHash) {
    const cand = mHash[1];
    if (AMBIENTES[cand] && !AMBIENTES[cand].indisponivel) return cand;
    // também aceita alias cozinha_01
    if (AMBIENTES[cand]) return cand === 'cozinha_01' ? 'cozinha' : cand;
  }
  return AMBIENTE_ATUAL;
}

// Re-exports profissionais
export {
  BASE_URL,
  CONFIG_VERSION,
  DEFAULT_CHAPA,
  DEFAULT_TEXTURA_REPETICAO,
  defineAmbiente,
  GRUPOS,
  GRUPOS_MAP,
  labelDoGrupo,
  isGrupoValido,
  TEXTURAS,
  META_TEXTURAS,
  getMetaTextura,
  ALIASES_LEGADOS,
};

// AMBIENTES e AMBIENTES_DISPONIVEIS já congelados acima
