import { describe, expect, it } from 'vitest';
import { COURS } from '../../src/data/boards/index';
import {
  actionsLegales,
  creerPartie,
  jouer,
  tirerEntier,
  type Action,
  type EtatPartie,
} from '../../src/engine/index';
import {
  courDe,
  miroirDe,
  restaurer,
  retournerAction,
  retournerEtat,
  stocker,
} from '../../src/reseau/index';

/** Compare deux états sans tenir compte de l'ordre des options d'un choix. */
function normaliser(e: EtatPartie) {
  const s = stocker(e);
  return {
    ...s,
    attente: s.attente
      ? { ...s.attente, options: s.attente.options.map((o) => JSON.stringify(o)).sort() }
      : null,
  };
}

describe('La cour retournée (DR.11)', () => {
  for (const carte of Object.keys(COURS)) {
    it(`${carte} : retourner est une symétrie du jeu, coup par coup`, () => {
      const cour = courDe(carte);
      const m = miroirDe(cour);
      for (let graine = 1; graine <= 6; graine++) {
        let e = creerPartie(cour, { graine, pouvoirsAuto: graine % 2 === 0 });
        let r = graine;
        for (let coup = 0; coup < 400 && !e.fin; coup++) {
          const retourne = restaurer(retournerEtat(stocker(e), m));
          // Retourner deux fois rend la partie d'origine.
          expect(retournerEtat(retournerEtat(stocker(e), m), m)).toEqual(stocker(e));
          const actions = actionsLegales(e);
          const [i, s] = tirerEntier(r, actions.length);
          r = s;
          const a = actions[i] as Action;
          // Le même coup, joué dans la partie retournée, donne la partie retournée.
          const suite = jouer(e, a);
          const suiteRetournee = jouer(retourne, retournerAction(a, m));
          expect(normaliser(suiteRetournee)).toEqual(
            normaliser(restaurer(retournerEtat(stocker(suite), m))),
          );
          e = suite;
        }
      }
    });
  }
});
