import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acabamentoDoSufixo, detectarCategoria, loadImage } from '../public/js/loader.js';

describe('loadImage', () => {
  it('resolve em img load', async () => {
    const origImage = global.Image;
    class FakeImg {
      set src(v) {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }
    // @ts-ignore
    global.Image = FakeImg;
    const img = await loadImage('x.png', { timeout: 0 });
    expect(img).toBeInstanceOf(FakeImg);
    global.Image = origImage;
  });

  it('rejeita em erro', async () => {
    const origImage = global.Image;
    class FakeImg {
      set src(v) {
        setTimeout(() => this.onerror && this.onerror(), 0);
      }
    }
    // @ts-ignore
    global.Image = FakeImg;
    await expect(loadImage('bad.png', { timeout: 0 })).rejects.toThrow(/Falha/);
    global.Image = origImage;
  });
});

describe('acabamentoDoSufixo extras', () => {
  it('TX e Vel', () => {
    expect(acabamentoDoSufixo('A_TX')).toBe('TX');
    expect(acabamentoDoSufixo('A_Vel')).toBe('Vel');
    expect(acabamentoDoSufixo('A_Poro')).toBe('Poro');
  });
});

describe('detectarCategoria extras', () => {
  it('todos mapeamentos', () => {
    expect(detectarCategoria('a_lsf')).toBe('LSF');
    expect(detectarCategoria('a_poro')).toBe('Porcelanato');
    expect(detectarCategoria('a_design')).toBe('Design');
    expect(detectarCategoria('a_tx')).toBe('TX');
  });
});
