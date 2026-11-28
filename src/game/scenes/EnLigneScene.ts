import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { tenuesPour } from '../../data/equipes';
import type { CarteId } from '../../data/cartes';
import {
  normaliserCode,
  PSEUDO_MAX,
  Refus,
  type Ami,
  type Invitation,
  type ServeurParties,
  type VueJoueur,
} from '../../reseau/index';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { preparerCarte } from '../cartes';
import { preparerEquipes } from '../skins/index';
import { creerBouton } from '../ui/bouton';
import { cadrer, decorPlein } from '../ui/ecran';
import { contourRect, forme } from '../ui/style';
import { ecrirePartieEnCours, lienInvitation, serveurParties } from '../enLigne/session';
import type { AmiInvite } from '../enLigne/etapes';
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
  /** Le menu écoute les invitations qui arrivent. */
  private arreterInvitations: (() => void) | null = null;
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
        void this.ouvrir(etape.ami);
        break;
      case 'amis':
        void this.montrerAmis();
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
    this.arreterInvitations?.();
    this.arreterInvitations = null;
  }

  // -------------------------------------------------------------------------
  // Outils de dessin
  // -------------------------------------------------------------------------

  private vider(): Phaser.GameObjects.Container {
    this.champ?.remove();
    this.champ = null;
    this.arreterInvitations?.();
    this.arreterInvitations = null;
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
    x = LARGEUR / 2,
    largeur = 480,
  ): void {
    c.add(
      creerBouton(this, x, y, texte, action, {
        largeur,
        hauteur: largeur < 480 ? 76 : 92,
        taille: largeur < 480 ? 26 : 32,
        couleur,
      }),
    );
  }

  /** Un vrai champ du navigateur (clavier du téléphone, copier-coller), posé sur l'écran. */
  private champTexte(options: {
    indice: string;
    etiquette: string;
    longueur: number;
    code: boolean;
    valeur?: string;
    /** Hauteur du centre du champ, en coordonnées du jeu. */
    y: number;
    valider: (texte: string) => void;
  }): HTMLInputElement {
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.autocomplete = 'off';
    champ.autocapitalize = options.code ? 'characters' : 'words';
    champ.spellcheck = false;
    champ.maxLength = options.longueur;
    champ.placeholder = options.indice;
    champ.value = options.valeur ?? '';
    champ.setAttribute('aria-label', options.etiquette);
    Object.assign(champ.style, {
      position: 'fixed',
      transform: 'translate(-50%, -50%)',
      fontSize: options.code ? '40px' : '34px',
      fontFamily: 'Fredoka, sans-serif',
      fontWeight: '700',
      letterSpacing: options.code ? '8px' : '1px',
      textAlign: 'center',
      textTransform: options.code ? 'uppercase' : 'none',
      padding: '12px',
      border: '5px solid #2b2228',
      borderRadius: '20px',
      background: '#fff6e4',
      color: '#2b2228',
      zIndex: '10',
    } satisfies Partial<CSSStyleDeclaration>);
    // Posé à sa place sur le dessin du jeu, quelle que soit la taille de l'écran.
    const placer = (): void => {
      const r = this.game.canvas.getBoundingClientRect();
      champ.style.left = `${r.left + r.width / 2}px`;
      champ.style.top = `${r.top + (r.height * options.y) / HAUTEUR}px`;
      champ.style.width = `${Math.min(r.width * 0.68, 360)}px`;
    };
    placer();
    window.addEventListener('resize', placer);
    const retirer = champ.remove.bind(champ);
    champ.remove = () => {
      window.removeEventListener('resize', placer);
      retirer();
    };
    document.body.appendChild(champ);
    this.champ = champ;
    champ.focus();
    champ.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') options.valider(champ.value);
    });
    return champ;
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

  /** Le menu : il faut d'abord un pseudo, puis on montre les invitations reçues et les choix. */
  private montrerMenu(message?: string): void {
    this.attente(TEXTES.enLigne.connexion);
    void (async () => {
      let serveur: ServeurParties;
      try {
        serveur = await serveurParties();
        const profil = await serveur.profil();
        if (!profil) {
          this.montrerPseudo(() => this.montrerMenu(message));
          return;
        }
        const [parties, invitations] = await Promise.all([
          this.partiesEnCours(serveur),
          serveur.invitations().catch(() => [] as Invitation[]),
        ]);
        this.dessinerMenu(message, profil.pseudo, parties[0] ?? null, invitations[0] ?? null);
        // Une invitation qui arrive pendant qu'on regarde le menu : on le redessine.
        const ecran = this.ecran;
        this.arreterInvitations = serveur.suivreInvitations(() => {
          if (this.ecran === ecran) this.montrerMenu(message);
        });
      } catch (err) {
        this.dessinerMenu(message ?? this.message(err), null, null, null);
      }
    })();
  }

  /**
   * Les parties pas finies de ce joueur. Celles dont le temps du tour est écoulé sont closes au
   * passage (le serveur vérifie l'heure), même si les deux téléphones étaient fermés.
   */
  private async partiesEnCours(serveur: ServeurParties): Promise<VueJoueur[]> {
    const parties = await serveur.mesParties().catch(() => [] as VueJoueur[]);
    const restantes: VueJoueur[] = [];
    for (const p of parties) {
      if (p.statut !== 'en_cours') continue;
      if (p.echeance !== null && p.echeance < Date.now()) {
        const v = await serveur.envoyer(p.id, { type: 'reclamer' }).catch(() => p);
        if (v.statut === 'finie') continue;
      }
      restantes.push(p);
    }
    return restantes;
  }

  private dessinerMenu(
    message: string | undefined,
    pseudo: string | null,
    enCours: VueJoueur | null,
    invitation: Invitation | null,
  ): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.titre);
    if (message) this.texte(c, 260, message, 22);
    else if (pseudo) this.texte(c, 255, TEXTES.enLigne.bonjour(pseudo), 28);
    // Les boutons forment un seul bloc, centré dans la place libre entre le titre et « Retour ».
    const boutons: [string, () => void, number][] = [
      [
        TEXTES.enLigne.inviter,
        () => this.scene.start('choix', { ...this.donnees, enLigne: { etape: 'hote' } }),
        invitation ? COULEURS.papier : COULEURS.jaune,
      ],
      [TEXTES.enLigne.jaiUnCode, () => this.montrerSaisie(), 0xc9d3ff],
    ];
    if (pseudo) boutons.push([TEXTES.enLigne.mesAmis, () => void this.montrerAmis(), 0xffc9e0]);
    // Une partie en cours sur ce compte : on propose de la reprendre (après une coupure).
    if (enCours) {
      boutons.unshift([
        TEXTES.enLigne.reprendre,
        () => void this.reprendre(enCours.id),
        COULEURS.ilot,
      ]);
    }
    const PAS = 118;
    const hCarte = invitation ? 200 : 0;
    const hauteur = hCarte + (boutons.length - 1) * PAS;
    let y = Math.round((330 + 1060) / 2 - hauteur / 2);
    if (invitation) {
      // L'invitation d'un ami, dans un cadre, au-dessus des autres choix.
      const g = this.add.graphics();
      forme(g, contourRect(LARGEUR / 2 - 280, y - 60, 560, 200, 26, 9, 2), {
        remplissage: 0xffe7a8,
        ombre: 7,
        trait: 5,
      });
      c.add(g);
      const t = this.add
        .text(LARGEUR / 2, y - 10, TEXTES.enLigne.invitation(invitation.pseudo), {
          fontFamily: POLICE,
          fontSize: '30px',
          color: COULEURS.texteSombre,
          fontStyle: '700',
          align: 'center',
          wordWrap: { width: 520 },
        })
        .setOrigin(0.5);
      c.add(t);
      this.bouton(
        c,
        y + 72,
        TEXTES.enLigne.accepter,
        () =>
          this.scene.start('choix', {
            ...this.donnees,
            enLigne: { etape: 'invite', code: invitation.code },
          }),
        COULEURS.jaune,
        LARGEUR / 2,
        320,
      );
      y += hCarte + 40;
    }
    for (const [texte, action, couleur] of boutons) {
      this.bouton(c, y, texte, action, couleur);
      y += PAS;
    }
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => this.allerAccueil());
  }

  /** Choisir son pseudo (la première fois, ou pour le changer). */
  private montrerPseudo(apres: () => void, erreur?: string, valeur?: string): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.pseudoTitre);
    this.texte(c, 280, TEXTES.enLigne.pseudoConsigne, 24);
    const valider = (texte: string): void => {
      void (async () => {
        this.attente(TEXTES.enLigne.connexion);
        try {
          await (await serveurParties()).nommer(texte);
          apres();
        } catch (err) {
          this.montrerPseudo(apres, this.message(err), texte);
        }
      })();
    };
    const champ = this.champTexte({
      indice: 'Léo',
      etiquette: TEXTES.enLigne.pseudoTitre,
      longueur: PSEUDO_MAX,
      code: false,
      valeur,
      y: 400,
      valider,
    });
    if (erreur) this.texte(c, 478, erreur, 22);
    this.bouton(c, 570, TEXTES.enLigne.pseudoValider, () => valider(champ.value), COULEURS.jaune);
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => this.allerAccueil());
  }

  /** La liste d'amis : son code ami, ses amis (à inviter d'un toucher), et en ajouter un. */
  private async montrerAmis(message?: string): Promise<void> {
    this.attente(TEXTES.enLigne.connexion);
    let amis: Ami[];
    let codeAmi: string;
    try {
      const serveur = await serveurParties();
      const profil = await serveur.profil();
      if (!profil) {
        this.montrerPseudo(() => void this.montrerAmis());
        return;
      }
      codeAmi = profil.codeAmi;
      amis = await serveur.amis();
    } catch (err) {
      this.montrerMenu(this.message(err));
      return;
    }
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.mesAmis);
    this.texte(c, 245, TEXTES.enLigne.tonCodeAmi, 24);
    const code = this.add
      .text(LARGEUR / 2, 320, codeAmi.split('').join(' '), {
        fontFamily: POLICE_TITRE,
        fontSize: '60px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const g = this.add.graphics();
    forme(g, contourRect(LARGEUR / 2 - 220, 270, 440, 100, 26, 13, 2), {
      remplissage: COULEURS.papier,
      ombre: 6,
      trait: 5,
    });
    c.add([g, code]);
    this.texte(c, 420, message ?? TEXTES.enLigne.consigneCodeAmi, 20);
    let yAjout = 640;
    if (amis.length === 0) {
      this.texte(c, 540, TEXTES.enLigne.aucunAmi, 24);
    }
    // Au plus 5 amis à l'écran (les premiers par ordre alphabétique) : une carte par ami, son
    // nom à gauche et « Inviter » à droite.
    amis.slice(0, 5).forEach((ami, i) => {
      const y = 535 + i * 104;
      const g = this.add.graphics();
      forme(g, contourRect(LARGEUR / 2 - 280, y - 44, 560, 88, 22, 9, 2), {
        remplissage: COULEURS.papier,
        ombre: 5,
        trait: 4,
      });
      const nom = this.add
        .text(LARGEUR / 2 - 250, y, ami.pseudo, {
          fontFamily: POLICE,
          fontSize: '30px',
          color: COULEURS.texteSombre,
          fontStyle: '700',
        })
        .setOrigin(0, 0.5);
      c.add([g, nom]);
      this.bouton(
        c,
        y,
        TEXTES.enLigne.inviterAmi,
        () => {
          const invite: AmiInvite = { id: ami.id, pseudo: ami.pseudo };
          this.scene.start('choix', { ...this.donnees, enLigne: { etape: 'hote', ami: invite } });
        },
        COULEURS.jaune,
        LARGEUR / 2 + 165,
        200,
      );
      yAjout = y + 130;
    });
    this.bouton(c, yAjout, TEXTES.enLigne.ajouterAmi, () => this.montrerAjoutAmi(), 0xc9d3ff);
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => this.montrerMenu());
  }

  /** Taper le code ami de quelqu'un pour l'ajouter. */
  private montrerAjoutAmi(erreur?: string): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.saisieAmi);
    const valider = (texte: string): void => {
      if (!normaliserCode(texte)) {
        this.montrerAjoutAmi(TEXTES.enLigne.codeFaux);
        return;
      }
      void (async () => {
        this.attente(TEXTES.enLigne.connexion);
        try {
          const ami = await (await serveurParties()).ajouterAmi(texte);
          await this.montrerAmis(TEXTES.enLigne.ajoute(ami.pseudo));
        } catch (err) {
          this.montrerAjoutAmi(this.message(err));
        }
      })();
    };
    const champ = this.champTexte({
      indice: 'ABCDEF',
      etiquette: TEXTES.enLigne.saisieAmi,
      longueur: 12,
      code: true,
      y: 400,
      valider,
    });
    if (erreur) this.texte(c, 478, erreur, 22);
    this.bouton(c, 570, TEXTES.enLigne.ajouterAmi, () => valider(champ.value), COULEURS.jaune);
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => void this.montrerAmis());
  }

  /** Taper le code de partie reçu. */
  private montrerSaisie(erreur?: string): void {
    const c = this.vider();
    this.titre(c, TEXTES.enLigne.saisie);
    const valider = (texte: string): void => {
      const code = normaliserCode(texte);
      if (!code) {
        this.montrerSaisie(TEXTES.enLigne.codeFaux);
        return;
      }
      this.scene.start('choix', { ...this.donnees, enLigne: { etape: 'invite', code } });
    };
    const champ = this.champTexte({
      indice: 'ABCDEF',
      etiquette: TEXTES.enLigne.saisie,
      longueur: 12,
      code: true,
      y: 400,
      valider,
    });
    if (erreur) this.texte(c, 478, erreur, 22);
    this.bouton(c, 570, TEXTES.enLigne.rejoindre, () => valider(champ.value), COULEURS.jaune);
    this.bouton(c, 1150, TEXTES.enLigne.retour, () => this.montrerMenu());
  }

  /** L'hôte ouvre la partie avec la carte et la bande choisies, puis attend son ami. */
  private async ouvrir(ami?: AmiInvite): Promise<void> {
    this.attente(TEXTES.enLigne.ouverture);
    let serveur: ServeurParties;
    let vue: VueJoueur;
    try {
      serveur = await serveurParties();
      vue = await serveur.ouvrir(
        {
          carte: this.donnees.carte ?? 'cour-premier-jour',
          equipements: this.donnees.equipements,
          ...(this.donnees.equipes ? { equipes: this.donnees.equipes } : {}),
        },
        ami?.id,
      );
    } catch (err) {
      this.montrerMenu(this.message(err));
      return;
    }
    ecrirePartieEnCours(vue.id);
    this.montrerCode(serveur, vue, ami);
    this.arreterSuivi = serveur.suivre(vue.id, (v) => {
      if (v.statut === 'en_cours') void this.lancer(v);
    });
  }

  private montrerCode(serveur: ServeurParties, vue: VueJoueur, ami?: AmiInvite): void {
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
    this.texte(
      c,
      490,
      ami ? TEXTES.enLigne.consigneInvite(ami.pseudo) : TEXTES.enLigne.consigneCode,
      26,
    );
    const lien = lienInvitation(vue.code);
    this.bouton(
      c,
      640,
      TEXTES.enLigne.partager,
      () => void this.partager(c, lien, vue.code),
      COULEURS.jaune,
    );
    const attente = this.texte(
      c,
      800,
      ami ? TEXTES.enLigne.attenteAmi(ami.pseudo) : TEXTES.enLigne.attente,
      28,
    );
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
    // L'invité voit la cour retournée, où il joue le camp du bas (DR.11) : les équipes aussi.
    const equipes =
      vue.bande === 'bleu'
        ? { rouge: vue.reglages.equipes.bleu, bleu: vue.reglages.equipes.rouge }
        : vue.reglages.equipes;
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
