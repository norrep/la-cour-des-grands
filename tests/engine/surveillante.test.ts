import { describe, expect, it } from 'vitest';
import {
  alleeSuivante,
  alleeSurveillante,
  ciblesPossibles,
  creerPartie,
  ilotsSurveilles,
  jouer,
  optionsEffet,
} from '../../src/engine/index';
import { cour1, courTest, idRang, situation } from './aide';

describe('La surveillante', () => {
  it('commence sur l’allée de départ de sa ronde (A1-M1 sur la cour n°1)', () => {
    const cour = cour1();
    const e = creerPartie(cour, { graine: 1 });
    expect(cour.allees[alleeSurveillante(e)]).toEqual(['A1', 'M1']);
    expect(ilotsSurveilles(e).sort()).toEqual(['A1', 'M1']);
  });

  it('affiche son allée suivante (traces de pas)', () => {
    const cour = cour1();
    const e = creerPartie(cour, { graine: 1 });
    expect(cour.allees[alleeSuivante(e)]).toEqual(['M1', 'B1']);
  });

  it('avance d’une allée à la fin de chaque tour complet, pas avant', () => {
    let e = situation();
    expect(e.surveillante).toBe(0);
    e = jouer(e, { type: 'appeler' }); // rouge (premier) a joué
    expect(e.surveillante).toBe(0);
    e = jouer(e, { type: 'appeler' }); // bleu a joué : tour complet
    expect(e.surveillante).toBe(1);
    expect(e.journal.at(-1)).toMatchObject({ type: 'surveillante', parDelegue: false });
  });

  it('suit sa ronde en boucle', () => {
    const cour = cour1();
    let e = situation({
      cour,
      couloir: { rouge: Array(20).fill('grand'), bleu: Array(20).fill('grand') },
    });
    const vues: string[] = [];
    for (let i = 0; i < 7; i++) {
      vues.push(cour.allees[alleeSurveillante(e)]?.join('-') ?? '');
      e = jouer(jouer(e, { type: 'appeler' }), { type: 'appeler' });
      e.joueurs.rouge.rang = [];
      e.joueurs.bleu.rang = [];
    }
    expect(vues).toEqual(['A1-M1', 'M1-B1', 'B1-B2', 'M3-B2', 'A2-M3', 'A1-A2', 'A1-M1']);
  });

  it('les îlots sous surveillance n’acceptent pas qu’on y recouvre un élève adverse', () => {
    const cour = courTest({ ronde: [['P', 'L']] });
    const e = situation({
      cour,
      rang: { rouge: ['grand'] },
      piles: { P: [['bleu', 'populaire']] },
    });
    expect(ciblesPossibles(e, idRang(e, 'rouge', 'grand'))).not.toContain('P');
  });

  it('on peut toujours y poser sur un îlot vide ou sur un de ses élèves', () => {
    const cour = courTest({ ronde: [['P', 'L']] });
    const vide = situation({ cour, rang: { rouge: ['grand'] } });
    expect(ciblesPossibles(vide, idRang(vide, 'rouge', 'grand'))).toContain('P');
    const sien = situation({
      cour,
      rang: { rouge: ['populaire'] },
      piles: { P: [['rouge', 'grand']] },
    });
    expect(ciblesPossibles(sien, idRang(sien, 'rouge', 'populaire'))).toContain('P');
  });

  it('aucun effet ne peut y retirer un élève', () => {
    const cour = courTest({ ronde: [['Q', 'D']] });
    const e = situation({
      cour,
      piles: { P: [['rouge', 'grand']], Q: [['bleu', 'populaire']], L: [['bleu', 'populaire']] },
    });
    const options = optionsEffet(e, {
      type: 'pouvoir',
      role: 'rapporteuse',
      ilot: 'P',
      eleveId: 'x',
    });
    expect(options).toEqual([{ type: 'cpe', ilot: 'L' }]);
  });
});
