import { describe, expect, it } from 'vitest';
import { actionsLegales, tirerEntier, type Action } from '../../src/engine/index';
import {
  ALPHABET_CODE,
  estCache,
  normaliserCode,
  nouveauCode,
  Refus,
  restaurer,
  SalleMemoire,
  type EtatStocke,
  type ServeurParties,
  type VueJoueur,
} from '../../src/reseau/index';

/** Une salle à l'heure réglable, et deux téléphones dedans. */
function salle(graine = 1) {
  let maintenant = 1_000_000;
  let r = graine;
  const s = new SalleMemoire(
    () => maintenant,
    () => {
      const [v, suivant] = tirerEntier(r, 4294967296);
      r = suivant;
      return v;
    },
  );
  return {
    s,
    hote: s.client('alice'),
    ami: s.client('bob'),
    avancer: (ms: number) => (maintenant += ms),
  };
}

function etatDe(v: { etat: EtatStocke | null }): EtatStocke {
  if (!v.etat) throw new Error('pas d’état');
  return v.etat;
}

async function refus(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof Refus) return e.code;
    throw e;
  }
  throw new Error('aucun refus');
}

/** Un coup légal choisi au hasard, calculé seulement à partir de ce que le joueur voit. */
function coupAuHasard(vue: VueJoueur, n: number): Action {
  const actions = actionsLegales(restaurer(etatDe(vue)));
  return actions[n % actions.length] as Action;
}

describe('Partie en ligne : déroulé', () => {
  it('l’hôte ouvre, l’ami rejoint avec le code, la partie commence', async () => {
    const { hote, ami } = salle();
    const v = await hote.ouvrir({ carte: 'piscine' });
    expect(v.statut).toBe('attente');
    expect(v.bande).toBe('rouge');
    expect(v.etat).toBeNull();
    expect(v.code).toMatch(new RegExp(`^[${ALPHABET_CODE}]{6}$`));
    const w = await ami.rejoindre(v.code.toLowerCase());
    expect(w.statut).toBe('en_cours');
    expect(w.bande).toBe('bleu');
    expect(w.adversairePresent).toBe(true);
    expect(w.etat?.courId).toBe('piscine');
    expect((await hote.lire(v.id)).adversairePresent).toBe(true);
  });

  it('se joue jusqu’au bout, chaque téléphone ne calculant ses coups que sur sa vue', async () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const { hote, ami } = salle(graine);
      const tel: Record<string, ServeurParties> = { rouge: hote, bleu: ami };
      const v = await hote.ouvrir({ carte: graine % 2 ? 'cour-premier-jour' : 'camp-scout' });
      await ami.rejoindre(v.code);
      let coups = 0;
      for (;;) {
        const vueR = await hote.lire(v.id);
        if (vueR.statut === 'finie') {
          expect(vueR.issue).not.toBeNull();
          break;
        }
        const courant = etatDe(vueR).courant;
        const t = tel[courant] as ServeurParties;
        const vue = await t.lire(v.id);
        await t.envoyer(v.id, {
          type: 'jouer',
          action: coupAuHasard(vue, coups * 7 + graine),
          version: vue.version,
        });
        coups++;
        expect(coups).toBeLessThan(2000);
      }
    }
  });

  it('prévient les deux téléphones à chaque coup', async () => {
    const { hote, ami } = salle();
    const v = await hote.ouvrir({});
    const vus: string[] = [];
    hote.suivre(v.id, (x) => vus.push(`rouge:${x.version}`));
    await ami.rejoindre(v.code);
    const arret = ami.suivre(v.id, (x) => vus.push(`bleu:${x.version}`));
    const vue = await hote.lire(v.id);
    const t = etatDe(vue).courant === 'rouge' ? hote : ami;
    await t.envoyer(v.id, { type: 'jouer', action: { type: 'appeler' }, version: vue.version });
    arret();
    expect(vus).toEqual(['rouge:1', 'rouge:2', 'bleu:2']);
  });
});

describe('Partie en ligne : ce que chacun voit', () => {
  it('cache la main adverse, les pioches, les absents et le hasard', async () => {
    const { s, hote, ami } = salle();
    const v = await hote.ouvrir({});
    const vueBleu = await ami.rejoindre(v.code);
    const vrai = etatDe(s.partie(v.id));
    const etat = etatDe(vueBleu);
    expect(etat.rng).toBe(0);
    expect(etat.joueurs.bleu.rang).toEqual(vrai.joueurs.bleu.rang);
    expect(etat.joueurs.rouge.rang).toHaveLength(vrai.joueurs.rouge.rang.length);
    for (const b of ['rouge', 'bleu'] as const) {
      expect(etat.joueurs[b].couloir.every(estCache)).toBe(true);
      expect(etat.joueurs[b].absents.every(estCache)).toBe(true);
      expect(etat.joueurs[b].couloir).toHaveLength(vrai.joueurs[b].couloir.length);
    }
    expect(etat.joueurs.rouge.rang.every(estCache)).toBe(true);
    // Rien de ce qui est caché ne passe dans la vue, même par un détour.
    const texte = JSON.stringify(vueBleu);
    const caches = [
      ...vrai.joueurs.rouge.rang,
      ...vrai.joueurs.rouge.couloir,
      ...vrai.joueurs.rouge.absents,
      ...vrai.joueurs.bleu.couloir,
      ...vrai.joueurs.bleu.absents,
    ];
    for (const el of caches) expect(texte).not.toContain(`"${el.id}"`);
  });

  it('montre tout une fois la partie finie', async () => {
    const { s, hote, ami } = salle();
    const v = await hote.ouvrir({});
    await ami.rejoindre(v.code);
    await hote.envoyer(v.id, { type: 'abandonner' });
    const fin = await ami.lire(v.id);
    expect(etatDe(fin).joueurs.rouge.rang).toEqual(etatDe(s.partie(v.id)).joueurs.rouge.rang);
  });
});

describe('Partie en ligne : refus', () => {
  it('refuse les coups hors de son tour, périmés ou illégaux, et les intrus', async () => {
    const { s, hote, ami } = salle();
    const v = await hote.ouvrir({});
    await ami.rejoindre(v.code);
    const vue = await hote.lire(v.id);
    const [joueur, autre] = etatDe(vue).courant === 'rouge' ? [hote, ami] : [ami, hote];
    const appel = {
      type: 'jouer' as const,
      action: { type: 'appeler' as const },
      version: vue.version,
    };
    expect(await refus(autre.envoyer(v.id, appel))).toBe('pas_ton_tour');
    expect(await refus(joueur.envoyer(v.id, { ...appel, version: 0 }))).toBe('version_perimee');
    expect(
      await refus(
        joueur.envoyer(v.id, {
          type: 'jouer',
          action: { type: 'envoyer', eleveId: 'rouge-grand-1', cible: 'nulle-part' },
          version: vue.version,
        }),
      ),
    ).toBe('coup_illegal');
    expect(await refus(s.client('eve').lire(v.id))).toBe('pas_joueur');
    expect(await refus(s.client('eve').rejoindre(v.code))).toBe('partie_introuvable');
    await joueur.envoyer(v.id, appel);
    // Le même coup renvoyé deux fois (double toucher, réseau qui répète) ne passe qu'une fois.
    expect(await refus(joueur.envoyer(v.id, appel))).toMatch(/pas_ton_tour|version_perimee/);
  });

  it('ne laisse pas l’hôte rejoindre sa propre partie, ni des réglages faux', async () => {
    const { hote } = salle();
    const v = await hote.ouvrir({});
    expect(await refus(hote.rejoindre(v.code))).toBe('deja_dedans');
    expect(await refus(hote.ouvrir({ carte: 'lune' }))).toBe('reglages_invalides');
    expect(await refus(hote.ouvrir({ delaiTour: 1 }))).toBe('reglages_invalides');
  });
});

describe('Partie en ligne : temps, abandon, reprise', () => {
  it('le tour qui dépasse son temps est perdu, à la réclamation ou par la tâche de fond', async () => {
    for (const parReclamation of [true, false]) {
      const { s, hote, ami, avancer } = salle();
      const v = await hote.ouvrir({ delaiTour: 60 });
      await ami.rejoindre(v.code);
      const courant = etatDe(await hote.lire(v.id)).courant;
      const attendant = courant === 'rouge' ? ami : hote;
      expect(await refus(attendant.envoyer(v.id, { type: 'reclamer' }))).toBe('pas_encore');
      avancer(61_000);
      if (parReclamation) await attendant.envoyer(v.id, { type: 'reclamer' });
      else s.verifierTemps();
      const fin = await attendant.lire(v.id);
      expect(fin.statut).toBe('finie');
      expect(fin.issue).toEqual({ gagnant: fin.bande, raison: 'temps' });
    }
  });

  it('le temps repart à chaque tour', async () => {
    const { hote, ami, avancer } = salle();
    const v = await hote.ouvrir({ delaiTour: 60 });
    await ami.rejoindre(v.code);
    const vue = await hote.lire(v.id);
    const t = etatDe(vue).courant === 'rouge' ? hote : ami;
    avancer(50_000);
    const apres = await t.envoyer(v.id, {
      type: 'jouer',
      action: { type: 'appeler' },
      version: vue.version,
    });
    expect(apres.echeance).toBe(Number(vue.echeance) + 50_000);
  });

  it('abandonner donne la victoire à l’autre ; avant son arrivée, ferme la partie', async () => {
    const { hote, ami } = salle();
    const v = await hote.ouvrir({});
    await ami.rejoindre(v.code);
    const fin = await ami.envoyer(v.id, { type: 'abandonner' });
    expect(fin.issue).toEqual({ gagnant: 'rouge', raison: 'abandon' });
    const w = await hote.ouvrir({});
    const ferme = await hote.envoyer(w.id, { type: 'abandonner' });
    expect(ferme.statut).toBe('finie');
    expect(ferme.issue).toBeNull();
  });

  it('retrouve ses parties en cours après une coupure', async () => {
    const { s, hote, ami } = salle();
    const v = await hote.ouvrir({});
    await ami.rejoindre(v.code);
    const reprises = await s.client('bob').mesParties();
    expect(reprises.map((x) => x.id)).toEqual([v.id]);
    await hote.envoyer(v.id, { type: 'abandonner' });
    expect(await s.client('bob').mesParties()).toEqual([]);
  });
});

describe('Codes d’invitation', () => {
  it('sont lisibles et se tapent sans souci de casse ni d’espaces', () => {
    let i = 0;
    const code = nouveauCode(() => i++ * 7);
    expect(code).toHaveLength(6);
    expect(normaliserCode(` ${code.slice(0, 3).toLowerCase()}-${code.slice(3)} `)).toBe(code);
    expect(normaliserCode('ABC')).toBeNull();
    expect(normaliserCode('ABCDE0')).toBeNull();
    expect(ALPHABET_CODE).not.toMatch(/[ILOQUW0-9]/);
  });
});
