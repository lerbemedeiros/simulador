// ============================================================
// ambientes.js — definição de todos os ambientes (DRY + defaults)
// ============================================================
import { defineAmbiente, DEFAULT_CHAPA, DEFAULT_TEXTURA_REPETICAO } from './defaults.js';

/**
 * @typedef {import('./schema.js').Ambiente} Ambiente
 * @typedef {import('./schema.js').Zona} Zona
 */

// Helper para criar zonas com validação leve de coordenadas
const zona = o => Object.freeze({ ...o, cor: Object.freeze([...o.cor]), seed: Object.freeze([...o.seed]) });

/** @type {Ambiente} */
const cozinha = defineAmbiente({
  id: 'cozinha',
  nome: 'Cozinha',
  icone: 'fa-utensils',
  imagem: 'assets/ambientes/cozinha_01/base/bg_neutro.png',
  thumb: 'assets/ambientes/cozinha_01/thumb/thumb.png',
  width: 1920,
  height: 1080,
  chapa: { ...DEFAULT_CHAPA },
  // Cozinha tem peças menores (gavetas/bancada ~300-500px de bbox) vs quarto (~700-900px).
  // Com 1000 o veio ficava 2.7x menor que no quarto. 2750 (1 tile = 1 chapa longa) devolve
  // a escala visual real — mesmo sistema RealWorldScale, só que calibrado por ambiente.
  texturaRepeticao: 2750,
  camadas: Object.freeze({
    base: 'ambientes/cozinha_01/base/bg_neutro.png',
    sombras: 'ambientes/cozinha_01/base/sombras_luz.png',
    reflexos: 'ambientes/cozinha_01/base/reflexos.png',
  }),
  idMap: 'ambientes/cozinha_01/mascaras/id_map.png',
  zonas: Object.freeze([
    zona({
      id: 'sup_painel',
      label: 'Painel Sup. Verde',
      cor: [26, 136, 59],
      seed: [776, 60],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'sup_portas',
      label: 'Portas Sup. Esquerda',
      cor: [73, 33, 58],
      seed: [776, 185],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'sup_centro',
      label: 'Porta Sup. Centro',
      cor: [216, 27, 203],
      seed: [960, 89],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'col_estreita',
      label: 'Coluna Estreita',
      cor: [51, 203, 106],
      seed: [598, 739],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'gaveta_1',
      label: 'Gaveta 1',
      cor: [229, 217, 200],
      seed: [930, 622],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'gaveta_2',
      label: 'Gaveta 2',
      cor: [238, 105, 170],
      seed: [930, 700],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'gaveta_3',
      label: 'Gaveta 3',
      cor: [93, 51, 156],
      seed: [930, 776],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'gaveta_4',
      label: 'Gaveta 4',
      cor: [91, 170, 241],
      seed: [930, 853],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'inf_faixa',
      label: 'Bancada',
      cor: [236, 173, 92],
      seed: [943, 569],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'inf_centro',
      label: 'Porta Inf. Esquerda',
      cor: [158, 129, 195],
      seed: [1072, 618],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
    zona({
      id: 'inf_dir',
      label: 'Porta Inf. Direita',
      cor: [111, 94, 150],
      seed: [1234, 618],
      mascara: 'ambientes/cozinha_01/mascaras/armarios_superiores.png',
    }),
  ]),
  padrao: 'sup_centro',
  padraoZona: Object.freeze({
    sup_painel: 'Freijo_Nativo_Grann',
    sup_portas: 'Freijo_Nativo_Grann',
    sup_centro: 'Freijo_Nativo_Grann',
    col_estreita: 'Freijo_Nativo_Grann',
    gaveta_1: 'Freijo_Nativo_Grann',
    gaveta_2: 'Freijo_Nativo_Grann',
    gaveta_3: 'Freijo_Nativo_Grann',
    gaveta_4: 'Freijo_Nativo_Grann',
    inf_faixa: 'Freijo_Nativo_Grann',
    inf_centro: 'Freijo_Nativo_Grann',
    inf_dir: 'Freijo_Nativo_Grann',
  }),
});

/** @type {Ambiente} */
const quarto = defineAmbiente({
  id: 'quarto',
  nome: 'Quarto',
  icone: 'fa-bed',
  imagem: 'assets/ambientes/quarto_01/base/bg_neutro.png',
  thumb: 'assets/ambientes/quarto_01/thumb/thumb.png',
  width: 1920,
  height: 1080,
  chapa: { ...DEFAULT_CHAPA },
  texturaRepeticao: DEFAULT_TEXTURA_REPETICAO,
  camadas: Object.freeze({
    base: 'ambientes/quarto_01/base/bg_neutro.png',
    sombras: 'ambientes/quarto_01/base/sombras_luz.png',
    reflexos: 'ambientes/quarto_01/base/reflexos.png',
  }),
  idMap: 'ambientes/quarto_01/mascaras/id_map.png',
  zonas: Object.freeze([
    zona({
      id: 'quarto_mat_1',
      label: 'Material 1',
      cor: [127, 63, 191],
      seed: [494, 235],
      mascara: 'ambientes/quarto_01/mascaras/mask_127_63_191.png',
    }),
    zona({
      id: 'quarto_mat_2',
      label: 'Material 2',
      cor: [159, 64, 64],
      seed: [124, 40],
      mascara: 'ambientes/quarto_01/mascaras/mask_159_64_64.png',
    }),
    zona({
      id: 'quarto_mat_3',
      label: 'Material 3',
      cor: [191, 64, 0],
      seed: [1838, 1],
      mascara: 'ambientes/quarto_01/mascaras/mask_191_64_0.png',
    }),
  ]),
  padrao: 'quarto_mat_1',
  padraoZona: Object.freeze({
    quarto_mat_1: 'Freijo_Nativo_Grann',
    quarto_mat_2: 'Freijo_Nativo_Grann',
    quarto_mat_3: 'Freijo_Nativo_Grann',
  }),
});

/** Placeholder — aparece como "Em breve" */
const sala = defineAmbiente({
  id: 'sala',
  nome: 'Sala',
  icone: 'fa-couch',
  imagem: 'assets/ambientes/sala_01/base/bg_neutro.png',
  thumb: 'assets/ambientes/sala_01/thumb/thumb.png',
  width: 1920,
  height: 1080,
  chapa: { ...DEFAULT_CHAPA },
  texturaRepeticao: DEFAULT_TEXTURA_REPETICAO,
  camadas: null,
  idMap: null,
  zonas: Object.freeze([]),
  padrao: null,
  padraoZona: Object.freeze({}),
  indisponivel: true,
});

export const AMBIENTES_RAW = {
  cozinha: Object.freeze(cozinha),
  quarto: Object.freeze(quarto),
  sala: Object.freeze(sala),
};
