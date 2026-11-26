import { describe, expect, it } from 'vitest';
import {
  ActionIllegale,
  actionsLegales,
  jouer,
  type Bande,
  type RoleId,
} from '../../src/engine/index';
import { courTest, idRang, situation } from './aide';

const cheminRouge: Record<string, [Bande, RoleId][]> = {
  P: [['rouge', 'grand']],
  Q: [['rouge', 'grand']],
  S: [['rouge', 'grand']],
};

describe('Fin de partie', () => {
  it('un élève posé sur la cabane adverse gagne immédiatement', () => {
    const e = situation({
      rang: { rouge: ['grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    const apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'grand'),
      cible: 'CabB',
    });
    expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'cabane' });
    expect(apres.journal.at(-1)).toMatchObject({ type: 'fin', gagnant: 'rouge', raison: 'cabane' });
  });

  it('la victoire sur la cabane est immédiate : le pouvoir de l’élève n’est pas appliqué', () => {
    const e = situation({
      rang: { rouge: ['populaire'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    const apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'populaire'),
      cible: 'CabB',
    });
    expect(apres.fin?.gagnant).toBe('rouge');
    expect(apres.attente).toBeNull();
  });

  it('atteindre le seuil de bons points gagne immédiatement', () => {
    const cour = courTest({
      regions: [{ id: 'r', nom: 'R', ilots: ['P'], bonsPoints: 2 }],
      seuil: 3,
    });
    const e = situation({ cour, rang: { rouge: ['grand'] }, bonsPoints: { rouge: 1 } });
    const apres = jouer(e, { type: 'envoyer', eleveId: idRang(e, 'rouge', 'grand'), cible: 'P' });
    expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'bonsPoints' });
  });

  it('après la fin, plus aucune action n’est possible', () => {
    const e = situation({ rang: { rouge: ['grand'] }, piles: cheminRouge });
    const apres = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'grand'),
      cible: 'CabB',
    });
    expect(actionsLegales(apres)).toEqual([]);
    expect(() => jouer(apres, { type: 'appeler' })).toThrow(ActionIllegale);
  });

  describe('La sonnerie', () => {
    // Bleu commence son tour sans couloir ni rang : il ne peut ni piocher ni poser.
    const bloque = (points: { rouge: number; bleu: number }) =>
      situation({ couloir: { bleu: [] }, rang: { bleu: [] }, bonsPoints: points });

    it('retentit quand le joueur ne peut ni piocher ni poser : le plus de bons points gagne', () => {
      const apres = jouer(bloque({ rouge: 0, bleu: 2 }), { type: 'appeler' });
      expect(apres.fin).toEqual({ gagnant: 'bleu', raison: 'sonnerie' });
    });

    it('le joueur bloqué perd s’il a moins de bons points', () => {
      const apres = jouer(bloque({ rouge: 2, bleu: 1 }), { type: 'appeler' });
      expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'sonnerie' });
    });

    it('en cas d’égalité, celui qui a bloqué la partie perd', () => {
      const apres = jouer(bloque({ rouge: 1, bleu: 1 }), { type: 'appeler' });
      expect(apres.fin).toEqual({ gagnant: 'rouge', raison: 'sonnerie' });
    });

    it('ne retentit pas si le joueur peut encore poser', () => {
      const e = situation({ couloir: { bleu: [] }, rang: { bleu: ['grand'] } });
      expect(jouer(e, { type: 'appeler' }).fin).toBeNull();
    });

    it('ne retentit pas si le joueur peut encore piocher', () => {
      const e = situation({ rang: { bleu: [] } });
      expect(jouer(e, { type: 'appeler' }).fin).toBeNull();
    });

    it('retentit si le rang est plein mais qu’aucune pose n’est possible', () => {
      // Le rang bleu ne contient que des jokers et S (seul îlot relié) porte un élève rouge
      // sous surveillance : aucune pose, aucune pioche.
      const cour = courTest({ ronde: [['S', 'X']] });
      const e = situation({
        cour,
        rang: { bleu: Array(8).fill('petit') },
        piles: { S: [['rouge', 'grand']] },
      });
      const apres = jouer(e, { type: 'appeler' });
      expect(apres.fin?.raison).toBe('sonnerie');
    });
  });
});
