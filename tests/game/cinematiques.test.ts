import { describe, expect, it } from 'vitest';
import {
  cinematiqueDuPouvoir,
  cinematiquesPour as brut,
  roleDuPouvoir,
} from '../../src/game/cinematiques';
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

  it('la Populaire qui fait venir ses copains a son moment, pas la pioche ordinaire', () => {
    const evs: Evenement[] = [
      { type: 'pose', tour: 1, bande: 'bleu', eleveId: 'a', role: 'populaire', cible: 'P' },
      { type: 'pioche', tour: 1, bande: 'bleu', nombre: 2, source: 'populaire' },
    ];
    expect(brut(evs)).toEqual([{ id: 'populaire', bande: 'bleu' }]);
    expect(roleDuPouvoir({ id: 'populaire', bande: 'bleu' })).toBe('populaire');
    expect(
      cinematiquesPour([
        { type: 'pioche', tour: 1, bande: 'rouge', nombre: 1, source: 'porteVieScolaire' },
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

  it('le Petit qui plaque et la Fouine qui se faufile ont leur moment', () => {
    expect(
      cinematiquesPour([
        {
          type: 'pose',
          tour: 1,
          bande: 'rouge',
          eleveId: 'a',
          role: 'petit',
          cible: 'P',
          plaque: 'grand',
        },
      ]),
    ).toEqual(['petit']);
    const fouine: Evenement = {
      type: 'pose',
      tour: 1,
      bande: 'rouge',
      eleveId: 'a',
      role: 'fouine',
      cible: 'P',
    };
    expect(brut([fouine]).map((c) => c.id)).toEqual([]);
    expect(brut([fouine], false, true).map((c) => c.id)).toEqual(['fouine']);
  });

  it('une mise à la CPE par la Rapporteuse retient le pouvoir', () => {
    expect(
      brut([
        { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'a', role: 'rapporteuse', cible: 'P' },
        { type: 'cpe', tour: 1, bande: 'bleu', eleveId: 'c', role: 'grand', ilot: 'P' },
      ]),
    ).toEqual([{ id: 'cpe', pouvoir: 'rapporteuse', bande: 'rouge' }]);
  });

  it('chaque vidéo de pouvoir montre l’élève de la bande qui vient de jouer', () => {
    const pose = (role: 'chouchou' | 'petit' | 'delegue'): Evenement => ({
      type: 'pose',
      tour: 1,
      bande: 'bleu',
      eleveId: 'a',
      role,
      cible: 'P',
      ...(role === 'petit' ? { plaque: 'grand' as const } : {}),
    });
    expect(brut([pose('chouchou')], true)).toEqual([{ id: 'grandsFreres', bande: 'bleu' }]);
    expect(brut([pose('petit')])).toEqual([{ id: 'petit', bande: 'bleu' }]);
    expect(
      brut([
        pose('delegue'),
        { type: 'surveillante', tour: 1, position: 2, pas: 1, parDelegue: true },
      ]),
    ).toEqual([{ id: 'delegue', bande: 'bleu' }]);
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

  it('la vidéo de l’éternuement montre le Contagieux de l’autre bande que le malade', () => {
    expect(brut([{ type: 'infirmerie', tour: 1, bande: 'bleu', eleveId: 'b' }])).toEqual([
      { id: 'infirmerie', bande: 'rouge' },
    ]);
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

  it('pouvoir appliqué tout seul (DF.40) : la Rapporteuse et le 2e élève du Chouchou ont leur moment', () => {
    expect(
      brut([
        { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'a', role: 'rapporteuse', cible: 'L' },
        { type: 'cpe', tour: 1, bande: 'bleu', eleveId: 'c', role: 'grand', ilot: 'Q' },
      ]),
    ).toEqual([{ id: 'cpe', pouvoir: 'rapporteuse', bande: 'rouge' }]);
    expect(
      cinematiquesPour([
        { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'a', role: 'chouchou', cible: 'P' },
        { type: 'pose', tour: 1, bande: 'rouge', eleveId: 'b', role: 'grand', cible: 'Q' },
      ]),
    ).toEqual(['grandsFreres']);
  });

  it('à la pose, chaque pouvoir avec un choix retrouve son moment et son élève (DV.7)', () => {
    for (const role of ['contagieux', 'chouchou', 'delegue', 'rapporteuse'] as const) {
      const cin = cinematiqueDuPouvoir(role, 'bleu');
      expect(cin?.bande).toBe('bleu');
      expect(cin && roleDuPouvoir(cin)).toBe(role);
    }
    expect(cinematiqueDuPouvoir('grand', 'rouge')).toBeUndefined();
    expect(roleDuPouvoir({ id: 'cpe' })).toBeUndefined();
    expect(roleDuPouvoir({ id: 'petit' })).toBe('petit');
  });
});
