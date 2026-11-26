import { describe, expect, it } from 'vitest';
import { jouer } from '../../src/engine/index';
import { cour1, courTest, idRang, situation } from './aide';

const regions = [
  { id: 'r1', nom: 'R1', ilots: ['P', 'L'], bonsPoints: 1 },
  { id: 'r2', nom: 'R2', ilots: ['P', 'Q'], bonsPoints: 2 },
];

describe('Bons points des régions', () => {
  it('occuper tous les îlots autour d’une région rapporte ses bons points', () => {
    const cour = courTest({ regions });
    const e = situation({ cour, rang: { rouge: ['grand'] }, piles: { P: [['rouge', 'grand']] } });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'L' });
    expect(apres.joueurs.rouge.bonsPoints).toBe(1);
    expect(apres.regionsPrises).toEqual({ r1: 'rouge' });
    expect(apres.journal).toContainEqual(
      expect.objectContaining({ type: 'region', region: 'r1', bande: 'rouge', bonsPoints: 1 }),
    );
  });

  it('une région partiellement occupée ne rapporte rien', () => {
    const cour = courTest({ regions });
    const e = situation({ cour, rang: { rouge: ['grand'] } });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'P' });
    expect(apres.joueurs.rouge.bonsPoints).toBe(0);
  });

  it('les bons points sont gardés même si on perd l’îlot ensuite', () => {
    const cour = courTest({ regions });
    const e = situation({
      cour,
      courant: 'bleu',
      rang: { bleu: ['grand'] },
      piles: {
        P: [['rouge', 'populaire']],
        L: [['rouge', 'populaire']],
        Q: [['bleu', 'grand']],
        S: [['bleu', 'grand']],
      },
      regionsPrises: { r1: 'rouge' },
      bonsPoints: { rouge: 1 },
    });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'bleu', 'grand'), cible: 'L' });
    expect(apres.joueurs.rouge.bonsPoints).toBe(1);
    expect(apres.regionsPrises.r1).toBe('rouge');
  });

  it('une région déjà prise ne rapporte plus rien', () => {
    const cour = courTest({ regions });
    const e = situation({
      cour,
      courant: 'bleu',
      rang: { bleu: ['grand'] },
      piles: {
        P: [['bleu', 'grand']],
        Q: [['bleu', 'grand']],
        S: [['bleu', 'grand']],
        L: [['rouge', 'populaire']],
      },
      regionsPrises: { r1: 'rouge', r2: 'rouge' },
      bonsPoints: { rouge: 3 },
    });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'bleu', 'grand'), cible: 'L' });
    expect(apres.joueurs.bleu.bonsPoints).toBe(0);
  });

  it('plusieurs régions peuvent être prises dans le même tour', () => {
    const cour = courTest({ regions });
    const e = situation({
      cour,
      rang: { rouge: ['grand'] },
      piles: { L: [['rouge', 'grand']], Q: [['rouge', 'grand']] },
    });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'P' });
    expect(apres.joueurs.rouge.bonsPoints).toBe(3);
    expect(apres.regionsPrises).toEqual({ r1: 'rouge', r2: 'rouge' });
  });

  it('cour n°1 : prendre le haut (2) et la gauche (1) atteint le seuil de 3', () => {
    const cour = cour1();
    const e = situation({
      cour,
      rang: { rouge: ['grand'] },
      piles: {
        A1: [['rouge', 'grand']],
        A2: [['rouge', 'grand']],
        M1: [['rouge', 'grand']],
        B1: [['rouge', 'grand']],
      },
      surveillante: 3,
    });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'M2' });
    expect(apres.joueurs.rouge.bonsPoints).toBe(3);
    expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'bonsPoints' });
  });
});
