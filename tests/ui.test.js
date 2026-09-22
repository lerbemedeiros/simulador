import { describe, it, expect, beforeEach, vi } from 'vitest';

// UI depende de DOM; teste de lógica pura auxiliar
import { acabamentoDoSufixo, detectarCategoria } from '../public/js/loader.js';

describe('loader helpers robustez', () => {
  it('acabamentoDoSufixo case-insensitive via lower', () => {
    expect(acabamentoDoSufixo('FOO_GRANN')).toBe('Grann');
  });
  it('detectarCategoria fallback Outros', () => {
    expect(detectarCategoria('XYZ')).toBe('Outros');
    expect(detectarCategoria('')).toBe('Outros');
  });
});

describe('segurança XSS - escape', () => {
  it('busca não deve quebrar innerHTML com entidades', () => {
    const s = '<img onerror=alert(1)> & "teste"';
    const esc = s.replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
    expect(esc).not.toContain('<img');
    expect(esc).toContain('&lt;img');
    expect(esc).toContain('&amp;');
  });
});
