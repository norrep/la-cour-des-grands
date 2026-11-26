import { describe, expect, it } from 'vitest';
import { jouer } from '../../src/engine/index';
import {
  prochainConseil,
  TOUR_SURVEILLANTE,
  TOUR_ZONES,
  type ConseilId,
} from '../../src/game/conseils';
import { idRang, situation } from '../engine/aide';

const vus = (...ids: ConseilId[]): Set<ConseilId> => new Set(ids);

describe('Conseils pour débuter', () => {
  it('commence par le but du jeu, puis comment poser, puis appeler', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    expect(prochainConseil(e, 'jeu', vus())).toBe('but');
    expect(prochainConseil(e, 'jeu', vus('but'))).toBe('glisser');
    expect(prochainConseil(e, 'jeu', vus('but', 'glisser'))).toBe('appeler');
  });

  it('un seul conseil de préparation par tour', () => {
    const e = situation({ rang: { rouge: ['grand'] } });
    expect(prochainConseil(e, 'jeu', vus('but'), true)).toBeNull();
  });

  it('saute « glisser » quand aucun élève ne peut être posé', () => {
    const e = situation({ rang: { rouge: [] } });
    expect(prochainConseil(e, 'jeu', vus('but'))).toBe('appeler');
  });

  it('parle du chemin dès que la bande tient un îlot', () => {
    const base = vus('but', 'glisser', 'appeler');
    expect(prochainConseil(situation({ rang: { rouge: ['grand'] } }), 'jeu', base)).toBeNull();
    const e = situation({ rang: { rouge: ['grand'] }, piles: { P: [['rouge', 'grand']] } });
    expect(prochainConseil(e, 'jeu', base)).toBe('chemin');
  });

  it('parle du plaquage quand un adversaire plus faible est à portée', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: { P: [['bleu', 'populaire']] } });
    expect(prochainConseil(e, 'jeu', vus('but', 'glisser', 'appeler'))).toBe('plaquer');
  });

  it('attend quelques tours pour la surveillante et les zones', () => {
    const base = vus('but', 'glisser', 'appeler', 'chemin', 'plaquer');
    const e = situation({ rang: { rouge: ['grand'] } });
    e.tour = TOUR_SURVEILLANTE - 1;
    expect(prochainConseil(e, 'jeu', base)).toBeNull();
    e.tour = TOUR_SURVEILLANTE;
    expect(prochainConseil(e, 'jeu', base)).toBe('surveillante');
    e.tour = TOUR_ZONES;
    expect(prochainConseil(e, 'jeu', vus(...base, 'surveillante'))).toBe('zones');
  });

  it('explique le pouvoir pendant un choix', () => {
    const e = situation({ rang: { rouge: ['populaire'] } });
    const apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'populaire'),
      cible: 'P',
    });
    expect(apres.attente).not.toBeNull();
    expect(prochainConseil(apres, 'jeu', vus('but'))).toBe('pouvoir');
  });

  it('ne dit rien pendant la passe du téléphone', () => {
    expect(prochainConseil(situation(), 'passe', vus())).toBeNull();
  });
});
