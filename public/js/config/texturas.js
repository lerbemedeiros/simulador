// ============================================================
// texturas.js — fallback offline e mapa de texturas
// Fonte primária: public/assets/texturas/texturas.json
// Este arquivo é auto-gerado a partir de texturas.json via build:texturas
// ============================================================

/**
 * @typedef {{grupo:string,acabamento:string}} MetaTextura
 */

// DEPRECATED — mantido para compatibilidade com loader legado
export const TEXTURAS = Object.freeze({});

/**
 * META_TEXTURAS corrigido: chaves são IDs de arquivo (sem extensão),
 * ex: 'Branco_Micro', 'Azul_TX', 'Cinza-Cobalto_Vel'.
 * Antes usava 'Branco' repetido 5x (colisão de chave) e 'Cinza Cobalto' sem sufixo.
 * Agora cada variante tem entrada única e determinística.
 * Gerado a partir de public/assets/texturas/texturas.json (categoria + acabamento).
 * @type {Record<string, MetaTextura>}
 */
export const META_TEXTURAS = Object.freeze({
  // g1 — Amadeirados
  Amantea_Tatto: { grupo: 'g1', acabamento: 'Tatto' },
  Barrique_Tatto: { grupo: 'g1', acabamento: 'Tatto' },
  Baru_Micro: { grupo: 'g1', acabamento: 'Micro' },
  Cacau_Grann: { grupo: 'g1', acabamento: 'Grann' },
  'Carvalho-Japandi_Micro': { grupo: 'g1', acabamento: 'Micro' },
  'Carvalho-Treviso_Design': { grupo: 'g1', acabamento: 'Design' },
  Castaine_Tatto: { grupo: 'g1', acabamento: 'Tatto' },
  Cerejeira_Clara_Grann: { grupo: 'g1', acabamento: 'Grann' },
  Cerejeira_Natural_Grann: { grupo: 'g1', acabamento: 'Grann' },
  Cinamomo_Grann: { grupo: 'g1', acabamento: 'Grann' },
  'Frassino-Almendra_Poro': { grupo: 'g1', acabamento: 'Poro' },
  Freijo_Nativo_Grann: { grupo: 'g1', acabamento: 'Grann' },
  Galiano_Grann: { grupo: 'g1', acabamento: 'Grann' },
  Gengibre_Tatto: { grupo: 'g1', acabamento: 'Tatto' },
  'Italian-Noce_Poro': { grupo: 'g1', acabamento: 'Poro' },
  Jequitiba_Grann: { grupo: 'g1', acabamento: 'Grann' },
  'Louro-Freij_Grann': { grupo: 'g1', acabamento: 'Grann' },
  'Louro-Preto_Grann': { grupo: 'g1', acabamento: 'Grann' },
  Mogno_Imperial: { grupo: 'g1', acabamento: 'Grann' },
  'Nogal-Artezzano_Grann': { grupo: 'g1', acabamento: 'Grann' },
  'Nogal-Malaga_Design': { grupo: 'g1', acabamento: 'Design' },
  'Nogal-Sevilha_Poro': { grupo: 'g1', acabamento: 'Poro' },
  Peroba_Tatto: { grupo: 'g1', acabamento: 'Tatto' },
  Provence_Tatto: { grupo: 'g1', acabamento: 'Tatto' },
  'Roble-Catedral_Grann': { grupo: 'g1', acabamento: 'Grann' },
  Solanum_Grann: { grupo: 'g1', acabamento: 'Grann' },
  Chiaro_Vel: { grupo: 'g1', acabamento: 'Vel' },
  Veneer_Grann: { grupo: 'g1', acabamento: 'Grann' },
  Griseo_Grann: { grupo: 'g1', acabamento: 'Grann' },
  // g2 — Unicolor
  Azul_TX: { grupo: 'g2', acabamento: 'TX' },
  Bege_TX: { grupo: 'g2', acabamento: 'TX' },
  Branco_Design: { grupo: 'g2', acabamento: 'Design' },
  Branco_Micro: { grupo: 'g2', acabamento: 'Micro' },
  Branco_Vel: { grupo: 'g2', acabamento: 'Vel' },
  Branco_Lsf: { grupo: 'g2', acabamento: 'LSF' },
  Desert_Vel: { grupo: 'g2', acabamento: 'Vel' },
  Pecan_Vel: { grupo: 'g2', acabamento: 'Vel' },
  // g3 — Unicolor Especial
  Azul_Vel: { grupo: 'g3', acabamento: 'Vel' },
  Chumbo_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Tangar_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Azul_Galeno: { grupo: 'g3', acabamento: 'Micro' },
  Ceramik_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Falsia_Vel: { grupo: 'g3', acabamento: 'Vel' },
  Millennial_Micro: { grupo: 'g3', acabamento: 'Micro' },
  pera_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Preto_TX: { grupo: 'g3', acabamento: 'TX' },
  superwhite: { grupo: 'g3', acabamento: 'Micro' },
  Verti_Micro: { grupo: 'g3', acabamento: 'Micro' },
  // g4 — Metalizados
  Cromio_Vel: { grupo: 'g4', acabamento: 'Vel' },
  Dust_Alumi: { grupo: 'g4', acabamento: 'Alumi' },
  Plomo_Alumi: { grupo: 'g4', acabamento: 'Alumi' },
  Argento_Rust: { grupo: 'g4', acabamento: 'Rust' },
  // g5 — Pedras
  Volakas_Micro: { grupo: 'g5', acabamento: 'Micro' },
  Basalto_Rust: { grupo: 'g5', acabamento: 'Rust' },
});

// Aliases legados (nomes sem sufixo / antigos) — mantidos apenas para compatibilidade
// com hashes antigos ou código que ainda use nome base sem acabamento.
// Eles apontam para a variante mais comum do nome.
const ALIASES_LEGADOS = Object.freeze({
  Amantea: 'Amantea_Tatto',
  Barrique: 'Barrique_Tatto',
  Baru: 'Baru_Micro',
  Cacau: 'Cacau_Grann',
  'Cerejeira Clara': 'Cerejeira_Clara_Grann',
  'Cerejeira Natural': 'Cerejeira_Natural_Grann',
  Cinamomo: 'Cinamomo_Grann',
  'Freijo Nativo': 'Freijo_Nativo_Grann',
  Freijo_Nativo: 'Freijo_Nativo_Grann',
  Galiano: 'Galiano_Grann',
  Gengibre: 'Gengibre_Tatto',
  Jequitiba: 'Jequitiba_Grann',
  'Jequitibá Brasil': 'Jequitiba_Grann',
  'Louro Freijó': 'Louro-Freij_Grann',
  'Louro Preto': 'Louro-Preto_Grann',
  'Nogal Artezzano': 'Nogal-Artezzano_Grann',
  'Nogal Málaga': 'Nogal-Malaga_Design',
  'Nogal Malaga': 'Nogal-Malaga_Design',
  'Nogal Sevilha': 'Nogal-Sevilha_Poro',
  Peroba: 'Peroba_Tatto',
  Provence: 'Provence_Tatto',
  'Roble Catedral': 'Roble-Catedral_Grann',
  Solanum: 'Solanum_Grann',
  Chiaro: 'Chiaro_Vel',
  Veneer: 'Veneer_Grann',
  Griseo: 'Griseo_Grann',
  Azul: 'Azul_TX',
  Bege: 'Bege_TX',
  Branco: 'Branco_Micro',
  Desert: 'Desert_Vel',
  Pecan: 'Pecan_Vel',
  Chumbo: 'Chumbo_Micro',
  Tangará: 'Tangar_Micro',
  Ceramik: 'Ceramik_Micro',
  Falésia: 'Falsia_Vel',
  Falsia: 'Falsia_Vel',
  Millennial: 'Millennial_Micro',
  Ópera: 'pera_Micro',
  Preto: 'Preto_TX',
  superwhite: 'superwhite',
  Verti: 'Verti_Micro',
  Cromio: 'Cromio_Vel',
  Dust: 'Dust_Alumi',
  Plomo: 'Plomo_Alumi',
  Argento: 'Argento_Rust',
  Volakas: 'Volakas_Micro',
  Basalto: 'Basalto_Rust',
  Faia: 'Jequitiba_Grann',
  Parquet: 'Jequitiba_Grann',
});

/**
 * Resolve meta de uma textura por id, com fallback para alias legado
 * @param {string} id - ex: 'Branco_Micro' ou 'Branco' (legado)
 * @returns {MetaTextura|null}
 */
export function getMetaTextura(id) {
  if (!id) return null;
  if (META_TEXTURAS[id]) return META_TEXTURAS[id];
  const alias = ALIASES_LEGADOS[id];
  if (alias && META_TEXTURAS[alias]) return META_TEXTURAS[alias];
  return null;
}

export { ALIASES_LEGADOS };
