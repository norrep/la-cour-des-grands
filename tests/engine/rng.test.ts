import { describe, expect, it } from 'vitest';
import { graineVersEtat, melanger, tirer, tirerEntier } from '../../src/engine/index';

describe('Générateur aléatoire à graine', () => {
  it('est déterministe', () => {
    const a = tirer(graineVersEtat(7));
    const b = tirer(graineVersEtat(7));
    expect(a).toEqual(b);
  });
  it('donne des valeurs dans [0, 1)', () => {
    let rng = graineVersEtat(1);
    for (let i = 0; i < 1000; i++) {
      const [v, s] = tirer(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      rng = s;
    }
  });
  it('tire des entiers bien répartis', () => {
    let rng = graineVersEtat(3);
    const compte = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      const [v, s] = tirerEntier(rng, 4);
      compte[v] = (compte[v] ?? 0) + 1;
      rng = s;
    }
    for (const c of compte) expect(c).toBeGreaterThan(850);
  });
  it('mélange sans perdre ni dupliquer, sans toucher à l’original', () => {
    const liste = Array.from({ length: 24 }, (_, i) => i);
    const [m] = melanger(liste, graineVersEtat(5));
    expect(m).not.toEqual(liste);
    expect([...m].sort((a, b) => a - b)).toEqual(liste);
    expect(liste[0]).toBe(0);
  });
});
