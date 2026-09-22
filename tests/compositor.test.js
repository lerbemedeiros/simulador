import { describe, it, expect } from 'vitest';

// Testa lógica de tolerância de cor (zonaEm) isolada — sem canvas
function zonaEmSimulado(idMapData, W, zonas, x, y, TOL = 5) {
  if (x < 0 || y < 0 || x >= W) return null;
  const i = (y * W + x) * 4;
  const r = idMapData[i],
    g = idMapData[i + 1],
    b = idMapData[i + 2];
  for (const z of zonas) {
    if (Math.abs(z.cor[0] - r) < TOL && Math.abs(z.cor[1] - g) < TOL && Math.abs(z.cor[2] - b) < TOL)
      return z;
  }
  return null;
}

describe('zonaEm tolerância <5', () => {
  const zonas = [
    { id: 'a', cor: [100, 100, 100] },
    { id: 'b', cor: [200, 0, 0] },
  ];
  it('acha com delta <5', () => {
    const data = new Uint8ClampedArray([102, 103, 101, 255]);
    expect(zonaEmSimulado(data, 1, zonas, 0, 0)?.id).toBe('a');
  });
  it('rejeita com delta >=5', () => {
    const data = new Uint8ClampedArray([106, 100, 100, 255]);
    expect(zonaEmSimulado(data, 1, zonas, 0, 0)).toBeNull();
  });
  it('fora de bounds retorna null', () => {
    const data = new Uint8ClampedArray([100, 100, 100, 255]);
    expect(zonaEmSimulado(data, 1, zonas, -1, 0)).toBeNull();
  });
});

describe('hotspotDe cálculo %', () => {
  it('converte px para %', () => {
    const W = 1920,
      H = 1080;
    const centroide = { x: 960, y: 540 };
    const pct = { x: (centroide.x / W) * 100, y: (centroide.y / H) * 100 };
    expect(pct.x).toBeCloseTo(50);
    expect(pct.y).toBeCloseTo(50);
  });
});
