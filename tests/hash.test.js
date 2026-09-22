import { describe, it, expect } from 'vitest';
import { lerHashComposicao, textoHashComposicao } from '../public/js/hash.js';

describe('hash versionado', () => {
  it('gera v1 prefixado', () => {
    const comp = { texturas: { a: 'Freijo_Nativo_Grann', b: 'Preto_TX' }, escalas: {} };
    expect(textoHashComposicao(comp)).toBe('v1;a:Freijo_Nativo_Grann;b:Preto_TX');
  });
  it('inclui escala apenas quando ≠1', () => {
    const comp = { texturas: { a: 'Branco_Micro' }, escalas: { a: 1.5 } };
    expect(textoHashComposicao(comp)).toBe('v1;a:Branco_Micro@1.50');
    const comp2 = { texturas: { a: 'Branco_Micro' }, escalas: { a: 1 } };
    expect(textoHashComposicao(comp2)).toBe('v1;a:Branco_Micro');
  });
  it('lê legado sem prefixo', () => {
    expect(lerHashComposicao('#c=sup_painel:Freijo_Nativo_Grann')).toEqual({
      sup_painel: 'Freijo_Nativo_Grann',
    });
  });
  it('lê v1', () => {
    expect(lerHashComposicao('#c=v1;sup_painel:Freijo_Nativo_Grann;inf_dir:Preto_TX@1.20')).toEqual({
      sup_painel: 'Freijo_Nativo_Grann',
      inf_dir: 'Preto_TX@1.20',
    });
  });
  it('retorna null para hash vazio ou versão futura', () => {
    expect(lerHashComposicao('#c=')).toBeNull();
    expect(lerHashComposicao('#c=v2;foo:bar')).toBeNull();
    expect(lerHashComposicao('')).toBeNull();
  });
  it('decodeURIComponent com fallback', () => {
    const hash = '#c=' + encodeURIComponent('v1;sup_painel:Freijo_Nativo_Grann');
    expect(lerHashComposicao(hash)).toEqual({ sup_painel: 'Freijo_Nativo_Grann' });
  });
});
