import { describe, it, expect, beforeEach, vi } from 'vitest';
import { diagPush, diagVer } from '../public/js/diag.js';

describe('diag', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('push e ver', () => {
    diagPush({ ev: 'a' });
    diagPush({ ev: 'b' });
    const arr = diagVer();
    expect(arr.length).toBe(2);
    expect(arr[0].ev).toBe('a');
    expect(arr[1].ev).toBe('b');
    expect(arr[0].t).toBeDefined();
  });

  it('limita a 120', () => {
    for (let i = 0; i < 130; i++) diagPush({ ev: 'x', i });
    const arr = diagVer();
    expect(arr.length).toBe(120);
    expect(arr[0].i).toBe(10);
  });

  it('retorna null se storage corrompido', () => {
    sessionStorage.setItem('simDiag_v1', 'invalid json{');
    expect(diagVer()).toBeNull();
    // push deve recuperar
    diagPush({ ev: 'rec' });
    expect(diagVer().length).toBe(1);
  });

  it('ignora se sessionStorage bloqueado', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => diagPush({ ev: 'blocked' })).not.toThrow();
    spy.mockRestore();
  });
});
