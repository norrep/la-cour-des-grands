/**
 * Ce que le jeu demande au serveur de parties en ligne. L'écran ne parle qu'à cette interface :
 * derrière, il y a Supabase (en vrai) ou `SalleMemoire` (tests, développement sans réseau).
 */
import type { EquipeId } from '../data/equipes';
import { ouvrirPartie, rejoindrePartie, traiter, verifierTemps, vuePour } from './arbitre';
import { nouveauCode, normaliserCode } from './codes';
import {
  Refus,
  type Demande,
  type PartieServeur,
  type ReglagesEnLigne,
  type VueJoueur,
} from './protocole';

export interface ServeurParties {
  /** Ouvre une partie et rend sa vue (avec le code à partager). */
  ouvrir(reglages: Partial<ReglagesEnLigne>): Promise<VueJoueur>;
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
}

/**
 * Un serveur en mémoire, qui applique exactement l'arbitre du vrai serveur. Plusieurs comptes
 * peuvent s'y connecter (`client`) pour simuler deux téléphones.
 */
export class SalleMemoire {
  private parties = new Map<string, PartieServeur>();
  private abonnes = new Map<string, Set<() => void>>();
  private compteur = 0;

  constructor(
    private horloge: () => number = () => Date.now(),
    private hasard: () => number = () => Math.floor(Math.random() * 4294967296),
  ) {}

  private enregistrer(p: PartieServeur): void {
    this.parties.set(p.id, p);
    for (const prevenir of this.abonnes.get(p.id) ?? []) prevenir();
  }

  private trouver(id: string): PartieServeur {
    const p = this.parties.get(id);
    if (!p) throw new Refus('partie_introuvable');
    return p;
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
      async ouvrir(reglages) {
        let code: string;
        do code = nouveauCode(salle.hasard);
        while ([...salle.parties.values()].some((p) => p.code === code && p.statut === 'attente'));
        const p = ouvrirPartie(`p${++salle.compteur}`, code, compte, reglages, salle.horloge());
        salle.enregistrer(p);
        return vuePour(p, compte);
      },
      async rejoindre(saisie, equipe) {
        const code = normaliserCode(saisie);
        const p = [...salle.parties.values()].find(
          (q) => q.code === code && q.statut === 'attente',
        );
        if (!p) throw new Refus('partie_introuvable', 'Aucune partie n’attend avec ce code.');
        const q = rejoindrePartie(p, compte, salle.hasard(), salle.horloge(), equipe);
        salle.enregistrer(q);
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
    };
  }
}
