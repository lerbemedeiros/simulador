// ============================================================
// grupos.js — categorias Berneck (g1..g6)
// ============================================================

/**
 * @typedef {{key:string,label:string,icon?:string,cor?:string}} Grupo
 */

/** @type {readonly Grupo[]} */
export const GRUPOS = Object.freeze([
  Object.freeze({ key: 'g1', label: 'Amadeirados', icon: 'fa-tree', cor: '#7D3F2A' }),
  Object.freeze({ key: 'g2', label: 'Unicolor', icon: 'fa-palette', cor: '#7A7E84' }),
  Object.freeze({ key: 'g3', label: 'Unicolor Especial', icon: 'fa-gem', cor: '#3D8870' }),
  Object.freeze({ key: 'g4', label: 'Metalizados', icon: 'fa-star', cor: '#7e7e7e' }),
  Object.freeze({ key: 'g5', label: 'Pedras', icon: 'fa-mountain', cor: '#5A7890' }),
  Object.freeze({ key: 'g6', label: 'Tecido', icon: 'fa-scroll', cor: '#8b8358' }),
]);

/** Mapa key -> Grupo para lookup O(1) */
export const GRUPOS_MAP = Object.freeze(Object.fromEntries(GRUPOS.map(g => [g.key, g])));

/**
 * Retorna label do grupo ou string vazia
 * @param {string|null} key
 * @returns {string}
 */
export function labelDoGrupo(key) {
  if (!key) return '';
  return GRUPOS_MAP[key]?.label ?? '';
}

/**
 * Valida se key é g1..g6
 * @param {string} key
 * @returns {boolean}
 */
export function isGrupoValido(key) {
  return /^g[1-6]$/.test(key);
}
