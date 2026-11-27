import { describe, expect, it } from 'vitest';
import {
  ciblesPossibles,
  creerPartie,
  gouterSuivant,
  gouterSurveille,
  jouer,
  optionsEffet,
} from '../../src/engine/index';
import { cour1, courTest, idRang, situation } from './aide';

/** Deux régions dans la cour de test : P-L (2 goûters) et Q-D (1 goûter). */
const regions = [
  { id: 'bas', nom: 'Bas', ilots: ['P', 'L'], bonsPoints: 2 },
  { id: 'milieu', nom: 'Milieu', ilots: ['Q', 'D'], bonsPoints: 1 },
];

describe('La surveillante garde un goûter (D2.18)', () => {
  it('commence sur le goûter de départ de sa ronde (la gauche sur la cour n°1)', () => {
    const e = creerPartie(cour1(), { graine: 1 });
    expect(gouterSurveille(e)).toBe('gauche');
    expect(gouterSuivant(e)).toBe('haut');
  });

  it('avance d’un goûter à la fin de chaque tour complet, pas avant', () => {
    let e = situation({ cour: courTest({ regions, ronde: ['bas', 'milieu'] }) });
    expect(gouterSurveille(e)).toBe('bas');
    e = jouer(e, { type: 'appeler' });
    expect(gouterSurveille(e)).toBe('bas');
    e = jouer(e, { type: 'appeler' });
    expect(gouterSurveille(e)).toBe('milieu');
    expect(e.journal).toContainEqual(
      expect.objectContaining({ type: 'surveillante', parDelegue: false }),
    );
  });

  it('suit sa ronde en boucle (cour n°1)', () => {
    const cour = cour1();
    let e = situation({
      cour,
      couloir: { rouge: Array(20).fill('grand'), bleu: Array(20).fill('grand') },
    });
    const vues: (string | null)[] = [];
    for (let i = 0; i < 5; i++) {
      vues.push(gouterSurveille(e));
      e = jouer(jouer(e, { type: 'appeler' }), { type: 'appeler' });
      e.joueurs.rouge.rang = [];
      e.joueurs.bleu.rang = [];
    }
    expect(vues).toEqual(['gauche', 'haut', 'droite', 'bas', 'gauche']);
  });

  it('personne ne ramasse le goûter qu’elle garde', () => {
    const e = situation({
      cour: courTest({ regions, ronde: ['bas', 'milieu'] }),
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']] },
    });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'L' });
    expect(apres.regionsPrises.bas).toBeUndefined();
    expect(apres.joueurs.rouge.bonsPoints).toBe(0);
  });

  it('dès qu’elle s’en va, le goûter entouré est ramassé', () => {
    let e = situation({
      cour: courTest({ regions, ronde: ['bas', 'milieu'] }),
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']] },
    });
    e = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'L' });
    e = jouer(e, { type: 'appeler' }); // bleu joue : tour complet, elle part au milieu
    expect(gouterSurveille(e)).toBe('milieu');
    expect(e.regionsPrises.bas).toBe('rouge');
    expect(e.joueurs.rouge.bonsPoints).toBe(2);
  });

  it('la victoire par ce goûter n’arrive qu’après sa marche', () => {
    let e = situation({
      cour: courTest({ regions, ronde: ['bas', 'milieu'], seuil: 2 }),
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']] },
    });
    e = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'L' });
    expect(e.fin).toBeNull();
    const avant = e.journal.length;
    e = jouer(e, { type: 'appeler' });
    expect(e.fin).toEqual({ gagnant: 'rouge', raison: 'bonsPoints' });
    const types = e.journal.slice(avant).map((ev) => ev.type);
    expect(types.indexOf('surveillante')).toBeLessThan(types.indexOf('region'));
    expect(types.indexOf('region')).toBeLessThan(types.indexOf('fin'));
  });

  it('elle ne bloque plus aucune allée ni aucun îlot : on plaque à côté d’elle', () => {
    const e = situation({
      cour: courTest({ regions, ronde: ['bas', 'milieu'] }),
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], L: [['bleu', 'populaire']] },
    });
    const cibles = ciblesPossibles(e, idRang(e, 'rouge', 'grand'));
    expect(cibles).toContain('L');
    expect(cibles).toContain('Q');
  });

  it('les effets peuvent toucher les îlots de son goûter', () => {
    const e = situation({
      cour: courTest({ regions, ronde: ['bas', 'milieu'] }),
      piles: { P: [['rouge', 'grand']], L: [['bleu', 'populaire']] },
    });
    const options = optionsEffet(e, {
      type: 'pouvoir',
      role: 'rapporteuse',
      ilot: 'P',
      eleveId: 'x',
    });
    expect(options).toContainEqual({ type: 'cpe', ilot: 'L' });
  });
});
