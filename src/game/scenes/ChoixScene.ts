import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { CARTES, ORDRE_CARTES, type CarteId } from '../../data/cartes';
import {
  choisirEquipes,
  EQUIPES,
  ORDRE_EQUIPES,
  TENUES,
  tenuesPour,
  type EquipeId,
} from '../../data/equipes';
import { ROLES, type Bande, type RoleId } from '../../engine/index';
import { COULEURS, HAUT, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { preparerCarte, visuelCarte } from '../cartes';
import { preparerEquipes, skinActif } from '../skins/index';
import { creerBouton } from '../ui/bouton';
import { cadrer, decorPlein } from '../ui/ecran';
import { contourRect, contourRond, forme, graineDe } from '../ui/style';
import { MedaillonSurveillant } from '../ui/surveillant';
import { jouerSon } from '../sons';
import { avecVersion } from '../../version';
import { DECOR, JOSIANE } from './ChargementScene';
import type { DonneesPartie } from './AccueilScene';

const APERCU = (id: CarteId): string => `apercu-${id}`;

/** Fichier du surveillant de chaque carte (Mme Josiane est déjà chargée au démarrage). */
const FICHIER_SURVEILLANT: Partial<Record<CarteId, string>> = {
  piscine: 'skins/dodu/maitre-nageur.png',
  'camp-scout': 'skins/dodu/cheftaine.png',
};

/** Couleurs de chaque carte : le fond de sa carte de choix et son ruban (DC.1). */
const TEINTES: Record<CarteId, { fond: number; ruban: number }> = {
  'cour-premier-jour': { fond: 0xe4defa, ruban: 0xb9a9f2 },
  piscine: { fond: 0xd2f2f2, ruban: 0x6fd0d6 },
  'camp-scout': { fond: 0xe2f0cc, ruban: 0xa8d477 },
};

/** Les élèves d'une bande hors Grand et Petit, du 1 au 6. */
const AUTRES: RoleId[] = ROLES.map((r) => r.id).filter((r) => r !== 'grand' && r !== 'petit');

/**
 * Avant la partie (DB.5) : on choisit la carte, puis la bande. Contre l'ordi, le joueur choisit
 * la sienne et l'ordi tire la sienne ; à deux, le joueur du bas choisit, puis celui du haut.
 * Les deux camps peuvent avoir la même bande (DE.1).
 */
export class ChoixScene extends Phaser.Scene {
  private donnees!: DonneesPartie;
  private carte: CarteId = 'cour-premier-jour';
  private bas: EquipeId | null = null;
  private ecran: Phaser.GameObjects.Container | null = null;
  /** Les élèves de toutes les bandes, chargés pendant qu'on choisit la carte. */
  private eleves: Promise<unknown> = Promise.resolve();
  /** La carte et la bande en vue dans le carrousel. */
  private vueCarte = 0;
  private vueEquipe = 0;

  constructor() {
    super('choix');
  }

  init(donnees: DonneesPartie): void {
    this.donnees = donnees;
    this.bas = null;
    this.ecran = null;
    this.vueCarte = 0;
    this.vueEquipe = 0;
  }

  preload(): void {
    for (const id of ORDRE_CARTES) {
      if (!this.textures.exists(APERCU(id))) {
        this.load.image(APERCU(id), avecVersion(`cartes/apercus/${id}.jpg`));
      }
      const f = FICHIER_SURVEILLANT[id];
      const cle = visuelCarte(id).surveillant.texture;
      if (f && !this.textures.exists(cle)) this.load.image(cle, avecVersion(f));
    }
  }

  create(): void {
    cadrer(this);
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    if (this.textures.exists(DECOR)) decorPlein(this.add.image(LARGEUR / 2, HAUTEUR / 2, DECOR));
    // Les élèves de toutes les bandes, pour les montrer sur les cartes de choix.
    this.eleves = preparerEquipes(this, ['vers', 'aliens']).catch(() => undefined);
    // L'invité d'une partie en ligne ne choisit que sa bande : l'hôte a choisi la carte.
    if (this.donnees.enLigne?.etape === 'invite') {
      void this.eleves.then(() => this.montrerEquipes());
    } else {
      this.montrerCartes();
    }
  }

  /** Une seule bande à choisir à cet écran : contre l'ordi, ou en ligne (l'ami choisit la sienne). */
  private get unSeulChoix(): boolean {
    return this.donnees.ordi !== undefined || this.donnees.enLigne !== undefined;
  }

  /** Revenir avant le choix de la carte : à l'accueil, ou au menu du jeu en ligne. */
  private sortir(): void {
    if (this.donnees.enLigne) {
      this.scene.start('enLigne', { ...this.donnees, enLigne: { etape: 'menu' } });
    } else {
      this.scene.start('accueil');
    }
  }

  private vider(): Phaser.GameObjects.Container {
    this.ecran?.destroy();
    this.ecran = this.add.container(0, 0);
    return this.ecran;
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Briques communes                                                                          */
  /* ---------------------------------------------------------------------------------------- */

  /** Le titre sur une pancarte jaune. */
  private titre(c: Phaser.GameObjects.Container, texte: string, y = 118, taille = 42): void {
    const t = this.add
      .text(LARGEUR / 2, y, texte, {
        fontFamily: POLICE_TITRE,
        fontSize: `${taille}px`,
        color: COULEURS.texteSombre,
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
    const g = this.add.graphics();
    const l = Math.max(taille * 9, t.width + 70);
    const h = t.height + taille;
    forme(g, contourRect(LARGEUR / 2 - l / 2, y - h / 2, l, h, 28, 7, 2), {
      remplissage: COULEURS.jaune,
      ombre: 8,
      trait: 5,
    });
    c.add([g, t]);
  }

  private texte(
    x: number,
    y: number,
    t: string,
    taille: number,
    largeur: number,
    graisse = '600',
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, t, {
        fontFamily: POLICE,
        fontSize: `${taille}px`,
        color: COULEURS.texteSombre,
        fontStyle: graisse,
        align: 'center',
        wordWrap: { width: largeur },
        lineSpacing: -2,
      })
      .setOrigin(0.5);
  }

  /** Petit bouton « Retour » en haut à gauche (carrousel, plein écran). */
  private retourHaut(c: Phaser.GameObjects.Container, action: () => void): void {
    c.add(
      creerBouton(this, 92, Math.max(HAUT + 52, 40), `‹ ${TEXTES.choixPartie.retour}`, action, {
        largeur: 150,
        hauteur: 56,
        taille: 22,
      }),
    );
  }

  /** Rend un objet touchable (rebond au toucher), sans réagir à la fin d'un glissé. */
  private touchable(
    bloc: Phaser.GameObjects.Container,
    l: number,
    h: number,
    action: () => void,
  ): void {
    bloc.setSize(l, h).setInteractive({ useHandCursor: true });
    bloc.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.upX - p.downX) > this.scale.width * 0.04) return;
      jouerSon('bouton');
      this.tweens.add({
        targets: bloc,
        scaleX: bloc.scaleX * 0.95,
        scaleY: bloc.scaleY * 0.95,
        duration: 70,
        yoyo: true,
        onComplete: action,
      });
    });
  }

  /** Fond de carte de choix : papier teinté, trait noir, ombre pleine. */
  private fondCarte(
    l: number,
    h: number,
    couleur: number,
    graine: number,
  ): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    forme(g, contourRect(-l / 2, -h / 2, l, h, 26, graine), {
      remplissage: couleur,
      ombre: 9,
      trait: 5,
    });
    return g;
  }

  /** Un ruban (nom de la carte ou de la bande) à cheval sur un bord. */
  private ruban(
    x: number,
    y: number,
    texte: string,
    couleur: number,
    taille = 34,
  ): Phaser.GameObjects.Container {
    const t = this.add
      .text(0, 0, texte, {
        fontFamily: POLICE_TITRE,
        fontSize: `${taille}px`,
        fontStyle: '700',
        color: COULEURS.texteSombre,
      })
      .setOrigin(0.5);
    const l = t.width / 2 + 26;
    const h = t.height / 2 + 8;
    const g = this.add.graphics();
    for (const s of [-1, 1]) {
      forme(
        g,
        [
          { x: s * (l - 10), y: -h + 10 },
          { x: s * (l + 26), y: -h + 12 },
          { x: s * (l + 14), y: 6 },
          { x: s * (l + 26), y: h + 6 },
          { x: s * (l - 10), y: h + 4 },
        ],
        { remplissage: Phaser.Display.Color.ValueToColor(couleur).darken(18).color, trait: 4 },
      );
    }
    forme(
      g,
      [
        { x: -l, y: -h },
        { x: 0, y: -h - 4 },
        { x: l, y: -h },
        { x: l, y: h },
        { x: 0, y: h - 4 },
        { x: -l, y: h },
      ],
      { remplissage: couleur, trait: 4, ombre: 4 },
    );
    return this.add.container(x, y, [g, t]);
  }

  /** L'aperçu de la vraie cour (îlots, goûters, cabanes), recadré en `l` × `h`, avec un cadre. */
  private apercu(
    id: CarteId,
    x: number,
    y: number,
    l: number,
    h: number,
    centreY = 0.5,
  ): Phaser.GameObjects.GameObject[] {
    if (!this.textures.exists(APERCU(id))) return [];
    const v = this.add.image(x, y, APERCU(id));
    const e = Math.max(l / v.width, h / v.height);
    const cl = l / e;
    const ch = h / e;
    const cy = Phaser.Math.Clamp(v.height * centreY - ch / 2, 0, v.height - ch);
    v.setCrop((v.width - cl) / 2, cy, cl, ch).setScale(e);
    // Le recadrage garde l'origine de l'image entière : on recale le morceau visible sur (x, y).
    v.setPosition(x, y - (cy + ch / 2 - v.height / 2) * e);
    const cadre = this.add.graphics();
    cadre.lineStyle(5, COULEURS.encre, 1);
    cadre.strokeRoundedRect(x - l / 2, y - h / 2, l, h, 10);
    return [v, cadre];
  }

  private medaillon(id: CarteId, x: number, y: number, d: number): Phaser.GameObjects.Container {
    const s = visuelCarte(id).surveillant;
    const texture = id === 'cour-premier-jour' ? JOSIANE : s.texture;
    const m = new MedaillonSurveillant(this, texture, s.rig, s.id, CARTES[id].surveillant, d);
    return m.racine.setPosition(x, y);
  }

  /** Autocollant jaune « ★ Règle spéciale » + la règle de la carte. */
  private regle(
    id: CarteId,
    x: number,
    y: number,
    l: number,
    taille = 23,
  ): Phaser.GameObjects.Container {
    const titre = this.texte(0, 0, TEXTES.choixPartie.regleTitre, taille - 2, l - 30, '700');
    const corps = this.texte(0, 0, TEXTES.choixPartie.regle[id] ?? '', taille, l - 36, '500');
    const h = titre.height + corps.height + 30;
    titre.setY(-h / 2 + 12 + titre.height / 2);
    corps.setY(titre.y + titre.height / 2 + 4 + corps.height / 2);
    const g = this.add.graphics();
    forme(g, contourRect(-l / 2, -h / 2, l, h, 18, graineDe(x, y)), {
      remplissage: COULEURS.jaune,
      trait: 4,
      ombre: 5,
    });
    return this.add.container(x, y, [g, titre, corps]);
  }

  /** Un élève debout, avec son ombre bien sous les pieds (Vers compris). */
  private debout(
    role: RoleId,
    taille: number,
    x: number,
    y: number,
  ): Phaser.GameObjects.GameObject[] {
    const el = skinActif().eleve(this, 'rouge', role, taille).setPosition(x, y);
    // Les pieds sont au bas de la marionnette (ou du ver) : le premier enfant, posé à `pieds`.
    const corps = el.list[0] as Phaser.GameObjects.Container | undefined;
    const pieds = y + (corps?.y ?? 0);
    const sol = this.add.ellipse(x, pieds - 2, taille * 1.25, taille * 0.24, COULEURS.encre, 0.2);
    return [sol, el];
  }

  /** Les six autres élèves de la bande, en bustes alignés. */
  private bustes(x: number, y: number, l: number, h: number): Phaser.GameObjects.GameObject[] {
    const buste = skinActif().buste?.bind(skinActif());
    if (!buste) return [];
    const pas = l / AUTRES.length;
    return AUTRES.map((r, i) =>
      buste(this, 'rouge', r, pas - 6, h).setPosition(x - l / 2 + pas * (i + 0.5), y),
    );
  }

  private choisirCarte(id: CarteId): void {
    this.carte = id;
    void this.eleves.then(() => this.montrerEquipes());
  }

  private titreEquipes(): string {
    const invite = this.donnees.enLigne?.etape === 'invite';
    return invite
      ? TEXTES.enLigne.titreInvite
      : this.unSeulChoix
        ? TEXTES.choixPartie.titreEquipe
        : this.bas === null
          ? TEXTES.choixPartie.titreBas
          : TEXTES.choixPartie.titreHaut;
  }

  private retourEquipes(): void {
    if (this.bas !== null && !this.unSeulChoix) {
      this.bas = null;
      this.montrerEquipes();
    } else if (this.donnees.enLigne?.etape === 'invite') {
      this.sortir();
    } else {
      this.bas = null;
      this.montrerCartes();
    }
  }

  /* ---------------------------------------------------------------------------------------- */
  /* Le carrousel : une grande carte à la fois (DC.1)                                          */
  /* ---------------------------------------------------------------------------------------- */

  /**
   * Un carrousel de grandes cartes : celle du milieu en grand, les voisines qui dépassent sur les
   * bords. On glisse du doigt, on touche une voisine pour la ramener, ou les flèches.
   */
  private carrousel(
    c: Phaser.GameObjects.Container,
    n: number,
    depart: number,
    dessiner: (i: number) => Phaser.GameObjects.Container,
    choisir: (i: number) => void,
    libelle: string,
    changer: (i: number) => void,
  ): void {
    const PAS = 540;
    const Y = 650;
    let vue = depart;
    const cartes = Array.from({ length: n }, (_, i) => dessiner(i).setPosition(LARGEUR / 2, Y));
    c.add(cartes);
    const points = this.add.graphics();
    c.add(points);
    const placer = (anime: boolean): void => {
      cartes.forEach((k, i) => {
        const d = i - vue;
        const cible = {
          x: LARGEUR / 2 + d * PAS,
          scale: d === 0 ? 1 : 0.86,
          alpha: d === 0 ? 1 : 0.7,
        };
        if (anime) this.tweens.add({ targets: k, ...cible, duration: 260, ease: 'Back.easeOut' });
        else k.setPosition(cible.x, Y).setScale(cible.scale).setAlpha(cible.alpha);
      });
      const devant = cartes[vue];
      if (devant) c.bringToTop(devant);
      points.clear();
      for (let i = 0; i < n; i++) {
        const x = LARGEUR / 2 + (i - (n - 1) / 2) * 34;
        forme(points, contourRond(x, 1112, i === vue ? 11 : 8, 5 + i), {
          remplissage: i === vue ? COULEURS.jaune : COULEURS.papier,
          trait: 3,
        });
      }
    };
    const aller = (i: number): void => {
      const j = Phaser.Math.Clamp(i, 0, n - 1);
      if (j === vue) return;
      vue = j;
      changer(vue);
      jouerSon('bouton');
      placer(true);
    };
    cartes.forEach((k, i) =>
      this.touchable(k, 540, 860, () => (i === vue ? choisir(i) : aller(i))),
    );
    // Flèches de part et d'autre des points.
    for (const s of [-1, 1]) {
      const f = creerBouton(
        this,
        LARGEUR / 2 + s * 120,
        1112,
        s < 0 ? '‹' : '›',
        () => aller(vue + s),
        {
          largeur: 64,
          hauteur: 56,
          taille: 34,
        },
      );
      c.add(f);
    }
    c.add(
      creerBouton(this, LARGEUR / 2, 1200, libelle, () => choisir(vue), {
        largeur: 380,
        hauteur: 80,
        taille: 32,
        couleur: COULEURS.jaune,
      }),
    );
    const glisse = (p: Phaser.Input.Pointer): void => {
      const dx = p.upX - p.downX;
      if (Math.abs(dx) > this.scale.width * 0.08) aller(vue + (dx < 0 ? 1 : -1));
    };
    this.input.on('pointerup', glisse);
    c.once(Phaser.GameObjects.Events.DESTROY, () => this.input.off('pointerup', glisse));
    placer(false);
  }

  /** Étape 1 : la carte. Aperçu de la vraie cour, surveillant, nom, règle spéciale. */
  private montrerCartes(): void {
    const c = this.vider();
    this.titre(c, TEXTES.choixPartie.titreCarte, 118, 38);
    this.carrousel(
      c,
      ORDRE_CARTES.length,
      this.vueCarte,
      (i) => {
        const id = ORDRE_CARTES[i] ?? 'cour-premier-jour';
        const t = TEINTES[id];
        const l = 540;
        const h = 860;
        const k = this.add.container(0, 0, [this.fondCarte(l, h, t.fond, 11 + i)]);
        k.add(this.apercu(id, 0, -140, l - 44, 520, 0.5));
        k.add(this.medaillon(id, -l / 2 + 70, -h / 2 + 78, 104));
        k.add(this.ruban(0, 130, CARTES[id].nom, t.ruban, 36));
        k.add(
          this.texte(0, 196, TEXTES.choixPartie.avec(CARTES[id].surveillant), 22, l - 60, '500'),
        );
        k.add(this.regle(id, 0, 316, l - 60, 24));
        return k;
      },
      (i) => this.choisirCarte(ORDRE_CARTES[i] ?? 'cour-premier-jour'),
      TEXTES.choixPartie.jouerIci,
      (i) => (this.vueCarte = i),
    );
    this.retourHaut(c, () => this.sortir());
  }

  /** Étape 2 : la bande. Le Grand et le Petit en grand, les six autres en bustes. */
  private montrerEquipes(): void {
    const c = this.vider();
    this.titre(c, this.titreEquipes(), 118, 34);
    this.carrousel(
      c,
      ORDRE_EQUIPES.length,
      this.vueEquipe,
      (i) => {
        const id = ORDRE_EQUIPES[i] ?? 'ecoliers';
        const equipe = EQUIPES[id];
        choisirEquipes({ rouge: id, bleu: id });
        const tenue = TENUES[equipe.tenue];
        const l = 540;
        const h = 860;
        const k = this.add.container(0, 0, [this.fondCarte(l, h, tenue.clair, 21 + i)]);
        // Un halo de la couleur de la bande derrière le duo.
        const halo = this.add.graphics();
        forme(halo, contourRond(0, -150, 210, 30 + i), {
          remplissage: tenue.couleur,
          alpha: 0.35,
          trait: 0,
        });
        k.add(halo);
        k.add(this.debout('grand', 132, -88, -150));
        k.add(this.debout('petit', 132, 108, -112));
        k.add(this.ruban(0, 150, equipe.nom, tenue.couleur, 34));
        k.add(this.texte(0, 220, TEXTES.choixPartie.toute, 22, l - 60, '500'));
        k.add(this.bustes(0, 318, l - 60, 120));
        if (id === this.bas)
          k.add(this.texte(0, -h / 2 + 40, TEXTES.choixPartie.pris, 22, l - 60, '700'));
        return k;
      },
      (i) => this.choisir(ORDRE_EQUIPES[i] ?? 'ecoliers'),
      TEXTES.choixPartie.prendreBande,
      (i) => (this.vueEquipe = i),
    );
    this.retourHaut(c, () => this.retourEquipes());
  }

  /* ---------------------------------------------------------------------------------------- */

  private choisir(id: EquipeId): void {
    const enLigne = this.donnees.enLigne;
    if (enLigne?.etape === 'invite') {
      this.scene.start('enLigne', {
        ...this.donnees,
        enLigne: { etape: 'rejoindre', code: enLigne.code, equipe: id },
      });
      return;
    }
    if (enLigne) {
      // L'hôte ouvre la partie avec sa bande ; l'ami choisira la sienne en arrivant.
      this.scene.start('enLigne', {
        ...this.donnees,
        carte: this.carte,
        equipes: { rouge: id, bleu: id },
        enLigne: { etape: 'ouvrir' },
      });
      return;
    }
    const solo = this.unSeulChoix;
    if (!solo && this.bas === null) {
      this.bas = id;
      this.montrerEquipes();
      return;
    }
    const bas = solo ? id : (this.bas as EquipeId);
    const haut = solo ? this.equipeOrdi() : id;
    void this.lancer({ rouge: bas, bleu: haut });
  }

  /** L'ordi tire sa bande au hasard de la graine, la même que le joueur comprise (miroir). */
  private equipeOrdi(): EquipeId {
    return ORDRE_EQUIPES[Math.abs(this.donnees.graine) % ORDRE_EQUIPES.length] ?? 'ecoliers';
  }

  private async lancer(equipes: Record<Bande, EquipeId>): Promise<void> {
    const c = this.vider();
    c.add(this.texte(LARGEUR / 2, HAUTEUR / 2, TEXTES.choixPartie.chargement, 32, 600));
    await Promise.all([
      preparerEquipes(this, Object.values(tenuesPour(equipes))).catch(() => undefined),
      preparerCarte(this, this.carte),
    ]);
    const donnees: DonneesPartie = { ...this.donnees, carte: this.carte, equipes };
    this.scene.start('partie', donnees);
  }
}
