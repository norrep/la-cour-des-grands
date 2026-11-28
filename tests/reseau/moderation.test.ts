import { describe, expect, it } from 'vitest';
import { pseudoInterdit } from '../../src/reseau/moderation';
import { Refus, validerPseudo } from '../../src/reseau/index';

describe('filtre des pseudos', () => {
  it('refuse les gros mots, même déguisés', () => {
    for (const p of [
      'Connard',
      'c0nn4rd',
      'SALOOOPE',
      'pu.tain',
      'Le Con',
      'C O N',
      'fdp',
      'FuCk',
      'Merdeux',
      'Enculé',
      'b1tch',
    ])
      expect(pseudoInterdit(p), p).toBe(true);
  });
  it('laisse passer les prénoms et surnoms qui contiennent ces lettres', () => {
    for (const p of [
      'Constance',
      'Le député',
      'Habite',
      'Technique',
      'Cahier',
      'Violette',
      'Sucette',
      'Léo le Grand',
      'Ninon',
      'Pascal',
      'Culotte Man',
      'Concombre',
      'Bitcoin',
    ])
      expect(pseudoInterdit(p), p).toBe(false);
  });
  it('le refus passe par validerPseudo, comme sur le serveur', () => {
    expect(() => validerPseudo('Connard')).toThrow(Refus);
    expect(validerPseudo('Constance')).toBe('Constance');
  });
});
