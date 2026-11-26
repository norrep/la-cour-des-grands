import { describe, expect, it } from 'vitest';
import { cinematiquesPour as brut } from '../../src/game/cinematiques';
import type { Evenement } from '../../src/engine/index';

const cinematiquesPour = (evs: Evenement[], gf = false) => brut(evs, gf).map((c) => c.id);
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

  it('le grand frère du Chouchou passe en premier', () => {
    expect(
      cinematiquesPour([{ type: 'infirmerie', tour: 1, bande: 'bleu', eleveId: 'b' }], true),
    ).toEqual(['grandsFreres', 'infirmerie']);
  });

  it('panneaux du toboggan, du mot d’excuse et des goûters', () => {
    expect(
      cinematiquesPour([
        { type: 'glissade', tour: 1, eleveId: 'a', role: 'grand', depart: 'A1', arrivee: 'B1' },
        { type: 'surveillante', tour: 1, position: 1, pas: 1, parDelegue: false },
        { type: 'surveillante', tour: 1, position: 2, pas: 1, parDelegue: true },
        { type: 'region', tour: 1, bande: 'rouge', region: 'haut', bonsPoints: 2 },
      ]),
    ).toEqual(['toboggan', 'delegue', 'gouter']);
  });

  it('pas de panneau de goûter quand il fait gagner : l’écran de victoire suffit', () => {
    expect(
      cinematiquesPour([
        { type: 'region', tour: 1, bande: 'rouge', region: 'haut', bonsPoints: 2 },
        { type: 'fin', tour: 1, gagnant: 'rouge', raison: 'bonsPoints' },
      ]),
    ).toEqual([]);
  });

  it('chaque bruitage provisoire reste bref', () => {
    for (const id of ['bouton', 'plaque', 'sonnerie', 'victoire'] as const) {
      expect(dureeBruitage(id)).toBeLessThan(0.6);
    }
  });
});
