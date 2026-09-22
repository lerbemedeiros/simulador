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
  'Louro-Freijó_Grann': { grupo: 'g1', acabamento: 'Grann' },
  'Louro-Preto_Grann': { grupo: 'g1', acabamento: 'Grann' },
  Mogno_Imperial: { grupo: 'g1', acabamento: 'Grann' },
  'Nogal-Artezzano_Grann': { grupo: 'g1', acabamento: 'Grann' },
  'Nogal-Málaga_Design': { grupo: 'g1', acabamento: 'Design' },
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
  Branco_TX: { grupo: 'g2', acabamento: 'TX' },
  Branco_Lsf: { grupo: 'g2', acabamento: 'LSF' },
  'Cinza-Argila_TX': { grupo: 'g2', acabamento: 'TX' },
  'Cinza-Cobalto_TX': { grupo: 'g2', acabamento: 'TX' },
  'Cinza-Cristal_TX': { grupo: 'g2', acabamento: 'TX' },
  Desert_Vel: { grupo: 'g2', acabamento: 'Vel' },
  Gelo_Vel: { grupo: 'g2', acabamento: 'Vel' },
  Pecan_Vel: { grupo: 'g2', acabamento: 'Vel' },
  // g3 — Unicolor Especial
  Azul_Vel: { grupo: 'g3', acabamento: 'Vel' },
  Latte_Micro: { grupo: 'g3', acabamento: 'Micro' },
  'Cinza-Cobalto_Vel': { grupo: 'g3', acabamento: 'Vel' },
  Chumbo_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Tangará_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Azul_Galeno: { grupo: 'g3', acabamento: 'Micro' },
  Ceramik_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Falésia_Vel: { grupo: 'g3', acabamento: 'Vel' },
  Nero_Rust: { grupo: 'g3', acabamento: 'Rust' },
  Nude_Vel: { grupo: 'g3', acabamento: 'Vel' },
  Millennial_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Ópera_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Preto_TX: { grupo: 'g3', acabamento: 'TX' },
  superwhite: { grupo: 'g3', acabamento: 'Micro' },
  Tabasco_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Taupe_Micro: { grupo: 'g3', acabamento: 'Micro' },
  Verti_Micro: { grupo: 'g3', acabamento: 'Micro' },
  // g4 — Metalizados
  Cromio_Vel: { grupo: 'g4', acabamento: 'Vel' },
  'Metallic-Suede_TX': { grupo: 'g4', acabamento: 'Tx' },
  Dust_Alumi: { grupo: 'g4', acabamento: 'Alumi' },
  Gold_Alumi: { grupo: 'g4', acabamento: 'Alumi' },
  Plomo_Alumi: { grupo: 'g4', acabamento: 'Alumi' },
  Argento_Rust: { grupo: 'g4', acabamento: 'Rust' },
  Ruggine_TX: { grupo: 'g4', acabamento: 'TX' },
  // g5 — Pedras
  Volakas_Micro: { grupo: 'g5', acabamento: 'Micro' },
  Basalto_Rust: { grupo: 'g5', acabamento: 'Rust' },
  // g6 — Tecido
  'Linen-Grigio_Vel': { grupo: 'g6', acabamento: 'Vel' },
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
  'Louro Freijó': 'Louro-Freijó_Grann',
  'Louro Preto': 'Louro-Preto_Grann',
  'Nogal Artezzano': 'Nogal-Artezzano_Grann',
  'Nogal Málaga': 'Nogal-Málaga_Design',
  'Nogal Malaga': 'Nogal-Málaga_Design',
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
  Branco: 'Branco_TX',
  'Cinza Argila': 'Cinza-Argila_TX',
  'Cinza Cobalto': 'Cinza-Cobalto_TX',
  'Cinza Cristal': 'Cinza-Cristal_TX',
  Desert: 'Desert_Vel',
  Gelo: 'Gelo_Vel',
  Pecan: 'Pecan_Vel',
  Latte: 'Latte_Micro',
  Chumbo: 'Chumbo_Micro',
  Tangará: 'Tangará_Micro',
  Ceramik: 'Ceramik_Micro',
  Falésia: 'Falésia_Vel',
  Falsia: 'Falésia_Vel',
  Nero: 'Nero_Rust',
  Nude: 'Nude_Vel',
  Millennial: 'Millennial_Micro',
  Ópera: 'Ópera_Micro',
  Preto: 'Preto_TX',
  superwhite: 'superwhite',
  Tabasco: 'Tabasco_Micro',
  Taupe: 'Taupe_Micro',
  Verti: 'Verti_Micro',
  Cromio: 'Cromio_Vel',
  'Metallic Suede': 'Metallic-Suede_TX',
  Dust: 'Dust_Alumi',
  Gold: 'Gold_Alumi',
  Plomo: 'Plomo_Alumi',
  Argento: 'Argento_Rust',
  Ruggine: 'Ruggine_TX',
  Volakas: 'Volakas_Micro',
  Basalto: 'Basalto_Rust',
  'Linen Grigio': 'Linen-Grigio_Vel',
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
