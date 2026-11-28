import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import {
  BAS,
  COULEURS,
  DROITE,
  GAUCHE,
  HAUT,
  HAUTEUR,
  LARGEUR,
  POLICE,
  POLICE_TITRE,
} from '../config';
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
import { choisirCarte, type CarteId } from '../../data/cartes';
import { choisirEquipes, type EquipeId } from '../../data/equipes';
import type { Bande, EtatPartie } from '../../engine/index';
import { lirePartieSauvee } from '../reprise';
import { preparerCarte } from '../cartes';
import { preparerEquipes } from '../skins/index';
import { tenuesPour } from '../../data/equipes';
import { DuoAccueil } from '../ui/duoAccueil';
import { normaliserCode } from '../../reseau/codes';
import type { EtapeEnLigne } from '../enLigne/etapes';
import { codeDeLAdresse, jeuEnLigneDisponible } from '../enLigne/session';

export interface DonneesPartie {
  equipements: boolean;
  /** Conseils pour débuter pendant les premiers tours. */
  conseils: boolean;
  graine: number;
  /** Partie en solo contre l'ordinateur : son niveau (le joueur a la bande rouge). */
  ordi?: Niveau;
  /** La carte jouée (la récré par défaut, DB.5). */
  carte?: CarteId;
  /** L'équipe de chaque camp (DB.1, DE.1) : les Écoliers des deux côtés par défaut. */
  equipes?: Record<Bande, EquipeId>;
  /** Jeu en ligne avec un ami : où on en est (voir `enLigne/etapes.ts`). */
  enLigne?: EtapeEnLigne;
  /** Revanche : même carte et mêmes bandes, sans la fiche de la cour. */
  revanche?: boolean;
  /** Reprise d'une partie sauvée sur ce téléphone (`reprise.ts`) : l'état où on l'a laissée. */
  reprise?: Omit<EtatPartie, 'cour'>;
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
    // De retour à l'accueil : les Écoliers contre eux-mêmes (rouges et bleus), sur la récré.
    choisirEquipes({ rouge: 'ecoliers', bleu: 'ecoliers' });
    choisirCarte('cour-premier-jour');
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    const cx = LARGEUR / 2;

    if (this.textures.exists(DECOR)) {
      decorPlein(this.add.image(cx, HAUTEUR / 2, DECOR));
    }

    // Ouvert par le lien d'un ami : on va droit au choix de sa bande, une seule fois.
    const code = jeuEnLigneDisponible() ? codeDeLAdresse() : null;
    if (code) {
      const url = new URL(location.href);
      url.searchParams.delete('code');
      history.replaceState(null, '', url);
      const propre = normaliserCode(code);
      this.scene.start(
        propre ? 'choix' : 'enLigne',
        this.donneesEnLigne(propre ? { etape: 'invite', code: propre } : { etape: 'code' }),
      );
      return;
    }

    this.dessinerTitre(cx);
    this.dessinerDuo(cx);
    this.dessinerBoutons(cx);
    this.dessinerBoutonReglages(cx);
    this.dessinerReprise(cx);
  }

  /** Une partie solo ou à deux laissée en route : on peut la reprendre où on l'a laissée. */
  private dessinerReprise(cx: number): void {
    const sauvee = lirePartieSauvee();
    if (!sauvee) return;
    let enCours = false;
    creerBouton(
      this,
      cx,
      1128,
      TEXTES.accueil.reprendre,
      () => {
        if (enCours) return;
        enCours = true;
        const d = sauvee.donnees;
        const carte = d.carte ?? 'cour-premier-jour';
        const equipes = d.equipes ?? { rouge: 'ecoliers', bleu: 'ecoliers' };
        void Promise.all([
          preparerEquipes(this, Object.values(tenuesPour(equipes))).catch(() => undefined),
          preparerCarte(this, carte),
        ]).then(() => this.scene.start('partie', { ...d, carte, equipes, reprise: sauvee.etat }));
      },
      { largeur: 360, hauteur: 60, taille: 24, couleur: COULEURS.ilot },
    );
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
      this.scene.start('choix', donnees);
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

    // À deux sur ce téléphone, ou avec un ami en ligne : deux boutons côte à côte.
    const enLigne = jeuEnLigneDisponible();
    const l = enLigne ? (BLOC - 14) / 2 : BLOC;
    creerBouton(
      this,
      enLigne ? cx - l / 2 - 7 : cx,
      912,
      `${TEXTES.accueil.jouerADeux}\n${TEXTES.accueil.sousJouerADeux}`,
      () => lancer(),
      { largeur: l, hauteur: 92, taille: enLigne ? 24 : 28, couleur: 0xc9d3ff },
    );
    if (enLigne) {
      creerBouton(
        this,
        cx + l / 2 + 7,
        912,
        TEXTES.enLigne.bouton,
        () => this.scene.start('enLigne', this.donneesEnLigne({ etape: 'menu' })),
        { largeur: l, hauteur: 92, taille: 24, couleur: COULEURS.ilot },
      );
    }
  }

  private donneesEnLigne(enLigne: EtapeEnLigne): DonneesPartie {
    return {
      equipements: this.equipements,
      conseils: lireConseils(),
      graine: Date.now(),
      enLigne,
    };
  }

  /** Un bouton « Réglages » avec sa roue dentée, sous les boutons de jeu. */
  private dessinerBoutonReglages(cx: number): void {
    const b = creerBouton(this, cx, 1040, TEXTES.accueil.reglages, () => this.ouvrirReglages(), {
      largeur: 250,
      hauteur: 60,
      taille: 24,
    });
    const roue = this.add.graphics();
    dessinerRoue(roue, 0, 0, 17);
    const face = b.list.find((o) => o instanceof Phaser.GameObjects.Container) as
      Phaser.GameObjects.Container | undefined;
    const libelle = face?.list.find((o) => o instanceof Phaser.GameObjects.Text) as
      Phaser.GameObjects.Text | undefined;
    if (libelle) libelle.x += 20;
    roue.setPosition(libelle ? libelle.x - libelle.width / 2 - 26 : -80, -1);
    (face ?? b).add(roue);
  }

  /**
   * Les réglages, dans une feuille posée sur l'accueil : équipements, conseils, sons, et le numéro
   * de version tout en bas (pour savoir d'un coup d'œil si le téléphone a la dernière). Le choix
   * du style des élèves n'est montré qu'avec `?dev` dans l'adresse.
   */
  private ouvrirReglages(): void {
    const cx = LARGEUR / 2;
    const dev = new URLSearchParams(location.search).has('dev');
    const l = BLOC + 40;
    const lignes = dev ? 4 : 3;
    const h = 200 + lignes * 76 + 110;
    const y0 = HAUTEUR / 2 - h / 2;
    const voile = this.add
      .rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, COULEURS.encre, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    const feuille = this.add.graphics();
    forme(feuille, contourRect(cx - l / 2, y0, l, h, 30, graineDe(cx, y0)), {
      remplissage: COULEURS.papier,
      ombre: 10,
      trait: 5,
    });
    const titre = this.add
      .text(cx, y0 + 60, TEXTES.accueil.reglages, {
        fontFamily: POLICE_TITRE,
        fontSize: '40px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const objets: Phaser.GameObjects.GameObject[] = [voile, feuille, titre];
    let y = y0 + 140;
    const ligne = (nom: string, lire: () => boolean, ecrire: (v: boolean) => void): void => {
      objets.push(this.caseACocher(cx, y, BLOC - 40, nom, lire, ecrire));
      y += 76;
    };
    ligne(
      TEXTES.accueil.equipements,
      () => this.equipements,
      (v) => {
        this.equipements = v;
      },
    );
    ligne(TEXTES.accueil.conseils, lireConseils, ecrireConseils);
    ligne(TEXTES.accueil.sons, lireSons, (v) => {
      ecrireSons(v);
      activerSons(v);
    });
    if (dev) {
      // Style des élèves : chaque appui passe au skin suivant et redessine l'accueil.
      let changement = false;
      objets.push(
        creerBouton(
          this,
          cx,
          y,
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
          { largeur: BLOC - 40, hauteur: 56, taille: 22 },
        ),
      );
      y += 76;
    }
    const fermer = (): void => {
      for (const o of objets) o.destroy();
    };
    objets.push(
      creerBouton(this, cx, y + 30, TEXTES.accueil.fermer, fermer, {
        largeur: 240,
        hauteur: 64,
        taille: 26,
        couleur: COULEURS.jaune,
      }),
    );
    objets.push(
      this.add
        .text(cx, y0 + h - 26, `v ${VERSION}`, {
          fontFamily: POLICE,
          fontSize: '15px',
          color: COULEURS.texteSombre,
        })
        .setOrigin(0.5)
        .setAlpha(0.6),
    );
    for (const o of objets) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(50);
  }

  /** Une case à cocher cartoon : un rond vert coché ou vide, et son nom à côté. */
  private caseACocher(
    x: number,
    y: number,
    largeur: number,
    nom: string,
    lire: () => boolean,
    ecrire: (v: boolean) => void,
  ): Phaser.GameObjects.Container {
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
    return bouton;
  }
}

/** Une petite roue dentée dessinée au trait, pour le bouton des réglages. */
function dessinerRoue(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  const dents = 8;
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < dents * 4; i++) {
    const a = (i / (dents * 4)) * Math.PI * 2;
    const dehors = i % 4 === 1 || i % 4 === 2;
    const rr = dehors ? r : r * 0.74;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  g.fillStyle(0xb9c2cf, 1);
  g.fillPoints(pts, true);
  g.lineStyle(3.5, COULEURS.encre, 1);
  g.strokePoints(pts, true);
  g.fillStyle(COULEURS.papier, 1);
  g.fillCircle(x, y, r * 0.32);
  g.strokeCircle(x, y, r * 0.32);
}
