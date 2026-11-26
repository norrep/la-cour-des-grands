import { describe, expect, it } from 'vitest';
import { cinematiquesPour } from '../../src/game/cinematiques';
import { dureeBruitage } from '../../src/game/sons';

describe('Cinématiques', () => {
  it('rien pour une pose ordinaire', () => {
    expect(
      cinematiquesPour([
        { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'a', role: 'grand', cible: 'P' },
      ]),
    ).toEqual([]);
  });

  it('CPE, infirmerie et sonnerie suivent le journal, dans l’ordre', () => {
    expect(
      cinematiquesPour([
        { type: 'infirmerie', tour: 1, bande: 'bleu', eleveId: 'b' },
        { type: 'cpe', tour: 1, bande: 'bleu', eleveId: 'c', role: 'grand', ilot: 'P' },
        { type: 'fin', tour: 1, gagnant: 'rouge', raison: 'sonnerie' },
      ]),
    ).toEqual(['infirmerie', 'cpe', 'sonnerie']);
  });

  it('pas de sonnerie pour une victoire par la cabane', () => {
    expect(
      cinematiquesPour([{ type: 'fin', tour: 1, gagnant: 'rouge', raison: 'cabane' }]),
    ).toEqual([]);
  });

  it('les grands frères du Chouchou passent en premier', () => {
    expect(
      cinematiquesPour([{ type: 'infirmerie', tour: 1, bande: 'bleu', eleveId: 'b' }], true),
    ).toEqual(['grandsFreres', 'infirmerie']);
  });

  it('chaque bruitage provisoire reste bref', () => {
    for (const id of ['bouton', 'plaque', 'sonnerie', 'victoire'] as const) {
      expect(dureeBruitage(id)).toBeLessThan(0.6);
    }
  });
});
