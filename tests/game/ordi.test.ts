import { describe, expect, it } from 'vitest';

import { Controleur } from '../../src/game/controleur';
import { niveauSuivant, Ordi } from '../../src/game/ordi';
import { cour1 } from '../engine/aide';

describe('Partie contre l’ordi', () => {
  it('les niveaux tournent : facile, moyen, difficile, facile…', () => {
    expect(niveauSuivant('facile')).toBe('moyen');
    expect(niveauSuivant('moyen')).toBe('difficile');
    expect(niveauSuivant('difficile')).toBe('facile');
  });

  it('l’ordi joue seulement à son tour et mène la partie à son terme avec le joueur', () => {
    const ctrl = new Controleur(cour1(), { graine: 12 });
    const ordi = new Ordi('bleu', 'moyen', 12);
    const joueur = new Ordi('rouge', 'facile', 99);
    expect(ordi.humain).toBe('rouge');
    let n = 0;
    while (ctrl.phase !== 'fin' && n++ < 2000) {
      if (ctrl.phase === 'passe') ctrl.reprendre();
      const qui = ordi.doitJouer(ctrl.etat) ? ordi : joueur;
      expect(qui.doitJouer(ctrl.etat)).toBe(true);
      expect(ctrl.jouer(qui.prochaineAction(ctrl.etat))).toBe(true);
    }
    expect(ctrl.etat.fin).not.toBeNull();
    expect(ordi.doitJouer(ctrl.etat)).toBe(false);
  });
});
