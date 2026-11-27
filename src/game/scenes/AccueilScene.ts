import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { COULEURS, HAUT, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { choisirSkin, preparerSkin, skinActif, skinSuivant } from '../skins/index';
import {
  ecrireConseils,
  ecrireNiveauOrdi,
  ecrireSons,
  lireConseils,
  lireNiveauOrdi,
  lireSons,
} from '../preferences';
import { activerSons, jouerSon } from '../sons';
import { creerBouton } from '../ui/bouton';
import { contourRect, contourRond, forme, graineDe } from '../ui/style';
import { cadrer, decorPlein } from '../ui/ecran';
import { VERSION } from '../../version';
import { DECOR } from './ChargementScene';
import type { Niveau } from '../../ia/index';
import { NIVEAUX_ORDI } from '../ordi';
import { DuoAccueil } from '../ui/duoAccueil';

export interface DonneesPartie {
  equipements: boolean;
  /** Conseils pour débuter pendant les premiers tours. */
  conseils: boolean;
  graine: number;
  /** Partie en solo contre l'ordinateur : son niveau (le joueur a la bande rouge). */
  ordi?: Niveau;
}

/** Largeur commune du bloc des boutons. */
const BLOC = 500;

/**
 * Écran d'accueil, de haut en bas : le titre, le Grand et le Petit (le Petit dit le but du jeu
 * dans une bulle), le bouton principal « contre l'ordi » avec son niveau en pastilles, le bouton
 * « à deux », puis les réglages en petites cases à cocher.
 */
export class AccueilScene extends Phaser.Scene {
  private equipements = true;

  constructor() {
    super('accueil');
  }

  create(): void {
    cadrer(this);
    activerSons(lireSons());
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    const cx = LARGEUR / 2;

    if (this.textures.exists(DECOR)) {
      decorPlein(this.add.image(cx, HAUTEUR / 2, DECOR));
    }

    this.dessinerTitre(cx);
    this.dessinerDuo(cx);
    this.dessinerBoutons(cx);
    this.dessinerReglages(cx);

    // Numéro de version, discret : pour savoir d'un coup d'œil si le téléphone a la dernière.
    this.add
      .text(cx, 1196, `v ${VERSION}`, {
        fontFamily: POLICE,
        fontSize: '15px',
        color: COULEURS.texteSombre,
        backgroundColor: '#fff4dccc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }

  /** Le titre sur une pancarte jaune qui se balance, et le sous-titre en bandeau de papier. */
  private dessinerTitre(cx: number): void {
    const pancarte = this.add.graphics();
    forme(pancarte, contourRect(-280, -88, 560, 176, 36, 5, 3), {
      remplissage: COULEURS.jaune,
      ombre: 10,
      trait: 6,
    });
    const titre = this.add
      .text(0, -6, TEXTES.titre, {
        fontFamily: POLICE_TITRE,
        fontSize: '64px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
        align: 'center',
        lineSpacing: -12,
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5);

    const sous = this.add
      .text(0, 0, TEXTES.sousTitre, {
        fontFamily: POLICE,
        fontSize: '24px',
        color: COULEURS.texteSombre,
        fontStyle: '600',
      })
      .setOrigin(0.5);
    const fondSous = this.add.graphics();
    const l = sous.width + 44;
    forme(fondSous, contourRect(-l / 2, -24, l, 48, 18, 9), {
      remplissage: COULEURS.papier,
      ombre: 5,
    });
    const bandeau = this.add.container(0, 104, [fondSous, sous]).setAngle(4);

    // La pancarte tombe d'en haut et rebondit, puis se balance.
    const bloc = this.add.container(cx, 150, [pancarte, titre, bandeau]).setAngle(-2);
    const sansAnimations = (window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
    if (!sansAnimations) {
      bloc.setY(HAUT - 140);
      this.tweens.add({
        targets: bloc,
        y: 150,
        duration: 750,
        delay: 150,
        ease: 'Bounce.easeOut',
      });
    }
    this.tweens.add({
      targets: bloc,
      angle: 1.5,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Le Grand et le Petit, mis en scène par `DuoAccueil` ; le Petit annonce le but dans sa bulle. */
  private dessinerDuo(cx: number): void {
    const sol = 634;
    const skin = skinActif();
    const grand = skin.acteur(this, 'rouge', 'grand', 110);
    const petit = skin.acteur(this, 'bleu', 'petit', 110);
    const bulle = this.bulle(cx + 122, 372, 370, TEXTES.accueil.bulle, { x: cx + 108, y: 444 });
    new DuoAccueil(this, grand, petit, cx - 125, cx + 120, sol, bulle);
  }

  /**
   * Bulle de bande dessinée, papier au trait noir, avec sa pointe vers celui qui parle. Le
   * conteneur a son origine à la pointe : en grandissant, la bulle sort de la tête.
   */
  private bulle(
    x: number,
    y: number,
    largeur: number,
    texte: string,
    pointe: { x: number; y: number },
  ): Phaser.GameObjects.Container {
    const t = this.add
      .text(x, y, texte, {
        fontFamily: POLICE,
        fontSize: '22px',
        color: COULEURS.texteSombre,
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: largeur - 28 },
        lineSpacing: -2,
      })
      .setOrigin(0.5);
    const h = t.height + 28;
    const haut = y - h / 2;
    const rect = contourRect(x - largeur / 2, haut, largeur, h, 22, graineDe(x, y));
    const base = haut + h;
    const pied1 = { x: pointe.x + 14, y: base - 4 };
    const pied2 = { x: pointe.x + 40, y: base - 4 };
    const queue = [pied1, pied2, pointe];
    const g = this.add.graphics();
    g.fillStyle(COULEURS.encre, 0.85);
    g.fillPoints(
      rect.map((p) => ({ x: p.x + 2, y: p.y + 5 })),
      true,
    );
    g.fillPoints(
      queue.map((p) => ({ x: p.x + 2, y: p.y + 5 })),
      true,
    );
    forme(g, rect, { remplissage: COULEURS.papier });
    g.fillStyle(COULEURS.papier, 1);
    g.fillPoints(queue, true);
    g.lineStyle(4, COULEURS.encre, 1);
    g.beginPath();
    g.moveTo(pied1.x, pied1.y + 4);
    g.lineTo(pointe.x, pointe.y);
    g.lineTo(pied2.x, pied2.y + 4);
    g.strokePath();
    g.setPosition(-pointe.x, -pointe.y);
    t.setPosition(x - pointe.x, y - pointe.y);
    return this.add.container(pointe.x, pointe.y, [g, t]).setDepth(3);
  }

  /** Le bouton principal (contre l'ordi), ses pastilles de niveau, et le bouton « à deux ». */
  private dessinerBoutons(cx: number): void {
    const lancer = (ordi?: Niveau): void => {
      const donnees: DonneesPartie = {
        equipements: this.equipements,
        conseils: lireConseils(),
        graine: Date.now(),
        ...(ordi ? { ordi } : {}),
      };
      this.scene.start('partie', donnees);
    };

    creerBouton(this, cx, 716, TEXTES.accueil.contreOrdi, () => lancer(lireNiveauOrdi()), {
      largeur: BLOC,
      hauteur: 100,
      taille: 38,
      couleur: COULEURS.jaune,
    });

    // Le niveau : trois pastilles, celle choisie est allumée. Gardé sur le téléphone.
    let pastilles: Phaser.GameObjects.Container[] = [];
    const largeurPastille = (BLOC - 2 * 14) / 3;
    const poserPastilles = (): void => {
      pastilles.forEach((p) => p.destroy());
      pastilles = NIVEAUX_ORDI.map((n, i) => {
        const choisi = n === lireNiveauOrdi();
        return creerBouton(
          this,
          cx - BLOC / 2 + largeurPastille / 2 + i * (largeurPastille + 14),
          806,
          TEXTES.accueil.niveau(n),
          () => {
            if (choisi) return;
            ecrireNiveauOrdi(n);
            poserPastilles();
          },
          {
            largeur: largeurPastille,
            hauteur: 52,
            taille: 22,
            couleur: choisi ? COULEURS.ilot : COULEURS.papier,
          },
        );
      });
    };
    poserPastilles();

    creerBouton(
      this,
      cx,
      912,
      `${TEXTES.accueil.jouerADeux}\n${TEXTES.accueil.sousJouerADeux}`,
      () => lancer(),
      { largeur: BLOC, hauteur: 92, taille: 28, couleur: 0xc9d3ff },
    );
  }

  /** Réglages : quatre petites cases à cocher, en deux rangées, sous les boutons de jeu. */
  private dessinerReglages(cx: number): void {
    const l = (BLOC - 16) / 2;
    const gauche = cx - l / 2 - 8;
    const droite = cx + l / 2 + 8;

    this.caseACocher(
      gauche,
      1040,
      l,
      TEXTES.accueil.equipements,
      () => this.equipements,
      (v) => {
        this.equipements = v;
      },
    );
    this.caseACocher(droite, 1040, l, TEXTES.accueil.conseils, lireConseils, ecrireConseils);
    this.caseACocher(gauche, 1112, l, TEXTES.accueil.sons, lireSons, (v) => {
      ecrireSons(v);
      activerSons(v);
    });

    // Style des élèves : chaque appui passe au skin suivant et redessine l'accueil.
    let changement = false;
    creerBouton(
      this,
      droite,
      1112,
      TEXTES.accueil.style(TEXTES.skins[skinActif().id]),
      () => {
        if (changement) return;
        changement = true;
        const id = skinSuivant(skinActif().id);
        preparerSkin(this, id)
          .then(() => choisirSkin(id))
          .catch(() => undefined)
          .finally(() => this.scene.restart());
      },
      { largeur: l, hauteur: 56, taille: 22 },
    );
  }

  /** Une case à cocher cartoon : un rond vert coché ou vide, et son nom à côté. */
  private caseACocher(
    x: number,
    y: number,
    largeur: number,
    nom: string,
    lire: () => boolean,
    ecrire: (v: boolean) => void,
  ): void {
    const hauteur = 56;
    const fond = this.add.graphics();
    const dessus = this.add.graphics();
    const rond = { x: -largeur / 2 + 32, y: 0 };
    // Dessinée autour de son centre, pour que le petit rebond grossisse la case sur place.
    const coche = this.add.graphics({ x: rond.x, y: rond.y });
    const pts = contourRect(-largeur / 2, -hauteur / 2, largeur, hauteur, 20, graineDe(x, y));
    fond.fillStyle(COULEURS.encre, 1);
    fond.fillPoints(
      pts.map((p) => ({ x: p.x + 2, y: p.y + 6 })),
      true,
    );
    forme(dessus, pts, { remplissage: COULEURS.papier });
    const etiquette = this.add
      .text(rond.x + 26, -1, nom, {
        fontFamily: POLICE,
        fontSize: '22px',
        color: COULEURS.texteSombre,
        fontStyle: '600',
      })
      .setOrigin(0, 0.5);

    const dessinerCoche = (): void => {
      const actif = lire();
      coche.clear();
      forme(coche, contourRond(0, 0, 15, graineDe(x, y) + 3), {
        remplissage: actif ? COULEURS.ilot : 0xffffff,
        trait: 3.5,
      });
      if (actif) {
        coche.lineStyle(5, COULEURS.encre, 1);
        coche.beginPath();
        coche.moveTo(-8, 1);
        coche.lineTo(-2, 7);
        coche.lineTo(9, -7);
        coche.strokePath();
      }
      etiquette.setAlpha(actif ? 1 : 0.6);
    };
    dessinerCoche();

    const face = this.add.container(0, 0, [dessus, coche, etiquette]);
    const bouton = this.add.container(x, y, [fond, face]);
    bouton.setSize(largeur, hauteur + 6).setInteractive({ useHandCursor: true });
    const relever = () => face.setPosition(0, 0);
    bouton.on('pointerdown', () => face.setPosition(2, 5));
    bouton.on('pointerout', relever);
    bouton.on('pointerup', () => {
      relever();
      ecrire(!lire());
      dessinerCoche();
      jouerSon('bouton');
      this.tweens.add({
        targets: coche,
        scale: { from: 1.25, to: 1 },
        duration: 220,
        ease: 'Back.easeOut',
      });
    });
  }
}
