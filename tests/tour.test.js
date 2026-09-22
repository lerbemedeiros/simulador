import { describe, it, expect } from 'vitest';

describe('tour requisitos', () => {
  it('tour.js deve exportar iniciarTour', async () => {
    const mod = await import('../public/js/tour.js');
    expect(typeof mod.iniciarTour).toBe('function');
  });
});
