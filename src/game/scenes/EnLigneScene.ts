import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { tenuesPour } from '../../data/equipes';
import type { CarteId } from '../../data/cartes';
import { normaliserCode, Refus, type ServeurParties, type VueJoueur } from '../../reseau/index';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { preparerCarte } from '../cartes';
import { preparerEquipes } from '../skins/index';
import { creerBouton } from '../ui/bouton';
import { cadrer, decorPlein } from '../ui/ecran';
import { contourRect, forme } from '../ui/style';
import { ecrirePartieEnCours, lienInvitation, serveurParties } from '../enLigne/session';
import { DECOR } from './ChargementScene';
import type { DonneesPartie } from './AccueilScene';

/**
 * Le jeu en ligne avant la partie : le menu (inviter, taper un code, reprendre), la salle
 * d'attente de l'hôte avec son code et son lien, et l'arrivée de l'invité.
 * Le choix de la carte et des bandes passe par l'écran de choix habituel.
 */
export class EnLigneScene extends Phaser.Scene {
  private donnees!: DonneesPartie;
  private ecran: Phaser.GameObjects.Container | null = null;
  private champ: HTMLInputElement | null = null;
  private arreterSuivi: (() => void) | null = null;
  private lance = false;

  constructor() {
    super('enLigne');
  }

  init(donnees: DonneesPartie): void {
    this.donnees = donnees;
    this.ecran = null;
    this.lance = false;
  }

  create(): void {
    cadrer(this);
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    if (this.textures.exists(DECOR)) decorPlein(this.add.image(LARGEUR / 2, HAUTEUR / 2, DECOR));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.nettoyer());
    const etape = this.donnees.enLigne ?? { etape: 'menu' };
    switch (etape.etape) {
      case 'ouvrir':
        void this.ouvrir();
        break;
      case 'code':
        this.montrerSaisie();
        break;
      case 'rejoindre':
        void this.rejoindre(etape.code, etape.equipe);
        break;
      case 'reprendre':
        void this.reprendre(etape.partieId);
        break;
      default:
        this.montrerMenu(etape.etape === 'menu' ? etape.message : undefined);
    }
  }

  private nettoyer(): void {
    this.champ?.remove();
    this.champ = null;
    this.arreterSuivi?.();
    this.arreterSuivi = null;
  }

  // -------------------------------------------------------------------------
  // Outils de dessin
  // -------------------------------------------------------------------------

  private vider(): Phaser.GameObjects.Container {
    this.champ?.remove();
    this.champ = null;
    this.ecran?.destroy();
    this.ecran = this.add.container(0, 0);
    return this.ecran;
  }

  private titre(c: Phaser.GameObjects.Container, texte: string): void {
    const t = this.add
      .text(LARGEUR / 2, 140, texte, {
        fontFamily: POLICE_TITRE,
        fontSize: '46px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
    const g = this.add.graphics();
    const l = Math.max(400, t.width + 70);
    const h = t.height + 44;
    forme(g, contourRect(LARGEUR / 2 - l / 2, 140 - h / 2, l, h, 28, 7, 2), {
      remplissage: COULEURS.jaune,
      ombre: 8,
      trait: 5,
    });
    c.add([g, t]);
  }

  private texte(
    c: Phaser.GameObjects.Container,
    y: number,
    contenu: string,
    taille = 30,
  ): Phaser.GameObjects.Text {
    const t = this.add
      .text(LARGEUR / 2, y, contenu, {
        fontFamily: POLICE,
        fontSize: `${taille}px`,
        color: COULEURS.texteSombre,
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: 580 },
        backgroundColor: '#fff4dcdd',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5);
    c.add(t);
    return t;
  }

  private bouton(
    c: Phaser.GameObjects.Container,
    y: number,
    texte: string,
    action: () => void,
    couleur: number = COULEURS.papier,
  ): void {
    c.add(
      creerBouton(this, LARGEUR / 2, y, texte, action, {
        largeur: 480,
        hauteur: 92,
        taille: 32,
        couleur,
      }),
    );
  }

  private allerAccueil(): void {
    this.scene.start('accueil');
  }

  /** Le message à montrer, suivi d'une petite ligne technique pour nous aider à trouver la cause. */
  private message(err: unknown): string {
    const texte = TEXTES.enLigne.erreurs[codeErreur(err)] ?? TEXTES.enLigne.erreurs.autre ?? '';
    const e = err as { name?: string; message?: string; status?: number } | null;
    const detail = [e?.name, e?.status, e?.message].filter(Boolean).join(' · ').slice(0, 90);
    return detail ? `${texte}\n\n(${detail})` : texte;
  }

  private attente(texte: string): void {
    const c = this.vider();
    this.texte(c, HAUTEUR / 2, texte, 32);
  }

  // -------------------------------------------------------------------------
  // Les écrans
  // -------------------------------------------------------------------------

  private montrerMenu(message?: string): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.titre);
    this.bouton(
      c,
      420,
      TEXTES.enLigne.inviter,
      () => {
        this.scene.start('choix', { ...this.donnees, enLigne: { etape: 'hote' } });
      },
      COULEURS.jaune,
    );
    this.bouton(c, 540, TEXTES.enLigne.jaiUnCode, () => this.montrerSaisie(), 0xc9d3ff);
    if (message) this.texte(c, 280, message, 24);
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => this.allerAccueil());
    // Une partie en cours sur ce compte : on propose de la reprendre (après une coupure).
    void serveurParties()
      .then((s) => s.mesParties())
      .then((parties) => {
        const enCours = parties.find((p) => p.statut === 'en_cours') ?? null;
        if (!enCours || this.ecran !== c) return;
        this.bouton(
          c,
          660,
          TEXTES.enLigne.reprendre,
          () => void this.reprendre(enCours.id),
          COULEURS.ilot,
        );
      })
      .catch(() => undefined);
  }

  /** Le code se tape dans un vrai champ du navigateur (clavier du téléphone, copier-coller). */
  private montrerSaisie(erreur?: string): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.saisie);
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.autocomplete = 'off';
    champ.autocapitalize = 'characters';
    champ.spellcheck = false;
    champ.maxLength = 12;
    champ.placeholder = 'ABCDEF';
    champ.setAttribute('aria-label', TEXTES.enLigne.saisie);
    Object.assign(champ.style, {
      position: 'fixed',
      left: '50%',
      top: '38%',
      transform: 'translate(-50%, -50%)',
      width: 'min(70vw, 340px)',
      fontSize: '40px',
      fontFamily: 'Fredoka, sans-serif',
      fontWeight: '700',
      letterSpacing: '8px',
      textAlign: 'center',
      textTransform: 'uppercase',
      padding: '12px',
      border: '5px solid #2b2228',
      borderRadius: '20px',
      background: '#fff6e4',
      color: '#2b2228',
      zIndex: '10',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(champ);
    this.champ = champ;
    champ.focus();
    if (erreur) this.texte(c, 640, erreur, 24);
    const valider = (): void => {
      const code = normaliserCode(champ.value);
      if (!code) {
        this.montrerSaisie(TEXTES.enLigne.codeFaux);
        return;
      }
      this.scene.start('choix', { ...this.donnees, enLigne: { etape: 'invite', code } });
    };
    champ.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') valider();
    });
    this.bouton(c, 760, TEXTES.enLigne.rejoindre, valider, COULEURS.jaune);
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => this.montrerMenu());
  }

  /** L'hôte ouvre la partie avec la carte et la bande choisies, puis attend son ami. */
  private async ouvrir(): Promise<void> {
    this.attente(TEXTES.enLigne.ouverture);
    let serveur: ServeurParties;
    let vue: VueJoueur;
    try {
      serveur = await serveurParties();
      vue = await serveur.ouvrir({
        carte: this.donnees.carte ?? 'cour-premier-jour',
        equipements: this.donnees.equipements,
        ...(this.donnees.equipes ? { equipes: this.donnees.equipes } : {}),
      });
    } catch (err) {
      this.montrerMenu(this.message(err));
      return;
    }
    ecrirePartieEnCours(vue.id);
    this.montrerCode(serveur, vue);
    this.arreterSuivi = serveur.suivre(vue.id, (v) => {
      if (v.statut === 'en_cours') void this.lancer(v);
    });
  }

  private montrerCode(serveur: ServeurParties, vue: VueJoueur): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.tonCode);
    // Le code en grosses lettres, espacées pour être dictées.
    const code = this.add
      .text(LARGEUR / 2, 340, vue.code.split('').join(' '), {
        fontFamily: POLICE_TITRE,
        fontSize: '84px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const g = this.add.graphics();
    forme(g, contourRect(LARGEUR / 2 - 280, 270, 560, 140, 30, 13, 2), {
      remplissage: COULEURS.papier,
      ombre: 8,
      trait: 5,
    });
    c.add([g, code]);
    this.texte(c, 490, TEXTES.enLigne.consigneCode, 26);
    const lien = lienInvitation(vue.code);
    this.bouton(
      c,
      640,
      TEXTES.enLigne.partager,
      () => void this.partager(c, lien, vue.code),
      COULEURS.jaune,
    );
    const attente = this.texte(c, 800, TEXTES.enLigne.attente, 28);
    this.tweens.add({ targets: attente, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    this.bouton(c, 1150, TEXTES.enLigne.annuler, () => {
      void serveur.envoyer(vue.id, { type: 'abandonner' }).catch(() => undefined);
      ecrirePartieEnCours(null);
      this.montrerMenu();
    });
  }

  private async partager(
    c: Phaser.GameObjects.Container,
    lien: string,
    code: string,
  ): Promise<void> {
    const texte = TEXTES.enLigne.messagePartage(code);
    try {
      if (navigator.share) {
        await navigator.share({ title: TEXTES.titre, text: texte, url: lien });
        return;
      }
      await navigator.clipboard.writeText(`${texte}\n${lien}`);
      const t = this.texte(c, 720, TEXTES.enLigne.copie, 22);
      this.time.delayedCall(1800, () => t.destroy());
    } catch {
      // Partage annulé ou refusé : le code reste à l'écran.
    }
  }

  private async rejoindre(
    code: string,
    equipe: NonNullable<DonneesPartie['equipes']>['bleu'],
  ): Promise<void> {
    this.attente(TEXTES.enLigne.arrivee);
    try {
      const serveur = await serveurParties();
      const vue = await serveur.rejoindre(code, equipe);
      await this.lancer(vue);
    } catch (err) {
      this.montrerMenu(this.message(err));
    }
  }

  private async reprendre(partieId: string): Promise<void> {
    this.attente(TEXTES.enLigne.connexion);
    try {
      const serveur = await serveurParties();
      const vue = await serveur.lire(partieId);
      if (vue.statut === 'attente') {
        this.montrerCode(serveur, vue);
        this.arreterSuivi = serveur.suivre(vue.id, (v) => {
          if (v.statut === 'en_cours') void this.lancer(v);
        });
        return;
      }
      await this.lancer(vue);
    } catch (err) {
      ecrirePartieEnCours(null);
      this.montrerMenu(this.message(err));
    }
  }

  /** Les deux joueurs sont là : on charge la carte et les bandes, puis la partie commence. */
  private async lancer(vue: VueJoueur): Promise<void> {
    if (this.lance) return;
    this.lance = true;
    this.arreterSuivi?.();
    this.arreterSuivi = null;
    ecrirePartieEnCours(vue.id);
    this.attente(TEXTES.choixPartie.chargement);
    const carte = vue.reglages.carte as CarteId;
    const equipes = vue.reglages.equipes;
    await Promise.all([
      preparerEquipes(this, Object.values(tenuesPour(equipes))).catch(() => undefined),
      preparerCarte(this, carte),
    ]);
    const donnees: DonneesPartie = {
      ...this.donnees,
      equipements: vue.reglages.equipements,
      carte,
      equipes,
      enLigne: { etape: 'partie', vue },
    };
    this.scene.start('partie', donnees);
  }
}

/** Range une erreur dans une des familles de messages (`TEXTES.enLigne.erreurs`). */
export function codeErreur(err: unknown): string {
  if (err instanceof Refus) return err.code;
  const e = err as { name?: string; message?: string } | null;
  const tout = `${e?.name ?? ''} ${e?.message ?? ''}`;
  if (/Timeout|Abort|signal timed out/i.test(tout)) return 'delai';
  if (err instanceof TypeError || /Fetch|network|Failed to fetch/i.test(tout)) return 'reseau';
  return 'autre';
}
