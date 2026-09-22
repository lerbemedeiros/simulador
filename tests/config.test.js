import { describe, it, expect } from 'vitest';
import { validarAmbiente, validarZona } from '../public/js/config/schema.js';
import { DEFAULT_CHAPA, defineAmbiente } from '../public/js/config/defaults.js';
import { GRUPOS, labelDoGrupo, isGrupoValido } from '../public/js/config/grupos.js';
import { resolverAmbienteAtual, AMBIENTES } from '../public/js/config/index.js';
import { aplicarHashComposicao, lerHashComposicao, textoHashComposicao } from '../public/js/hash.js';

describe('schema validarZona', () => {
  it('aceita zona válida', () => {
    expect(() =>
      validarZona({ id: 'a', label: 'A', cor: [10, 20, 30], seed: [0, 0], mascara: 'x.png' }, 'cozinha')
    ).not.toThrow();
  });
  it('rejeita cor inválida', () => {
    expect(() =>
      validarZona({ id: 'a', label: 'A', cor: [300, 0, 0], seed: [0, 0], mascara: 'x.png' }, 'cozinha')
    ).toThrow();
  });
  it('rejeita escala inválida', () => {
    expect(() =>
      validarZona(
        { id: 'a', label: 'A', cor: [0, 0, 0], seed: [0, 0], mascara: 'x.png', escala: -1 },
        'cozinha'
      )
    ).toThrow();
  });
});

describe('schema validarAmbiente', () => {
  it('aceita ambiente disponível', () => {
    expect(() => validarAmbiente(AMBIENTES.cozinha)).not.toThrow();
    expect(() => validarAmbiente(AMBIENTES.quarto)).not.toThrow();
  });
  it('aceita indisponível sem camadas', () => {
    expect(() => validarAmbiente(AMBIENTES.sala)).not.toThrow();
  });
  it('rejeita id duplicado de zona', () => {
    const amb = defineAmbiente({
      id: 't',
      nome: 'T',
      icone: 'fa-x',
      imagem: 'x.png',
      width: 100,
      height: 100,
      chapa: { ...DEFAULT_CHAPA },
      texturaRepeticao: 1000,
      camadas: { base: 'a', sombras: 'b', reflexos: 'c' },
      idMap: 'd',
      zonas: [
        { id: 'z', label: 'Z', cor: [0, 0, 0], seed: [0, 0], mascara: 'm.png' },
        { id: 'z', label: 'Z2', cor: [1, 1, 1], seed: [1, 1], mascara: 'm.png' },
      ],
      padrao: 'z',
      padraoZona: { z: 'Foo' },
    });
    expect(() => validarAmbiente(amb)).toThrow(/duplicada/);
  });
});

describe('defaults defineAmbiente', () => {
  it('aplica defaults e congela chapa', () => {
    const a = defineAmbiente({
      id: 'x',
      nome: 'X',
      icone: 'fa-x',
      imagem: 'x.png',
      camadas: null,
      idMap: null,
      zonas: [],
      padrao: null,
      padraoZona: {},
      indisponivel: true,
    });
    expect(a.width).toBe(1920);
    expect(a.chapa.w).toBe(1850);
    expect(Object.isFrozen(a.chapa)).toBe(true);
  });
});

describe('grupos', () => {
  it('6 grupos', () => expect(GRUPOS.length).toBe(6));
  it('labelDoGrupo', () => {
    expect(labelDoGrupo('g1')).toBe('Amadeirados');
    expect(labelDoGrupo('invalido')).toBe('');
    expect(labelDoGrupo(null)).toBe('');
  });
  it('isGrupoValido', () => {
    expect(isGrupoValido('g1')).toBe(true);
    expect(isGrupoValido('g7')).toBe(false);
  });
});

describe('resolverAmbienteAtual', () => {
  it('resolve env= param', () => {
    expect(resolverAmbienteAtual('#c=v1;a:b&env=quarto')).toBe('quarto');
    expect(resolverAmbienteAtual('#env=cozinha')).toBe('cozinha');
  });
  it('resolve hash puro', () => {
    expect(resolverAmbienteAtual('#quarto')).toBe('quarto');
  });
  it('fallback para cozinha', () => {
    expect(resolverAmbienteAtual('#inexistente')).toBe('cozinha');
    expect(resolverAmbienteAtual('')).toBe('cozinha');
  });
});

describe('hash aplicarHashComposicao', () => {
  function fakeComp(ids) {
    return {
      env: { cfg: { zonas: ids.map(id => ({ id })) } },
      texturas: Object.fromEntries(ids.map(id => [id, 'Old'])),
      escalas: {},
    };
  }
  it('aplica só zonas existentes e texturas válidas', () => {
    const cat = { Freijo_Nativo_Grann: {}, Preto_TX: {} };
    const comp = fakeComp(['a', 'b']);
    const ok = aplicarHashComposicao(comp, cat, '#c=v1;a:Freijo_Nativo_Grann;b:Preto_TX@1.50;c:Ignorado');
    expect(ok).toBe(true);
    expect(comp.texturas.a).toBe('Freijo_Nativo_Grann');
    expect(comp.texturas.b).toBe('Preto_TX');
    expect(comp.escalas.b).toBe(1.5);
  });
  it('rejeita escala fora de 0.5-2', () => {
    const cat = { Foo: {} };
    const comp = fakeComp(['a']);
    aplicarHashComposicao(comp, cat, '#c=v1;a:Foo@10');
    expect(comp.escalas.a).toBeUndefined();
  });
  it('retorna false sem hash', () => {
    const comp = fakeComp(['a']);
    expect(aplicarHashComposicao(comp, {}, '')).toBe(false);
  });
  it('textoHashComposicao com escala', () => {
    const comp = { texturas: { a: 'Foo', b: 'Bar' }, escalas: { a: 1, b: 1.2 } };
    const t = textoHashComposicao(comp);
    expect(t).toContain('a:Foo');
    expect(t).toContain('b:Bar@1.20');
  });
});
