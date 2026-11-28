import { describe, expect, it } from 'vitest';
import { actionsLegales, type Action } from '../../src/engine/index';
import { ControleurEnLigne } from '../../src/game/enLigne/controleurEnLigne';
import { courDe, restaurer, SalleMemoire, type VueJoueur } from '../../src/reseau/index';

const attendre = () => new Promise((r) => setTimeout(r, 0));

async function deuxTelephones() {
  const salle = new SalleMemoire();
  const hote = salle.client('alice');
  const ami = salle.client('bob');
  const v = await hote.ouvrir({});
  const w = await ami.rejoindre(v.code);
  const ctrl = new ControleurEnLigne(courDe(w.reglages.carte), hote, await hote.lire(v.id));
  const animes: boolean[] = [];
  ctrl.surChangement = (appliquer, animer) => {
    appliquer();
    animes.push(animer);
  };
  hote.suivre(v.id, (x) => ctrl.recevoir(x));
  return { salle, ami, ctrl, id: v.id, animes };
}

async function faireJouerAmi(
  ami: ReturnType<SalleMemoire['client']>,
  id: string,
  choix: (a: Action[]) => Action,
) {
  const v: VueJoueur = await ami.lire(id);
  if (!v.etat) throw new Error('pas commencée');
  await ami.envoyer(id, {
    type: 'jouer',
    action: choix(actionsLegales(restaurer(v.etat))),
    version: v.version,
  });
}

describe('Contrôleur en ligne', () => {
  it('joue ses coups, reçoit ceux de l’ami, et reste aligné sur le serveur', async () => {
    const { salle, ami, ctrl, id } = await deuxTelephones();
    for (let i = 0; i < 30 && ctrl.phase === 'jeu'; i++) {
      if (ctrl.tourAdverse) {
        await faireJouerAmi(
          ami,
          id,
          (a) => a.find((x) => x.type === 'envoyer') ?? (a[0] as Action),
        );
      } else {
        const a = actionsLegales(ctrl.etat);
        ctrl.jouer(a.find((x) => x.type === 'envoyer') ?? (a[0] as Action));
      }
      await attendre();
      expect(ctrl.envoi).toBe(false);
      expect(ctrl.vue.version).toBe(salle.partie(id).version);
      expect(ctrl.etat.journal).toEqual(salle.partie(id).etat?.journal);
    }
  });

  it('montre d’avance un coup sans pioche, et attend le serveur pour un appel', async () => {
    const { ami, ctrl, id, animes } = await deuxTelephones();
    // Le premier coup de l’ami peut demander une suite (un choix de pouvoir) : il joue jusqu’à
    // nous rendre la main.
    for (let i = 0; i < 10 && ctrl.tourAdverse; i++) {
      await faireJouerAmi(ami, id, (a) => a.find((x) => x.type === 'envoyer') ?? (a[0] as Action));
      await attendre();
    }
    expect(ctrl.tourAdverse).toBe(false);
    animes.length = 0;
    expect(ctrl.jouer({ type: 'appeler' })).toBe(false);
    await attendre();
    expect(animes).toEqual([true]);
  });

  it('refuse de jouer pendant le tour de l’ami', async () => {
    const { ami, ctrl, id } = await deuxTelephones();
    if (!ctrl.tourAdverse) {
      ctrl.jouer({ type: 'appeler' });
      await attendre();
    }
    expect(ctrl.tourAdverse).toBe(true);
    expect(ctrl.jouer({ type: 'appeler' })).toBe(false);
    expect(ctrl.envoi).toBe(false);
    void ami;
    void id;
  });

  it('finit la partie quand l’ami abandonne', async () => {
    const { ami, ctrl, id } = await deuxTelephones();
    await ami.envoyer(id, { type: 'abandonner' });
    await attendre();
    expect(ctrl.phase).toBe('fin');
    expect(ctrl.issue).toEqual({ gagnant: 'rouge', raison: 'abandon' });
  });
});
