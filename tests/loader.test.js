import { describe, it, expect } from 'vitest';
import { acabamentoDoSufixo, detectarCategoria } from '../public/js/loader.js';

describe('acabamentoDoSufixo', () => {
  it('detecta sufixos conhecidos', () => {
    expect(acabamentoDoSufixo('Freijo_Nativo_Grann')).toBe('Grann');
    expect(acabamentoDoSufixo('Branco_Micro')).toBe('Micro');
    expect(acabamentoDoSufixo('Plomo_Alumi')).toBe('Alumi');
    expect(acabamentoDoSufixo('Preto_TX')).toBe('TX');
  });
  it('retorna vazio para desconhecido', () => {
    expect(acabamentoDoSufixo('SemSufixo')).toBe('');
  });
});

describe('detectarCategoria', () => {
  it('mapeia corretamente', () => {
    expect(detectarCategoria('Foo_Grann')).toBe('Madeira');
    expect(detectarCategoria('Foo_Micro')).toBe('Microcimento');
    expect(detectarCategoria('Foo_Vel')).toBe('Veludo');
    expect(detectarCategoria('Foo_Alumi')).toBe('Alumínio');
    expect(detectarCategoria('Outro')).toBe('Outros');
  });
});
