/**
 * Ce que le jeu demande au serveur de parties en ligne. L'écran ne parle qu'à cette interface :
 * derrière, il y a Supabase (en vrai) ou `SalleMemoire` (tests, développement sans réseau).
 */
import type { EquipeId } from '../data/equipes';
import { ouvrirPartie, rejoindrePartie, traiter, verifierTemps, vuePour } from './arbitre';
import { DUREE_INVITATION, validerPseudo } from './amis';
import { nouveauCode, normaliserCode } from './codes';
import {
  Refus,
  type Ami,
  type Demande,
  type Invitation,
  type Profil,
  type PartieServeur,
  type ReglagesEnLigne,
  type VueJoueur,
} from './protocole';

export interface ServeurParties {
  /**
   * Ouvre une partie et rend sa vue (avec le code à partager). Avec `ami`, la partie est aussi
   * proposée à cet ami de la liste (il la voit dans ses invitations).
   */
  ouvrir(reglages: Partial<ReglagesEnLigne>, ami?: string): Promise<VueJoueur>;
  /** Rejoint la partie d'un ami par son code, avec sa bande : elle commence aussitôt. */
  rejoindre(code: string, equipe?: EquipeId): Promise<VueJoueur>;
  /** Envoie un coup, un abandon ou une réclamation ; rend la vue à jour. */
  envoyer(partieId: string, demande: Demande): Promise<VueJoueur>;
  /** Relit la partie (après une coupure, ou en ouvrant l'appli). */
  lire(partieId: string): Promise<VueJoueur>;
  /** Prévient à chaque changement de la partie. Rend la fonction qui arrête le suivi. */
  suivre(partieId: string, rappel: (vue: VueJoueur) => void): () => void;
  /** Les parties pas encore finies de ce joueur (pour les reprendre). */
  mesParties(): Promise<VueJoueur[]>;
  /** Le profil de ce joueur, ou `null` s'il n'a pas encore choisi de pseudo. */
  profil(): Promise<Profil | null>;
  /** Choisit (ou change) son pseudo ; le code ami est tiré la première fois. */
  nommer(pseudo: string): Promise<Profil>;
  /** La liste d'amis, par ordre alphabétique. */
  amis(): Promise<Ami[]>;
  /** Devient ami avec le joueur de ce code ami (dans les deux sens). */
  ajouterAmi(codeAmi: string): Promise<Ami>;
  /** Les parties qu'un ami a ouvertes pour ce joueur, et qui l'attendent encore. */
  invitations(): Promise<Invitation[]>;
  /** Prévient quand une invitation arrive ou disparaît. Rend la fonction qui arrête le suivi. */
  suivreInvitations(rappel: () => void): () => void;
}

/**
 * Un serveur en mémoire, qui applique exactement l'arbitre du vrai serveur. Plusieurs comptes
 * peuvent s'y connecter (`client`) pour simuler deux téléphones.
 */
export class SalleMemoire {
  private parties = new Map<string, PartieServeur>();
  private abonnes = new Map<string, Set<() => void>>();
  private compteur = 0;
  private profils = new Map<string, Profil>();
  /** compte → ses amis. */
  private liens = new Map<string, Set<string>>();
  private invites = new Map<string, Invitation & { pour: string }>();
  private guetteurs = new Set<() => void>();

  constructor(
    private horloge: () => number = () => Date.now(),
    private hasard: () => number = () => Math.floor(Math.random() * 4294967296),
  ) {}

  private enregistrer(p: PartieServeur): void {
    this.parties.set(p.id, p);
    // Une invitation ne vaut que tant que la partie attend.
    if (p.statut !== 'attente' && this.invites.delete(p.id)) this.prevenirInvitations();
    for (const prevenir of this.abonnes.get(p.id) ?? []) prevenir();
  }

  private trouver(id: string): PartieServeur {
    const p = this.parties.get(id);
    if (!p) throw new Refus('partie_introuvable');
    return p;
  }

  private prevenirInvitations(): void {
    for (const g of this.guetteurs) g();
  }

  private lier(a: string, b: string): void {
    if (a === b || !this.profils.has(a) || !this.profils.has(b)) return;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      let set = this.liens.get(x);
      if (!set) this.liens.set(x, (set = new Set()));
      set.add(y);
    }
  }

  /** Comme la tâche de fond du serveur : clôt les tours dont le temps est écoulé. */
  verifierTemps(): void {
    for (const p of this.parties.values()) {
      const q = verifierTemps(p, this.horloge());
      if (q !== p) this.enregistrer(q);
    }
  }

  /** Pour les tests : l'état complet, non masqué. */
  partie(id: string): PartieServeur {
    return this.trouver(id);
  }

  client(compte: string): ServeurParties {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- les méthodes rendues s'en servent
    const salle = this;
    return {
      async ouvrir(reglages, ami) {
        if (ami !== undefined && !salle.liens.get(compte)?.has(ami)) {
          throw new Refus('pas_ami', 'Ce joueur n’est pas dans tes amis.');
        }
        let code: string;
        do code = nouveauCode(salle.hasard);
        while ([...salle.parties.values()].some((p) => p.code === code && p.statut === 'attente'));
        const moi = salle.profils.get(compte);
        const p = ouvrirPartie(
          `p${++salle.compteur}`,
          code,
          compte,
          reglages,
          salle.horloge(),
          moi?.pseudo,
        );
        salle.enregistrer(p);
        if (ami !== undefined && moi) {
          salle.invites.set(p.id, {
            partieId: p.id,
            code,
            de: compte,
            pseudo: moi.pseudo,
            carte: p.reglages.carte,
            creeLe: salle.horloge(),
            pour: ami,
          });
          salle.prevenirInvitations();
        }
        return vuePour(p, compte);
      },
      async rejoindre(saisie, equipe) {
        const code = normaliserCode(saisie);
        const p = [...salle.parties.values()].find(
          (q) => q.code === code && q.statut === 'attente',
        );
        if (!p) throw new Refus('partie_introuvable', 'Aucune partie n’attend avec ce code.');
        const q = rejoindrePartie(
          p,
          compte,
          salle.hasard(),
          salle.horloge(),
          equipe,
          salle.profils.get(compte)?.pseudo,
        );
        salle.enregistrer(q);
        // Avoir joué ensemble suffit pour devenir amis.
        if (q.joueurs.rouge) salle.lier(q.joueurs.rouge, compte);
        return vuePour(q, compte);
      },
      async envoyer(id, demande) {
        const q = traiter(salle.trouver(id), compte, demande, salle.horloge());
        salle.enregistrer(q);
        return vuePour(q, compte);
      },
      async lire(id) {
        return vuePour(salle.trouver(id), compte);
      },
      suivre(id, rappel) {
        const prevenir = () => rappel(vuePour(salle.trouver(id), compte));
        let set = salle.abonnes.get(id);
        if (!set) salle.abonnes.set(id, (set = new Set()));
        set.add(prevenir);
        return () => set.delete(prevenir);
      },
      async mesParties() {
        return [...salle.parties.values()]
          .filter(
            (p) =>
              p.statut !== 'finie' && (p.joueurs.rouge === compte || p.joueurs.bleu === compte),
          )
          .map((p) => vuePour(p, compte));
      },
      async profil() {
        return salle.profils.get(compte) ?? null;
      },
      async nommer(saisie) {
        const pseudo = validerPseudo(saisie);
        const avant = salle.profils.get(compte);
        let codeAmi = avant?.codeAmi;
        while (
          !codeAmi ||
          [...salle.profils.values()].some((x) => x.id !== compte && x.codeAmi === codeAmi)
        ) {
          codeAmi = nouveauCode(salle.hasard);
        }
        const profil = { id: compte, pseudo, codeAmi };
        salle.profils.set(compte, profil);
        return profil;
      },
      async amis() {
        return [...(salle.liens.get(compte) ?? [])]
          .map((id) => salle.profils.get(id))
          .filter((x): x is Profil => x !== undefined)
          .sort((a, b) => a.pseudo.localeCompare(b.pseudo, 'fr'));
      },
      async ajouterAmi(saisie) {
        if (!salle.profils.has(compte))
          throw new Refus('pseudo_invalide', 'Choisis d’abord ton pseudo.');
        const code = normaliserCode(saisie);
        const ami = [...salle.profils.values()].find((x) => x.codeAmi === code);
        if (!ami) throw new Refus('ami_introuvable', 'Aucun joueur n’a ce code ami.');
        if (ami.id === compte) throw new Refus('soi_meme', 'C’est ton propre code !');
        salle.lier(compte, ami.id);
        return ami;
      },
      async invitations() {
        const limite = salle.horloge() - DUREE_INVITATION;
        return [...salle.invites.values()]
          .filter((i) => i.pour === compte && i.creeLe >= limite)
          .map((i) => ({
            partieId: i.partieId,
            code: i.code,
            de: i.de,
            pseudo: i.pseudo,
            carte: i.carte,
            creeLe: i.creeLe,
          }));
      },
      suivreInvitations(rappel) {
        salle.guetteurs.add(rappel);
        return () => salle.guetteurs.delete(rappel);
      },
    };
  }
}
