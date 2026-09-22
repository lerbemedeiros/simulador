// ============================================================
// defaults.js — valores padrão centralizados (DRY)
// ============================================================

/**
 * @typedef {{w:number,h:number}} Chapa
 * @typedef {number} TexturaRepeticao
 */

/** Versão do schema de config — incremente ao mudar estrutura */
export const CONFIG_VERSION = 2;

/** Dimensões padrão de cena (Full HD) */
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;

/** Chapa real 1850x2750mm (padrão Berneck) */
export const DEFAULT_CHAPA = Object.freeze({ w: 1850, h: 2750 });

/** Repetição real da textura em mm (1 tile = 4064mm, mas 1000 para tiling premium quarto) */
export const DEFAULT_TEXTURA_REPETICAO = 1000;

/** Base URL resolvida: usa Vite BASE_URL quando disponível, senão ./assets/ */
export const BASE_URL = (() => {
  try {
    // Vite injeta import.meta.env.BASE_URL em build
    const envBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL;
    if (envBase && typeof envBase === 'string' && envBase !== './' && envBase !== '/') {
      // normaliza para terminar com assets/ se necessário
      return envBase.endsWith('/') ? envBase + 'assets/' : envBase + '/assets/';
    }
  } catch (_) {}
  return './assets/';
})();

/**
 * Factory profissional para ambientes — aplica defaults, congela e valida shape básico.
 * Garante que `chapa` e `texturaRepeticao` nunca dessincronizem entre ambientes.
 * @template T
 * @param {T} cfg
 * @returns {T}
 */
export function defineAmbiente(cfg) {
  const normalized = {
    width: cfg.width ?? DEFAULT_WIDTH,
    height: cfg.height ?? DEFAULT_HEIGHT,
    chapa: cfg.chapa ?? { ...DEFAULT_CHAPA },
    texturaRepeticao: cfg.texturaRepeticao ?? DEFAULT_TEXTURA_REPETICAO,
    ...cfg,
  };
  // garante cópia defensiva de chapa
  if (normalized.chapa && typeof normalized.chapa === 'object') {
    normalized.chapa = Object.freeze({ ...normalized.chapa });
  }
  return normalized;
}

/**
 * Congela profundamente um objeto (1 nível + arrays internos)
 * @param {object} obj
 * @returns {object}
 */
export function deepFreeze(obj) {
  Object.freeze(obj);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      // congela arrays e sub-objetos rasos
      if (Array.isArray(v)) Object.freeze(v);
      else if (v.constructor === Object) Object.freeze(v);
    }
  }
  return obj;
}
