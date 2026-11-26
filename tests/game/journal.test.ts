import { describe, expect, it } from 'vitest';
import { dernieresLignes, phraseEvenement } from '../../src/game/journal';
import { cour1 } from '../engine/aide';

const cour = cour1();

describe('Journal des actions', () => {
  it('raconte une pose et un plaquage en français', () => {
    const p = phraseEvenement(
      {
        type: 'pose',
        tour: 3,
        bande: 'rouge',
        eleveId: 'x',
        role: 'grand',
        cible: 'M2',
        plaque: 'fouine',
      },
      cour,
    );
    expect(p).toBe('Bande rouge : Le Grand de CM2 → Le banc. La Fouine est plaqué au sol !');
  });

  it('nomme la cabane adverse', () => {
    const p = phraseEvenement(
      { type: 'pose', tour: 3, bande: 'bleu', eleveId: 'x', role: 'grand', cible: 'CabRouge' },
      cour,
    );
    expect(p).toContain('la cabane adverse');
  });

  it('accorde le pluriel', () => {
    expect(phraseEvenement({ type: 'appel', tour: 1, bande: 'bleu', nombre: 1 }, cour)).toBe(
      'Bande bleue appelle 1 copain.',
    );
    expect(phraseEvenement({ type: 'appel', tour: 1, bande: 'bleu', nombre: 2 }, cour)).toBe(
      'Bande bleue appelle 2 copains.',
    );
  });

  it('nomme le goûter ramassé sur la zone', () => {
    const p = phraseEvenement(
      { type: 'region', tour: 1, bande: 'rouge', region: 'haut', bonsPoints: 2 },
      cour,
    );
    expect(p).toBe('Bande rouge ramasse la tablette de chocolat : +2 !');
  });

  it('ignore l’avance normale de la surveillante, mais pas le Délégué', () => {
    const base = { type: 'surveillante', tour: 1, position: 1, pas: 1 } as const;
    expect(phraseEvenement({ ...base, parDelegue: false }, cour)).toBeNull();
    expect(phraseEvenement({ ...base, parDelegue: true }, cour)).not.toBeNull();
  });

  it('garde les dernières lignes dans l’ordre', () => {
    const lignes = dernieresLignes(
      [
        { type: 'appel', tour: 1, bande: 'rouge', nombre: 2 },
        { type: 'appel', tour: 2, bande: 'bleu', nombre: 2 },
        { type: 'surveillante', tour: 2, position: 1, pas: 1, parDelegue: false },
        { type: 'appel', tour: 3, bande: 'rouge', nombre: 1 },
      ],
      cour,
      2,
    );
    expect(lignes).toEqual(['Bande bleue appelle 2 copains.', 'Bande rouge appelle 1 copain.']);
  });

  it('affiche un message d’accueil quand le journal est vide', () => {
    expect(dernieresLignes([], cour, 3)).toEqual(['La récré commence !']);
  });
});
