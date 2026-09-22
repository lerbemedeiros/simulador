import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZONA_TODAS, POSICAO_MASTER, Interaction } from '../public/js/interaction.js';

function fakeComp(cfg = { id: 'cozinha', zonas: [{ id: 'a', label: 'A' }] }) {
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1920, height: 1080 });
  return {
    W: 1920,
    H: 1080,
    canvas,
    env: { cfg },
    hotspotDe: vi.fn(() => ({ x: 50, y: 50 })),
    limparDestaque: vi.fn(),
  };
}

describe('interaction constantes', () => {
  it('ZONA_TODAS', () => expect(ZONA_TODAS.id).toBe('__todas'));
  it('POSICAO_MASTER dentro de 0-100', () => {
    expect(POSICAO_MASTER.x).toBeGreaterThanOrEqual(0);
    expect(POSICAO_MASTER.y).toBeLessThanOrEqual(100);
  });
});

describe('Interaction', () => {
  it('monta hotspot master para cozinha', () => {
    const comp = fakeComp({ id: 'cozinha', zonas: [{ id: 'sup', label: 'Sup' }] });
    const inter = new Interaction(comp);
    const box = document.createElement('div');
    inter.montarHotspots(box, comp.env.cfg.zonas);
    expect(box.querySelector('.hotspot-master')).not.toBeNull();
    expect(box.querySelector('.hotspots')).not.toBeNull();
  });

  it('monta hotspots por zona para quarto', () => {
    const comp = fakeComp({
      id: 'quarto',
      zonas: [
        { id: 'z1', label: 'Z1' },
        { id: 'z2', label: 'Z2' },
      ],
    });
    const inter = new Interaction(comp);
    const box = document.createElement('div');
    inter.montarHotspots(box, comp.env.cfg.zonas);
    expect(box.querySelectorAll('.hotspot-zona').length).toBe(2);
  });

  it('definirRotuloMaster atualiza DOM', () => {
    const comp = fakeComp();
    const inter = new Interaction(comp);
    const box = document.createElement('div');
    inter.montarHotspots(box, comp.env.cfg.zonas);
    inter.definirRotuloMaster('Freijo', 'Grann');
    const btn = box.querySelector('.hotspot-master');
    expect(btn.title).toContain('Freijo');
    expect(btn.querySelector('.hs-nome').textContent).toBe('Freijo');
  });

  it('selecionar dispara callback', () => {
    const comp = fakeComp();
    const onSelect = vi.fn();
    const inter = new Interaction(comp, { onSelect });
    inter.selecionar(ZONA_TODAS);
    expect(onSelect).toHaveBeenCalledWith(ZONA_TODAS);
    expect(comp.limparDestaque).toHaveBeenCalled();
  });

  it('_toCanvas converte coordenadas', () => {
    const comp = fakeComp();
    const inter = new Interaction(comp);
    comp.canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 100 });
    comp.W = 200;
    comp.H = 100;
    const p = inter._toCanvas({ clientX: 60, clientY: 70 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });
});
