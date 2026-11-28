import { describe, expect, it } from 'vitest';

import { COURS } from '../../src/data/boards/index';
import { chargerCour, jouer, type CourData, type EtatPartie } from '../../src/engine/index';
import { ciblesTuto, coupOrdiTuto, etatLecon, guideTuto, NB_LECONS } from '../../src/game/tuto';

const cour = chargerCour(COURS['cour-premier-jour'] as CourData);

/** Joue une leçon en suivant le guide à la lettre ; l'ordi joue son coup de tuto. */
function suivreLeGuide(lecon: number): { etat: EtatPartie; coups: number } {
  let e = etatLecon(cour, lecon);
  let coups = 0;
  while (!e.fin && coups < 30) {
    if (e.courant === 'bleu') {
      e = jouer(e, coupOrdiTuto(e));
      continue;
    }
    const g = guideTuto(e, lecon).geste;
    expect(g.type).not.toBe('regarder');
    if (g.type === 'appeler') e = jouer(e, { type: 'appeler' });
    else if (g.type === 'glisser') {
      expect(ciblesTuto(e, lecon, g.eleveId)).toContain(g.vers);
      e = jouer(e, { type: 'envoyer', eleveId: g.eleveId, cible: g.vers });
    }
    expect(e.attente).toBeNull();
    coups++;
  }
  return { etat: e, coups };
}

describe('Tutoriel jouable', () => {
  it('chaque bande garde ses 24 élèves, sans doublon', () => {
    for (let l = 0; l < NB_LECONS; l++) {
      const e = etatLecon(cour, l);
      for (const b of ['rouge', 'bleu'] as const) {
        const j = e.joueurs[b];
        const ids = [
          ...j.rang,
          ...j.couloir,
          ...j.absents,
          ...Object.values(e.piles)
            .flat()
            .filter((el) => el.bande === b),
        ].map((el) => el.id);
        expect(ids).toHaveLength(24);
        expect(new Set(ids).size).toBe(24);
      }
      expect(e.courant).toBe('rouge');
    }
  });

  it('leçon 1 : on fonce et on prend la cabane en appelant une fois des copains', () => {
    const { etat, coups } = suivreLeGuide(0);
    expect(etat.fin).toEqual({ gagnant: 'rouge', raison: 'cabane' });
    expect(coups).toBe(5);
    expect(etat.journal.filter((ev) => ev.type === 'appel' && ev.bande === 'rouge')).toHaveLength(
      1,
    );
    // L'ordi n'a jamais posé personne.
    expect(etat.journal.some((ev) => ev.type === 'pose' && ev.bande === 'bleu')).toBe(false);
  });

  it('leçon 2 : seul le plaquage de la Fouine est permis, puis la cabane', () => {
    const depart = etatLecon(cour, 1);
    const [grand, populaire] = depart.joueurs.rouge.rang.map((el) => el.id);
    expect(ciblesTuto(depart, 1, grand ?? '')).toEqual(['A1']);
    expect(ciblesTuto(depart, 1, populaire ?? '')).toEqual([]);
    const { etat, coups } = suivreLeGuide(1);
    expect(etat.journal.some((ev) => ev.type === 'pose' && ev.plaque === 'fouine')).toBe(true);
    expect(etat.fin).toEqual({ gagnant: 'rouge', raison: 'cabane' });
    expect(coups).toBe(2);
  });

  it('leçon 3 : le goûter gardé est ramassé dès que le surveillant s’en va', () => {
    const { etat, coups } = suivreLeGuide(2);
    expect(coups).toBe(1);
    expect(etat.regionsPrises).toEqual({ droite: 'rouge' });
    expect(etat.fin).toEqual({ gagnant: 'rouge', raison: 'bonsPoints' });
  });
});
