import { jouer, type Action, type Bande, type Cour, type Evenement } from '../../engine/index';
import {
  Refus,
  restaurer,
  type Issue,
  type ServeurParties,
  type VueJoueur,
} from '../../reseau/index';
import { Controleur } from '../controleur';

/**
 * Le déroulé d'une partie en ligne, sans Phaser. Même interface que le `Controleur` d'une partie
 * sur un seul téléphone, pour que l'écran de jeu serve tel quel :
 * - l'état est la VUE envoyée par le serveur (la main adverse et les pioches y sont cachées) ;
 * - un coup est envoyé au serveur, seul juge. S'il ne dépend d'aucune information cachée (pas de
 *   pioche, pas de hasard, pas de fin de partie), il est montré tout de suite, sans attendre la
 *   réponse ; sinon l'écran attend le résultat du serveur pour l'animer ;
 * - les coups de l'adversaire arrivent par `recevoir`, et l'écran les anime comme ceux de l'ordi.
 * Pas d'écran « Passe le téléphone » : la phase reste `jeu` jusqu'à la fin.
 */
export class ControleurEnLigne extends Controleur {
  vue: VueJoueur;
  /** Un coup est parti au serveur et sa réponse n'est pas encore arrivée. */
  envoi = false;
  /** Après un coup montré d'avance : la longueur du journal que le serveur doit confirmer. */
  private attendu: number | null = null;
  /**
   * L'écran fournit de quoi animer un changement venu du serveur : `appliquer` met l'état à jour
   * (l'écran compare le journal avant et après pour animer).
   */
  surChangement: (appliquer: () => boolean, animer: boolean) => void = (a) => {
    a();
  };
  /** Un coup a été refusé ou le réseau a lâché : l'écran le dit. */
  surErreur: (message: string) => void = () => undefined;

  constructor(
    cour: Cour,
    readonly serveur: ServeurParties,
    vue: VueJoueur,
  ) {
    super(cour, { graine: 0 });
    this.vue = vue;
    this.prendre(vue);
  }

  get bande(): Bande {
    return this.vue.bande;
  }

  get issue(): Issue | null {
    return this.vue.issue;
  }

  /** Est-ce à l'adversaire de jouer ? */
  get tourAdverse(): boolean {
    return this.phase === 'jeu' && this.etat.courant !== this.bande;
  }

  private prendre(vue: VueJoueur): boolean {
    if (!vue.etat) return false;
    this.etat = restaurer(vue.etat);
    this.phase = vue.statut === 'finie' ? 'fin' : 'jeu';
    return true;
  }

  override reprendre(): void {
    // Rien à reprendre : chacun garde son téléphone.
  }

  override jouer(action: Action): boolean {
    if (this.phase !== 'jeu' || this.envoi || this.etat.courant !== this.bande) return false;
    let local;
    try {
      local = jouer(this.etat, action);
    } catch {
      return false;
    }
    const nouveaux = local.journal.slice(this.etat.journal.length);
    const dAvance = montrableDAvance(nouveaux);
    // L'état montré d'avance est posé AVANT l'envoi : la réponse peut arriver tout de suite.
    if (dAvance) {
      this.etat = local;
      this.attendu = local.journal.length;
    }
    this.envoi = true;
    const version = this.vue.version;
    this.serveur.envoyer(this.vue.id, { type: 'jouer', action, version }).then(
      (v) => this.recevoir(v),
      (err: unknown) => this.echec(err),
    );
    return dAvance;
  }

  /** Une nouvelle vue du serveur (réponse à un coup, coup adverse, reprise après coupure). */
  recevoir(vue: VueJoueur): void {
    // Les messages peuvent arriver en double ou dans le désordre : seul le plus récent compte.
    if (vue.version <= this.vue.version) return;
    this.vue = vue;
    this.envoi = false;
    const attendu = this.attendu;
    this.attendu = null;
    const longueur = vue.etat?.journal.length ?? 0;
    // Le coup montré d'avance est confirmé tel quel : on reprend l'état du serveur sans rejouer
    // l'animation.
    const dejaVu = attendu !== null && longueur === attendu;
    this.surChangement(() => this.prendre(vue), !dejaVu);
  }

  private echec(err: unknown): void {
    this.envoi = false;
    this.attendu = null;
    this.surErreur(err instanceof Refus ? err.code : 'reseau');
    // On se recale sur le serveur : son état fait foi.
    this.serveur.lire(this.vue.id).then(
      (v) => {
        this.vue = v;
        this.surChangement(() => this.prendre(v), false);
      },
      () => undefined,
    );
  }

  /** Abandonner la partie (l'adversaire gagne). */
  abandonner(): Promise<void> {
    return this.serveur.envoyer(this.vue.id, { type: 'abandonner' }).then((v) => this.recevoir(v));
  }

  /** L'adversaire a laissé filer son temps : on réclame la victoire. */
  reclamer(): Promise<void> {
    return this.serveur.envoyer(this.vue.id, { type: 'reclamer' }).then((v) => this.recevoir(v));
  }
}

/** Un coup qui ne dépend de rien de caché : la vue suffit pour en connaître le résultat exact. */
export function montrableDAvance(nouveaux: readonly Evenement[]): boolean {
  return !nouveaux.some(
    (ev) =>
      ev.type === 'appel' ||
      ev.type === 'pioche' ||
      ev.type === 'infirmerie' ||
      ev.type === 'fin' ||
      (ev.type === 'surveillante' && ev.parDelegue),
  );
}
