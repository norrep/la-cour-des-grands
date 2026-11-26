import { describe, expect, it } from 'vitest';
import { FUN, variante } from '../../src/data/textesFun';
import { dernieresLignes, phraseEvenement } from '../../src/game/journal';
import { ecrireConseils, ecrireDebutant } from '../../src/game/preferences';
import { aide, tonFun, tutoPasse } from '../../src/game/ton';
import { cour1 } from '../engine/aide';

const cour = cour1();

describe('Ton des aides', () => {
  it('reste didactique pendant le tuto, puis passe au ton pour rire', () => {
    ecrireConseils(true);
    ecrireDebutant(true);
    expect(tonFun()).toBe(false);
    expect(aide('sérieux', ['drôle'], 0)).toBe('sérieux');
    tutoPasse();
    expect(tonFun()).toBe(true);
    expect(aide('sérieux', ['drôle'], 0)).toBe('drôle');
  });

  it('passe aussi au ton pour rire quand les conseils sont coupés', () => {
    ecrireDebutant(true);
    ecrireConseils(false);
    expect(tonFun()).toBe(true);
    ecrireConseils(true);
  });

  it('tire une variante stable selon la graine', () => {
    const l = ['a', 'b', 'c'];
    expect(variante(l, 4)).toBe('b');
    expect(variante(l, 4)).toBe(variante(l, 4));
    expect(variante(l, -1)).toBe('c');
  });

  it('raconte chaque événement du journal sur le ton pour rire', () => {
    const p = phraseEvenement(
      {
        type: 'pose',
        tour: 3,
        bande: 'rouge',
        eleveId: 'x',
        role: 'grand',
        cible: 'M1',
        plaque: 'fouine',
      },
      cour,
      true,
      0,
    );
    expect(p).toContain('Le Grand de CM2');
    expect(p).toContain('Le banc');
    expect(p).toContain('La Fouine');
    expect(dernieresLignes([], cour, 3, true)[0]).toBe(variante(FUN.journal.vide, 0));
  });

  it('a une variante pour rire pour chaque consigne de choix', () => {
    for (const liste of Object.values(FUN.choix)) expect(liste.length).toBeGreaterThan(0);
  });
});
