import { describe, expect, it } from 'vitest';
import {
  actionsLegales,
  clonerEtat,
  creerPartie,
  jouer,
  type EtatPartie,
} from '../../src/engine/index';
import { verifierInvariants } from '../../src/engine/simulation';
import {
  arene,
  choisirAction,
  coupsDuTour,
  determiniser,
  menaceCabane,
  NIVEAUX,
  partieIA,
  passerPermis,
} from '../../src/ia/index';
import { cour1, courTest, idRang, situation } from '../engine/aide';

/** Une partie avancée de quelques coups, jouée par l'IA moyenne. */
function partieEnCours(graine: number, actions = 12): EtatPartie {
  let e = creerPartie(cour1(), { graine });
  let r = graine;
  for (let i = 0; i < actions && !e.fin; i++) {
    const [a, s] = choisirAction(e, 'moyen', r);
    r = s;
    e = jouer(e, a);
  }
  return e;
}

describe('Tours complets', () => {
  it('chaque tour énuméré se rejoue avec des actions légales et rend la main (ou finit)', () => {
    const e = partieEnCours(3, 6);
    const coups = coupsDuTour(e);
    expect(coups.length).toBeGreaterThan(1);
    for (const c of coups) {
      let x = e;
      for (const a of c.actions) {
        expect(actionsLegales(x)).toContainEqual(a);
        x = jouer(x, a);
      }
      expect(x.fin !== null || x.courant !== e.courant).toBe(true);
    }
  });

  it('« Passer » seulement pour le mot d’excuse du Délégué, comme à l’écran', () => {
    const e = situation({
      cour: cour1(),
      rang: { rouge: ['rapporteuse', 'delegue'] },
      piles: { B1: [['rouge', 'grand']], M2: [['bleu', 'populaire']] },
    });
    const apresRapporteuse = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'rapporteuse'),
      cible: 'B2',
    });
    expect(apresRapporteuse.attente?.effet).toMatchObject({ role: 'rapporteuse' });
    expect(passerPermis(apresRapporteuse)).toBe(false);
    for (const c of coupsDuTour(apresRapporteuse)) {
      expect(c.actions.some((a) => a.type === 'passer')).toBe(false);
    }
    const apresDelegue = jouer(e, {
      type: 'envoyer',
      eleveId: idRang(e, 'rouge', 'delegue'),
      cible: 'B2',
    });
    expect(apresDelegue.attente?.effet).toMatchObject({ role: 'delegue' });
    expect(passerPermis(apresDelegue)).toBe(true);
  });
});

describe('L’IA ne triche pas', () => {
  it('un monde possible garde tout ce qui est public et reste une partie valide', () => {
    const e = partieEnCours(5);
    const vue = e.courant;
    const [d] = determiniser(e, vue, 99);
    verifierInvariants(d);
    expect(d.piles).toEqual(e.piles);
    expect(d.joueurs[vue].rang).toEqual(e.joueurs[vue].rang);
    for (const b of ['rouge', 'bleu'] as const) {
      expect(d.joueurs[b].rang.length).toBe(e.joueurs[b].rang.length);
      expect(d.joueurs[b].couloir.length).toBe(e.joueurs[b].couloir.length);
      expect(d.joueurs[b].cpe).toEqual(e.joueurs[b].cpe);
    }
  });

  it('cartes cachées échangées : même décision', () => {
    for (const graine of [1, 2, 3, 4]) {
      const e = partieEnCours(graine, 8);
      if (e.fin || e.attente) continue;
      const adv = e.courant === 'rouge' ? 'bleu' : 'rouge';
      // On échange le rang adverse avec le début de son couloir : rien de visible ne change.
      const f = clonerEtat(e);
      const j = f.joueurs[adv];
      const n = Math.min(j.rang.length, j.couloir.length);
      const rang = j.rang.slice();
      j.rang = [...j.couloir.slice(0, n), ...rang.slice(n)];
      j.couloir = [...rang.slice(0, n), ...j.couloir.slice(n)];
      j.infirmerie = [];
      e.joueurs[adv].infirmerie = [];
      expect(choisirAction(f, 'difficile', 7)[0]).toEqual(choisirAction(e, 'difficile', 7)[0]);
    }
  });
});

describe('Bons réflexes', () => {
  it('pose sur la cabane adverse dès que c’est possible', () => {
    const e = situation({
      rang: { rouge: ['petit', 'populaire', 'grand'] },
      piles: { P: [['rouge', 'grand']], Q: [['rouge', 'grand']], S: [['rouge', 'grand']] },
    });
    for (const niveau of ['moyen', 'difficile'] as const) {
      const [a] = choisirAction(e, niveau, 1);
      expect(a).toMatchObject({ type: 'envoyer', cible: 'CabB' });
    }
  });

  it('coupe le chemin adverse vers sa cabane', () => {
    const e = situation({
      rang: { rouge: ['grand', 'grand'], bleu: ['grand'] },
      piles: {
        S: [['bleu', 'populaire']],
        Q: [['bleu', 'populaire']],
        P: [['bleu', 'populaire']],
      },
    });
    expect(menaceCabane(e, 'bleu')).toBe(true);
    for (const niveau of ['moyen', 'difficile'] as const) {
      let x = e;
      let r = 1;
      while (x.courant === 'rouge' && !x.fin) {
        const [a, s] = choisirAction(x, niveau, r);
        r = s;
        x = jouer(x, a);
      }
      expect(menaceCabane(x, 'bleu')).toBe(false);
    }
  });
});

describe('Arène', () => {
  it('des parties entières sans erreur, et le niveau difficile bat le hasard', () => {
    const b = arene(cour1(), 'difficile', 'hasard', 6, 11);
    expect(b.erreurs).toEqual([]);
    expect(b.victoiresA).toBeGreaterThanOrEqual(5);
  });

  it('marche sur une autre cour, sans rien régler (cour de test avec ronde)', () => {
    const cour = courTest({
      regions: [
        { id: 'haut', nom: 'Haut', ilots: ['S', 'X'], bonsPoints: 1 },
        { id: 'cote', nom: 'Côté', ilots: ['Y', 'Z'], bonsPoints: 1 },
        { id: 'centre', nom: 'Centre', ilots: ['Q', 'L'], bonsPoints: 1 },
      ],
      ronde: ['haut', 'cote', 'centre'],
      seuil: 2,
      equipementQ: 'toboggan',
    });
    for (let g = 1; g <= 4; g++) {
      const p = partieIA(cour, g, { rouge: 'difficile', bleu: NIVEAUX.facile });
      expect(['cabane', 'bonsPoints', 'sonnerie']).toContain(p.raison);
    }
  });
});
