// ============================================================
// CONFIG — Simulador 2.5D  |  fachada profissional
// ------------------------------------------------------------
// Este arquivo é a FACHADA pública. A fonte da verdade vive em
// public/js/config/*.js (defaults, grupos, ambientes, texturas, schema).
// Mantido como `config.js` para compatibilidade com:
//   import { AMBIENTES, BASE_URL } from './config.js' (loader.js:4, main.js:9)
// Todos os exports são congelados e validados em build/dev.
//
// Para adicionar ambiente: edite public/js/config/ambientes.js
// Para adicionar textura: edite public/assets/texturas/texturas.json
// ============================================================

// Re-export da fonte da verdade — explícito para evitar duplicatas e garantir autocomplete
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
  AMBIENTES,
  AMBIENTES_DISPONIVEIS,
  AMBIENTE_ATUAL,
  resolverAmbienteAtual,
  listarDisponiveis,
  getAmbiente,
} from './config/index.js';
