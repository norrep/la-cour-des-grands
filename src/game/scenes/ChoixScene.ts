import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { CARTES, ORDRE_CARTES, type CarteId } from '../../data/cartes';
import { choisirEquipes, EQUIPES, ORDRE_EQUIPES, type EquipeId } from '../../data/equipes';
import type { Bande } from '../../engine/index';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { preparerCarte } from '../cartes';
import { preparerEquipes, skinActif } from '../skins/index';
import { creerBouton } from '../ui/bouton';
import { cadrer, decorPlein } from '../ui/ecran';
import { contourRect, forme, graineDe } from '../ui/style';
import { jouerSon } from '../sons';
import { avecVersion } from '../../version';
import { DECOR } from './ChargementScene';
import type { DonneesPartie } from './AccueilScene';

const VIGNETTE = (id: CarteId): string => `vignette-${id}`;

/**
 * Avant la partie (DB.5) : on choisit la carte, puis la bande. Contre l'ordi, le joueur choisit
 * la sienne et l'ordi en prend une autre ; à deux, le joueur du bas choisit, puis celui du haut.
 */
export class ChoixScene extends Phaser.Scene {
  private donnees!: DonneesPartie;
  private carte: CarteId = 'cour-premier-jour';
  private bas: EquipeId | null = null;
  private ecran: Phaser.GameObjects.Container | null = null;
  /** Les élèves de toutes les bandes, chargés pendant qu'on choisit la carte. */
  private eleves: Promise<unknown> = Promise.resolve();

  constructor() {
    super('choix');
  }

  init(donnees: DonneesPartie): void {
    this.donnees = donnees;
    this.bas = null;
    this.ecran = null;
  }

  preload(): void {
    for (const id of ORDRE_CARTES) {
      if (!this.textures.exists(VIGNETTE(id))) {
        this.load.image(VIGNETTE(id), avecVersion(`cartes/vignettes/${id}.jpg`));
      }
    }
  }

  create(): void {
    cadrer(this);
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    if (this.textures.exists(DECOR)) decorPlein(this.add.image(LARGEUR / 2, HAUTEUR / 2, DECOR));
    // Les élèves de toutes les bandes, pour les montrer sur les cartes de choix.
    this.eleves = preparerEquipes(this, ['vers', 'aliens']).catch(() => undefined);
    this.montrerCartes();
  }

  private vider(): Phaser.GameObjects.Container {
    this.ecran?.destroy();
    this.ecran = this.add.container(0, 0);
    return this.ecran;
  }

  /** Le titre sur une pancarte jaune. */
  private titre(c: Phaser.GameObjects.Container, texte: string): void {
    const t = this.add
      .text(LARGEUR / 2, 118, texte, {
        fontFamily: POLICE_TITRE,
        fontSize: '42px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
    const g = this.add.graphics();
    const l = Math.max(380, t.width + 70);
    const h = t.height + 44;
    forme(g, contourRect(LARGEUR / 2 - l / 2, 118 - h / 2, l, h, 28, 7, 2), {
      remplissage: COULEURS.jaune,
      ombre: 8,
      trait: 5,
    });
    c.add([g, t]);
  }

  /** Une carte de choix touchable : fond de papier, contenu, et un rebond au toucher. */
  private carteTouchable(
    c: Phaser.GameObjects.Container,
    x: number,
    y: number,
    l: number,
    h: number,
    contenu: Phaser.GameObjects.GameObject[],
    action: (() => void) | null,
    couleur: number = COULEURS.papier,
  ): void {
    const g = this.add.graphics();
    forme(g, contourRect(-l / 2, -h / 2, l, h, 22, graineDe(x, y)), {
      remplissage: action ? couleur : 0xd8d2c4,
      ombre: 8,
      trait: 5,
    });
    const bloc = this.add.container(x, y, [g, ...contenu]);
    if (!action) bloc.setAlpha(0.55);
    c.add(bloc);
    if (!action) return;
    bloc.setSize(l, h).setInteractive({ useHandCursor: true });
    bloc.on('pointerup', () => {
      jouerSon('bouton');
      this.tweens.add({
        targets: bloc,
        scale: 0.94,
        duration: 70,
        yoyo: true,
        onComplete: action,
      });
    });
  }

  private texte(
    x: number,
    y: number,
    t: string,
    taille: number,
    largeur: number,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, t, {
        fontFamily: POLICE,
        fontSize: `${taille}px`,
        color: COULEURS.texteSombre,
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: largeur },
        lineSpacing: -4,
      })
      .setOrigin(0.5);
  }

  private retour(c: Phaser.GameObjects.Container, action: () => void): void {
    c.add(
      creerBouton(this, LARGEUR / 2, 1150, TEXTES.choixPartie.retour, action, {
        largeur: 260,
        hauteur: 72,
        taille: 28,
      }),
    );
  }

  /** Étape 1 : les trois cartes côte à côte, vignette du décor et variante en dessous. */
  private montrerCartes(): void {
    const c = this.vider();
    this.titre(c, TEXTES.choixPartie.titreCarte);
    const l = 214;
    const h = 560;
    ORDRE_CARTES.forEach((id, i) => {
      const x = LARGEUR / 2 + (i - 1) * (l + 14);
      const contenu: Phaser.GameObjects.GameObject[] = [];
      if (this.textures.exists(VIGNETTE(id))) {
        const v = this.add.image(0, -88, VIGNETTE(id));
        v.setScale((l - 26) / v.width);
        const cadre = this.add.graphics();
        cadre.lineStyle(4, COULEURS.encre, 1);
        cadre.strokeRoundedRect(
          -v.displayWidth / 2,
          -88 - v.displayHeight / 2,
          v.displayWidth,
          v.displayHeight,
          12,
        );
        contenu.push(v, cadre);
      }
      contenu.push(
        this.texte(0, 200, CARTES[id].nom, 30, l - 20),
        this.texte(0, 248, TEXTES.choixPartie.variante[id] ?? '', 19, l - 24),
      );
      this.carteTouchable(c, x, 560, l, h, contenu, () => {
        this.carte = id;
        void this.eleves.then(() => this.montrerEquipes());
      });
    });
    this.retour(c, () => this.scene.start('accueil'));
  }

  /** Étape 2 : les quatre bandes en 2 × 2, chacune montrée par son Grand et son Petit. */
  private montrerEquipes(): void {
    const c = this.vider();
    const solo = this.donnees.ordi !== undefined;
    const titre = solo
      ? TEXTES.choixPartie.titreEquipe
      : this.bas === null
        ? TEXTES.choixPartie.titreBas
        : TEXTES.choixPartie.titreHaut;
    this.titre(c, titre);
    const l = 300;
    const h = 380;
    ORDRE_EQUIPES.forEach((id, i) => {
      const x = LARGEUR / 2 + (i % 2 === 0 ? -1 : 1) * (l / 2 + 10);
      const y = 440 + Math.floor(i / 2) * (h + 24);
      const prise = id === this.bas;
      const equipe = EQUIPES[id];
      // Les élèves sont dessinés avec la bande `rouge` habillée aux couleurs de cette équipe.
      choisirEquipes({ rouge: id, bleu: id === 'bleus' ? 'rouges' : 'bleus' });
      const skin = skinActif();
      const grand = skin.eleve(this, 'rouge', 'grand', 74).setPosition(-62, -10);
      const petit = skin.eleve(this, 'rouge', 'petit', 74).setPosition(66, 10);
      // Une ombre sous les pieds de chacun (le Grand et le Petit n'ont pas les pieds au même niveau).
      const sol = this.add.graphics();
      sol.fillStyle(COULEURS.encre, 0.18);
      for (const [el, l] of [
        [grand, 100],
        [petit, 90],
      ] as const) {
        const b = el.getBounds();
        sol.fillEllipse(el.x, b.bottom - 4, l, 18);
      }
      const nom = this.texte(0, 154, prise ? TEXTES.choixPartie.pris : equipe.nom, 28, l - 20);
      this.carteTouchable(
        c,
        x,
        y,
        l,
        h,
        [sol, grand, petit, nom],
        prise ? null : () => this.choisir(id),
        equipe.clair,
      );
    });
    this.retour(c, () => {
      if (this.bas !== null && !solo) {
        this.bas = null;
        this.montrerEquipes();
      } else {
        this.bas = null;
        this.montrerCartes();
      }
    });
  }

  private choisir(id: EquipeId): void {
    const solo = this.donnees.ordi !== undefined;
    if (!solo && this.bas === null) {
      this.bas = id;
      this.montrerEquipes();
      return;
    }
    const bas = solo ? id : (this.bas as EquipeId);
    const haut = solo ? this.equipeOrdi(id) : id;
    void this.lancer({ rouge: bas, bleu: haut });
  }

  /** L'ordi prend une autre bande, au hasard de la graine. */
  private equipeOrdi(joueur: EquipeId): EquipeId {
    const autres = ORDRE_EQUIPES.filter((e) => e !== joueur);
    return autres[Math.abs(this.donnees.graine) % autres.length] ?? 'bleus';
  }

  private async lancer(equipes: Record<Bande, EquipeId>): Promise<void> {
    const c = this.vider();
    c.add(this.texte(LARGEUR / 2, HAUTEUR / 2, TEXTES.choixPartie.chargement, 32, 600));
    await Promise.all([
      preparerEquipes(this, [equipes.rouge, equipes.bleu]).catch(() => undefined),
      preparerCarte(this, this.carte),
    ]);
    const donnees: DonneesPartie = { ...this.donnees, carte: this.carte, equipes };
    this.scene.start('partie', donnees);
  }
}
