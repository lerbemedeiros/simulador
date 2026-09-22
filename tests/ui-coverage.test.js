import { describe, it, expect, beforeEach } from 'vitest';
import { UI } from '../public/js/ui.js';
import { CATALOGO } from '../public/js/loader.js';

describe('UI unit - coverage boost', () => {
  let ui;
  beforeEach(() => {
    ui = new UI({ onPickTexture: async () => true });
    document.body.innerHTML = '<div id="backdrop"></div><div id="painel"></div>';
    CATALOGO['Test_Grann'] = {
      id: 'Test_Grann',
      nome: 'Test Grann',
      categoria: 'Amadeirados',
      acabamento: 'Grann',
      thumb: '/a.webp',
    };
  });

  it('_nomeLimpo e _escape', () => {
    const t = { nome: 'Foo Grann', acabamento: 'Grann' };
    expect(ui._nomeLimpo(t)).toBe('Foo');
    expect(ui._escape('<b>&')).toBe('&lt;b&gt;&amp;');
    expect(ui.nomeDaTextura('Test_Grann')).toBeDefined();
  });

  it('montar cria estrutura', () => {
    CATALOGO['A_Grann'] = {
      id: 'A_Grann',
      nome: 'A Grann',
      categoria: 'Amadeirados',
      acabamento: 'Grann',
      thumb: 'a.webp',
    };
    CATALOGO['B_TX'] = {
      id: 'B_TX',
      nome: 'B TX',
      categoria: 'Unicolor',
      acabamento: 'TX',
      thumb: 'b.webp',
    };
    const container = document.querySelector('#painel');
    ui.montar(container, []);
    expect(container.querySelector('#grade')).not.toBeNull();
    expect(container.querySelector('#chipsBar')).not.toBeNull();
    expect(ui.filtro).toBe('Todas');
  });

  it('setFiltro e setEspecial', () => {
    CATALOGO['C_Micro'] = {
      id: 'C_Micro',
      nome: 'C Micro',
      categoria: 'Unicolor',
      acabamento: 'Micro',
      thumb: 'c.webp',
    };
    const container = document.querySelector('#painel');
    ui.montar(container, []);
    // mock scrollIntoView para jsdom
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
    ui.setFiltro('Unicolor');
    expect(ui.filtro).toBe('Unicolor');
    ui.setEspecial('favs');
    expect(ui.listaEspecial).toBe('favs');
  });
});
