import Phaser from 'phaser';
import { COURS } from '../../data/boards/index';
import { TEXTES } from '../../data/textes';
import {
  actionsLegales,
  chargerCour,
  ciblesPossibles,
  gouterSurveille,
  ROLES,
  sommet,
  valeur,
  type Bande,
  type Cour,
  type CourData,
  type Eleve,
  type Evenement,
  type Action,
  type Option,
  type RoleId,
} from '../../engine/index';
import { apercu } from '../apercu';
import { dureeAnimations, planAnimations } from '../sequence';
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
import { alleesDuChemin } from '../chemins';
import { cinematiquesPour, type Cinematique, type CinematiqueId } from '../cinematiques';
import { NB_CONSEILS, prochainConseil, type ConseilId } from '../conseils';
import { Controleur } from '../controleur';
import {
  centreRegion,
  noeudSous,
  positionNoeud,
  RANG,
  xCarteRang,
  type Point,
  DESCENTE,
  MONTEE,
  positionLieu,
  type Lieu,
} from '../disposition';
import { dernieresLignes, nomGouter } from '../journal';
import { aide, tonFun, tutoPasse } from '../ton';
import { FUN } from '../../data/textesFun';
import { creerBadge } from '../ui/badge';
import { skinActif } from '../skins/index';
import { creerBouton } from '../ui/bouton';
import { contourRect, contourRond, forme, graineDe, panneau } from '../ui/style';
import { ecrireConseils, lireSons } from '../preferences';
import { activerSons, jouerSon, type SonId } from '../sons';
import { HAUTEUR_PRISE, PantinVisuel, VISEE } from '../ui/pantin';
import type { DonneesPartie } from './AccueilScene';
import { DECOR, ILLUSTRATIONS, JOSIANE } from './ChargementScene';
import { cadrer, decorPlein } from '../ui/ecran';
import { Gelee, rendreVivant } from '../ui/gelee';

const RAYON_ILOT = 48;
const TAILLE_BADGE = 70;
/** Pastille d'un élève posé sur un îlot : un peu plus grande que l'îlot, la tête dépasse. */
const DIAMETRE_PASTILLE = 92;
const RAYON_DEPOT = 75;
const Y_JOURNAL = 935 + DESCENTE;
const Y_ACTIONS = 1040 + DESCENTE;
/** Temps laissé pour voir un coup avant de passer le téléphone (ms). */
const DUREE_FIN_DE_TOUR = 900;
/** Annonce d'une arrivée : l'élève se ramasse en l'air avant de tomber (ms). */
const ANNONCE = 130;

type Texte = Phaser.GameObjects.Text;

/** La partie à deux sur un même téléphone (étape 2 : formes simples). */
export class PartieScene extends Phaser.Scene {
  private ctrl!: Controleur;
  private cour!: Cour;
  private donnees!: DonneesPartie;
  /** Tout ce qui est redessiné à chaque changement d'état. */
  private dyn!: Phaser.GameObjects.Container;
  /** Badge visible de chaque îlot (pour le faire trembler). */
  private badges = new Map<string, Phaser.GameObjects.Container>();
  /** Surbrillances des cibles pendant un glisser-déposer. */
  private surbrillances: Phaser.GameObjects.GameObject[] = [];
  private departToboggan: string | null = null;
  /** Fiche d'information affichée à la place du journal (élève ou îlot touché). */
  private fiche: { titre: string; texte: string } | null = null;
  private aideOuverte = false;
  /** Conseils pour débuter : actifs ou non, et déjà vus par chaque joueur. */
  private conseilsActifs = true;
  private conseilsVus: Record<Bande, Set<ConseilId>> = { rouge: new Set(), bleu: new Set() };
  /** Dernier tour où chaque joueur a lu un conseil de préparation. */
  private tourDernierConseil: Record<Bande, number> = { rouge: 0, bleu: 0 };
  /** Animations et cinématiques (coupées par les tests automatisés de l'écran). */
  private animations = true;
  /** Un coup vient de finir : on montre son effet avant l'écran « Passe le téléphone ». */
  private entreDeuxTours = false;
  /** Cinématiques en attente, jouées l'une après l'autre. */
  private cinematiques: Cinematique[] = [];
  private cinematiqueEnCours: Phaser.GameObjects.Container | null = null;
  private tweensCinematique = new Set<Phaser.Tweens.Tween>();
  /** Cases des cartables (pour y faire voler les goûters ramassés). */
  private cartables: Record<Bande, Point[]> = { rouge: [], bleu: [] };
  /** Tour affiché par la pendule (pour faire avancer l'aiguille quand il change). */
  private tourHorloge = 0;
  /** Mme Josiane, pour la faire marcher d'un goûter à l'autre. */
  private josiane: Phaser.GameObjects.Container | null = null;
  /** Panneau de chaque lieu (portail, CPE), pour le faire rebondir quand un élève y arrive. */
  private panneauxLieux = new Map<string, Phaser.GameObjects.Container>();
  /** Goûters en train de voler vers le cartable (leurs cases restent vides jusqu'à l'arrivée). */
  private gouterEnVol: Record<Bande, number> = { rouge: 0, bleu: 0 };

  constructor() {
    super('partie');
  }

  init(donnees: DonneesPartie): void {
    this.donnees = donnees;
    this.cour = chargerCour(COURS['cour-premier-jour'] as CourData);
    this.ctrl = new Controleur(this.cour, {
      graine: donnees.graine,
      equipements: donnees.equipements,
    });
    this.departToboggan = null;
    this.fiche = null;
    this.aideOuverte = false;
    this.conseilsActifs = donnees.conseils;
    this.conseilsVus = { rouge: new Set(), bleu: new Set() };
    this.tourDernierConseil = { rouge: 0, bleu: 0 };
    this.cinematiques = [];
    this.cinematiqueEnCours = null;
    this.entreDeuxTours = false;
    this.tourHorloge = 0;
    this.animations = !(window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
    activerSons(lireSons());
    // Accès de débogage, utilisé aussi par les tests automatisés de l'écran.
    (window as unknown as { __partie?: unknown }).__partie = {
      ctrl: this.ctrl,
      scene: this,
      actionsLegales,
      position: (id: string) => positionNoeud(this.cour, id),
    };
  }

  create(): void {
    cadrer(this);
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    if (this.textures.exists(DECOR)) {
      decorPlein(this.add.image(LARGEUR / 2, HAUTEUR / 2, DECOR));
    }
    this.dyn = this.add.container(0, 0);
    // Un toucher bref ouvre la fiche ; il faut bouger un peu le doigt pour glisser.
    this.input.dragDistanceThreshold = 12;
    this.rafraichir();
  }

  /** Redessine tout l'écran à partir de l'état. La fiche ouverte est fermée, sauf demande. */
  rafraichir(garderFiche = false): void {
    if (!garderFiche) this.fiche = null;
    // Les animations du plateau s'arrêtent ; celles d'une cinématique continuent.
    for (const t of this.tweens.getTweens()) if (!this.tweensCinematique.has(t)) t.stop();
    this.dyn.removeAll(true);
    this.badges.clear();
    this.surbrillances = [];

    this.dessinerCour();
    // Le contenu du bandeau du haut remonte vers le bord sur un écran allongé (pas son papier, qui
    // va déjà jusqu'au bord).
    const avantHud = this.dyn.length + 1;
    this.dessinerHud();
    for (const o of this.dyn.list.slice(avantHud)) {
      const objet = o as unknown as { y: number };
      objet.y += MONTEE;
    }
    this.dessinerJournal();
    if (this.ctrl.phase === 'jeu') this.dessinerPupitre();
    if (this.ctrl.phase === 'jeu') this.dessinerActions();
    if (this.ctrl.phase === 'jeu' && !this.attenteHorsRang()) this.dessinerRang();
    if (this.ctrl.phase === 'passe') {
      if (this.entreDeuxTours) this.dessinerFinDeTour();
      else this.dessinerPasse();
    }
    if (this.ctrl.phase === 'fin') this.dessinerFin();
    if (this.aideOuverte) this.dessinerAide();
    else this.dessinerConseil();
  }

  private montrerFiche(titre: string, texte: string): void {
    this.fiche = { titre, texte };
    this.rafraichir(true);
  }

  // -------------------------------------------------------------------------
  // Utilitaires
  // -------------------------------------------------------------------------

  private get etat() {
    return this.ctrl.etat;
  }

  private ajouter<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.dyn.add(o);
    return o;
  }

  private texte(
    x: number,
    y: number,
    contenu: string,
    taille: number,
    couleur: string = COULEURS.texteClair,
    options: Phaser.Types.GameObjects.Text.TextStyle = {},
  ): Texte {
    return this.ajouter(
      this.add.text(x, y, contenu, {
        fontFamily: POLICE,
        fontSize: `${taille}px`,
        color: couleur,
        ...options,
      }),
    );
  }

  private pos(id: string): Point {
    return positionNoeud(this.cour, id);
  }

  /** La bande dont c'est le coup. */
  private get bandeActive(): Bande {
    return this.etat.courant;
  }

  /** Un choix est en cours et ne passe pas par le rang (tout sauf le Chouchou). */
  private attenteHorsRang(): boolean {
    const a = this.etat.attente;
    return a !== null && !(a.effet.type === 'pouvoir' && a.effet.role === 'chouchou');
  }

  private pointilles(
    g: Phaser.GameObjects.Graphics,
    a: Point,
    b: Point,
    trait = 12,
    espace = 10,
  ): void {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / d;
    const uy = (b.y - a.y) / d;
    for (let t = 0; t < d; t += trait + espace) {
      const t2 = Math.min(d, t + trait);
      g.lineBetween(a.x + ux * t, a.y + uy * t, a.x + ux * t2, a.y + uy * t2);
    }
  }

  // -------------------------------------------------------------------------
  // La cour
  // -------------------------------------------------------------------------

  private dessinerCour(): void {
    const e = this.etat;
    const g = this.ajouter(this.add.graphics());

    // Allées en pointillés d'encre, comme tracées à la craie grasse sur le goudron.
    for (const [a, b] of this.cour.allees) {
      g.lineStyle(7, COULEURS.encre, 0.55);
      this.pointilles(g, this.pos(a), this.pos(b), 14, 10);
    }

    // Chemin de chaque bande : un gros trait de couleur cerné d'encre.
    for (const b of ['rouge', 'bleu'] as const) {
      const segments = alleesDuChemin(e, b).map((i) => this.cour.allees[i] as [string, string]);
      for (const [largeur, couleur] of [
        [26, COULEURS.encre],
        [18, b === 'rouge' ? COULEURS.rouge : COULEURS.bleu],
      ] as const) {
        g.lineStyle(largeur, couleur, 1);
        for (const [a, c] of segments) {
          const pa = this.pos(a);
          const pc = this.pos(c);
          g.lineBetween(pa.x, pa.y, pc.x, pc.y);
        }
      }
    }

    // Goûters, puis la surveillante qui en garde un.
    const garde = gouterSurveille(e);
    this.cour.regions.forEach((r, i) => {
      const c = this.positionGouter(r.id);
      this.dessinerGouter(i, c.x, c.y, r.bonsPoints, e.regionsPrises[r.id], r.id === garde);
    });

    for (const b of ['rouge', 'bleu'] as const) {
      for (const id of this.cour.cabanes[b]) this.dessinerCabane(id, b);
    }
    this.panneauxLieux.clear();
    for (const b of ['rouge', 'bleu'] as const) {
      this.dessinerPortail(b);
      this.dessinerBureauCpe(b);
    }

    // Îlots : des pastilles molles au trait noir, avec leur nom sur une étiquette.
    const etiquettes: (() => void)[] = [];
    for (const id of this.cour.ilots) {
      const p = this.pos(id);
      const n = this.cour.noeuds[id];
      const special = e.equipements && n?.equipement;
      const gi = this.ajouter(this.add.graphics());
      forme(gi, contourRond(p.x, p.y, RAYON_ILOT, graineDe(p.x, p.y)), {
        remplissage: special ? COULEURS.ilotSpecial : COULEURS.ilot,
        ombre: 8,
        trait: 6,
      });
      // Liseré plus foncé à l'intérieur : la pastille a du volume, comme un gros bouton.
      gi.lineStyle(6, special ? 0xf0b440 : 0x7fcf72, 1);
      gi.strokeCircle(p.x, p.y + 3, RAYON_ILOT - 8);
      // Petit reflet clair, comme sur les dessins.
      gi.lineStyle(5, 0xffffff, 0.6);
      gi.beginPath();
      gi.arc(p.x, p.y, RAYON_ILOT - 10, Math.PI * 1.1, Math.PI * 1.4);
      gi.strokePath();
      // Illustration de l'équipement, posée sur l'îlot derrière l'élève.
      const illustration = special && n?.equipement ? ILLUSTRATIONS[n.equipement] : undefined;
      if (illustration && this.textures.exists(illustration)) {
        // Le dessin fait 324 × 275 pixels (marge des traits comprise) dans une texture de 512 × 512.
        const im = this.add.image(p.x, p.y + RAYON_ILOT * 0.35, illustration);
        im.setOrigin(162 / im.width, 275 / im.height).setScale((RAYON_ILOT * 1.8) / 324);
        this.ajouter(im);
      }
      // Seuls les îlots spéciaux ont un nom (demande de Clément) ; il passe devant les pieds.
      if (special) {
        etiquettes.push(() =>
          this.etiquette(p.x, p.y + RAYON_ILOT + 8, `★ ${n?.nom ?? id}`, COULEURS.jaune),
        );
      }

      // Élèves plaqués : petits badges en colonne à gauche de l'îlot (le plus haut = juste dessous).
      const pileIlot = e.piles[id] ?? [];
      const dessous = pileIlot.slice(0, -1).reverse();
      dessous.slice(0, 4).forEach((el, k) => {
        const mini = creerBadge(this, el.bande, el.role, 26);
        mini.setPosition(p.x - RAYON_ILOT - 22, p.y - 30 + k * 22);
        this.ajouter(mini);
      });

      const dessus = sommet(e, id);
      if (dessus) {
        // Sur la cour, l'élève est en buste dans sa pastille ; on ne le voit entier qu'en main.
        const skin = skinActif();
        const badge = skin.pastille
          ? skin.pastille(this, dessus.bande, dessus.role, DIAMETRE_PASTILLE)
          : skin.eleve(this, dessus.bande, dessus.role, TAILLE_BADGE);
        badge.setPosition(p.x, p.y);
        this.ajouter(badge);
        this.badges.set(id, badge);
        const hauteur = e.piles[id]?.length ?? 0;
        if (hauteur > 1) {
          const cg = this.ajouter(this.add.graphics());
          forme(cg, contourRond(p.x - 40, p.y + 30, 15, graineDe(p.x, p.y) + 3), {
            remplissage: COULEURS.papier,
            trait: 3,
          });
          this.texte(p.x - 40, p.y + 30, `×${hauteur}`, 15, COULEURS.texteSombre, {
            fontStyle: '600',
          }).setOrigin(0.5);
        }
      }
    }

    for (const poser of etiquettes) poser();
    this.dessinerSurveillante();
    if (!this.zonesTactiles()) this.zonesInformation();
    this.bulleEffet();
  }

  /** Étiquette de papier au trait noir, centrée en x, posée sous le point donné. */
  private etiquette(x: number, y: number, contenu: string, fond: number): void {
    const t = this.texte(x, y + 3, contenu, 15, COULEURS.texteSombre, { fontStyle: '600' });
    t.setOrigin(0.5, 0);
    const l = t.width + 16;
    const h = t.height + 6;
    const g = this.add.graphics();
    forme(g, contourRect(x - l / 2, y, l, h, 10, graineDe(x, y), 0.8), {
      remplissage: fond,
      trait: 3,
      ombre: 3,
    });
    // L'étiquette passe sous son texte.
    this.dyn.addAt(g, this.dyn.getIndex(t));
  }

  /** En dehors des choix, toucher un îlot ou une cabane ouvre sa fiche. */
  private zonesInformation(): void {
    if (this.ctrl.phase !== 'jeu') return;
    for (const id of Object.keys(this.cour.noeuds)) {
      const p = this.pos(id);
      const cabane = this.cour.noeuds[id]?.type === 'cabane';
      const zone = this.ajouter(
        cabane
          ? this.add.rectangle(p.x, p.y - 15, 150, 100, 0xffffff, 0.001)
          : this.add.circle(p.x, p.y, RAYON_ILOT + 10, 0xffffff, 0.001),
      );
      zone.setInteractive();
      zone.on('pointerup', () => this.ficheNoeud(id));
    }
    // La surveillante : le goûter qu'elle garde, celui qu'elle gardera ensuite.
    const garde = gouterSurveille(this.etat);
    if (garde) {
      const m = this.positionSurveillante(garde);
      const zs = this.ajouter(this.add.circle(m.x, m.y - 10, 34, 0xffffff, 0.001));
      zs.setInteractive();
      zs.on('pointerup', () =>
        this.montrerFiche(
          TEXTES.surveillante,
          TEXTES.fiche.surveillante(nomGouter(this.cour, garde)),
        ),
      );
    }
    // Goûters : toucher montre les îlots de la zone.
    for (const r of this.cour.regions) {
      const c = this.positionGouter(r.id);
      const zone = this.ajouter(this.add.circle(c.x, c.y, 34, 0xffffff, 0.001));
      zone.setInteractive();
      zone.on('pointerup', () => {
        const prise = this.etat.regionsPrises[r.id];
        const noms = r.ilots.map((id) => this.cour.noeuds[id]?.nom ?? id);
        const gardé = gouterSurveille(this.etat) === r.id;
        this.montrerFiche(
          TEXTES.regionTitre(nomGouter(this.cour, r.id), r.bonsPoints),
          prise
            ? TEXTES.regionPrise(prise, r.bonsPoints)
            : `${TEXTES.region(r.bonsPoints, noms)}${gardé ? ` ${TEXTES.fiche.garde}` : ''}`,
        );
      });
    }
  }

  private ficheNoeud(id: string): void {
    const n = this.cour.noeuds[id];
    if (!n) return;
    const F = TEXTES.fiche;
    if (n.type === 'cabane' && n.bande) {
      this.montrerFiche(TEXTES.bandesTitre[n.bande], F.cabane(n.bande));
      return;
    }
    const morceaux: string[] = [];
    if (this.etat.equipements && n.equipement) {
      morceaux.push(F.special + TEXTES.effetsEquipements[n.equipement]);
    }
    const pile = (this.etat.piles[id] ?? []).slice().reverse();
    morceaux.push(
      pile.length === 0
        ? aide(F.ilotVide, FUN.fiche.ilotVide, this.etat.tour)
        : F.pile(pile.map((el) => F.elevePile(el.role, el.bande, valeur(el.role)))),
    );
    const special = this.etat.equipements && n.equipement;
    this.montrerFiche(special ? n.nom : TEXTES.fiche.titreIlot, morceaux.join(' '));
  }

  /** Bulle « Pouvoir ! » au-dessus de l'îlot qui déclenche le choix en cours. */
  private bulleEffet(): void {
    const a = this.ctrl.phase === 'jeu' ? this.etat.attente : null;
    if (!a) return;
    const p = this.pos(a.effet.ilot);
    const titre =
      a.effet.type === 'pouvoir'
        ? `${TEXTES.rolesCourts[a.effet.role]} : ${TEXTES.choix.bulle}`
        : `★ ${TEXTES.equipements[a.effet.equipement]}`;
    const t = this.texte(p.x, p.y - RAYON_ILOT - 26, titre, 18, COULEURS.texteSombre, {
      fontStyle: 'bold',
      backgroundColor: '#ffe066',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 6, duration: 400, yoyo: true, repeat: -1 });
  }

  private dessinerCabane(id: string, bande: Bande): void {
    const p = this.pos(id);
    const g = this.ajouter(this.add.graphics());
    const couleur = bande === 'rouge' ? COULEURS.rouge : COULEURS.bleu;
    const graine = graineDe(p.x, p.y);
    // Murs, toit, porte : une cabane de bric et de broc au trait noir.
    forme(g, contourRect(p.x - 56, p.y - 22, 112, 62, 8, graine), {
      remplissage: couleur,
      ombre: 6,
    });
    forme(
      g,
      [
        { x: p.x - 72, y: p.y - 18 },
        { x: p.x + 70, y: p.y - 20 },
        { x: p.x + 2, y: p.y - 66 },
      ],
      { remplissage: COULEURS.papier, ombre: 5 },
    );
    forme(g, contourRect(p.x - 13, p.y + 2, 26, 38, 10, graine + 1, 0.6), {
      remplissage: 0x8a5a3b,
      trait: 3,
    });
    // Badge de forme de la bande (rond ou carré), lisible sans les couleurs.
    const forme2 =
      bande === 'rouge'
        ? contourRond(p.x - 34, p.y + 6, 10, graine + 2)
        : contourRect(p.x - 44, p.y - 4, 20, 20, 3, graine + 2, 0.5);
    forme(g, forme2, { remplissage: COULEURS.papier, trait: 3 });
    forme(g, contourRect(p.x + 22, p.y - 6, 22, 20, 3, graine + 3, 0.5), {
      remplissage: 0xbfe4ff,
      trait: 3,
    });
  }

  /** Panneau de papier d'un lieu, avec son titre sur une étiquette ; toucher ouvre sa fiche. */
  private panneauLieu(
    bande: Bande,
    lieu: Lieu,
    titre: string,
    fiche: () => void,
  ): Phaser.GameObjects.Container {
    const p = positionLieu(this.cour, bande, lieu);
    const c = this.add.container(p.x, p.y);
    const g = this.add.graphics();
    const graine = graineDe(p.x, p.y);
    forme(g, contourRect(-62, -34, 124, 76, 14, graine), {
      remplissage: COULEURS.papier,
      ombre: 5,
      trait: 4,
    });
    const t = this.add
      .text(0, -36, titre, {
        fontFamily: POLICE,
        fontSize: '16px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const e = this.add.graphics();
    forme(e, contourRect(-t.width / 2 - 9, -48, t.width + 18, 24, 10, graine + 1, 0.6), {
      remplissage: bande === 'rouge' ? COULEURS.rouge : COULEURS.bleu,
      trait: 3,
    });
    c.add([g, e, t]);
    c.setRotation((bande === 'rouge' ? 1 : -1) * (lieu === 'portail' ? -0.04 : 0.04));
    c.setSize(124, 90);
    if (this.ctrl.phase === 'jeu') {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', fiche);
    }
    this.ajouter(c);
    this.panneauxLieux.set(`${bande}:${lieu}`, c);
    return c;
  }

  /** Le portail : les copains du couloir y attendent qu'on les appelle. */
  private dessinerPortail(bande: Bande): void {
    const j = this.etat.joueurs[bande];
    const n = j.couloir.length;
    const c = this.panneauLieu(bande, 'portail', TEXTES.lieux.portail, () =>
      this.montrerFiche(TEXTES.lieux.fichePortail(bande), TEXTES.lieux.texteCouloir(n)),
    );
    const g = this.add.graphics();
    // Grille du portail : deux piliers et des barreaux.
    g.fillStyle(0xbfb3a0, 1);
    g.lineStyle(3, COULEURS.encre, 1);
    g.fillRect(-52, -16, 10, 50);
    g.strokeRect(-52, -16, 10, 50);
    g.fillRect(-10, -16, 10, 50);
    g.strokeRect(-10, -16, 10, 50);
    g.lineStyle(3, COULEURS.encre, 1);
    for (let x = -38; x <= -14; x += 8) g.lineBetween(x, -10, x, 32);
    g.lineBetween(-42, -6, -10, -6);
    g.lineBetween(-42, 24, -10, 24);
    c.add(g);
    // Les têtes des copains qui attendent derrière la grille (jusqu'à 3).
    for (let k = 0; k < Math.min(3, n); k++) {
      const t = this.add.graphics();
      forme(t, contourRond(-36 + k * 11, 6 - (k % 2) * 4, 9, graineDe(k, n)), {
        remplissage: bande === 'rouge' ? 0xffc2b6 : 0xc3ccff,
        trait: 2,
      });
      c.addAt(t, 3);
    }
    const nombre = this.add
      .text(30, 10, `×${n}`, {
        fontFamily: POLICE,
        fontSize: '26px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    c.add(nombre);
    // Les enrhumés du rang : un mouchoir avec leur nombre, au coin du portail.
    const malades = j.infirmerie.length;
    if (malades > 0) {
      const m = this.add.graphics();
      forme(m, contourRond(52, -28, 17, graineDe(malades, 9)), { remplissage: 0xffffff, trait: 3 });
      m.fillStyle(0xe0503f, 1);
      m.fillRect(48, -39, 8, 22);
      m.fillRect(41, -32, 22, 8);
      const tm = this.add
        .text(68, -12, `${malades}`, {
          fontFamily: POLICE,
          fontSize: '16px',
          color: COULEURS.texteSombre,
          fontStyle: '700',
          backgroundColor: '#ffffff',
          padding: { x: 3, y: 0 },
        })
        .setOrigin(0.5);
      c.add([m, tm]);
    }
  }

  /** Le bureau de la CPE : les élèves punis y sont assis, bras croisés. */
  private dessinerBureauCpe(bande: Bande): void {
    const punis = this.etat.joueurs[bande].cpe;
    const c = this.panneauLieu(bande, 'cpe', TEXTES.lieux.cpe, () =>
      this.montrerFiche(TEXTES.lieux.ficheCpe(bande), TEXTES.lieux.texteCpe(punis.length)),
    );
    const g = this.add.graphics();
    // Porte vitrée du bureau.
    forme(g, contourRect(-54, -18, 34, 52, 4, graineDe(bande.length, 3), 0.5), {
      remplissage: 0x8a5a3b,
      trait: 3,
    });
    forme(g, contourRect(-48, -12, 22, 16, 3, graineDe(bande.length, 4), 0.5), {
      remplissage: 0xbfe4ff,
      trait: 2,
    });
    g.fillStyle(COULEURS.jaune, 1);
    g.fillCircle(-26, 12, 3);
    c.add(g);
    // Les punis, en petits badges (les 4 derniers arrivés), et leur nombre s'ils sont plus.
    punis.slice(-4).forEach((el, k) => {
      const b = creerBadge(this, el.bande, el.role, 24);
      b.setPosition(-2 + (k % 2) * 26, -4 + Math.floor(k / 2) * 26);
      c.add(b);
    });
    if (punis.length > 4 || punis.length === 0) {
      c.add(
        this.add
          .text(40, 10, punis.length === 0 ? '0' : `×${punis.length}`, {
            fontFamily: POLICE,
            fontSize: '22px',
            color: COULEURS.texteSombre,
            fontStyle: '700',
          })
          .setOrigin(0.5),
      );
    }
  }

  /** Centre d'une zone, légèrement décalé pour ne pas gêner les allées. */
  private positionGouter(regionId: string): Point {
    const r = this.cour.regions.find((x) => x.id === regionId);
    if (!r) return { x: 0, y: 0 };
    const c = centreRegion(this.cour, r.ilots);
    const decalage = r.id === 'haut' ? -18 : r.id === 'bas' ? -22 : 0;
    return { x: c.x, y: c.y + decalage };
  }

  /** Où se tient la surveillante quand elle garde ce goûter : juste à côté. */
  private positionSurveillante(regionId: string): Point {
    const c = this.positionGouter(regionId);
    return { x: c.x + 42, y: c.y + 4 };
  }

  /** Mme Josiane : l'illustration générée, ou à défaut un dessin au trait (robe lilas, chignon). */
  private silhouette(x: number, y: number, alpha: number): void {
    if (this.textures.exists(JOSIANE)) {
      const ombre = this.ajouter(this.add.graphics());
      ombre.fillStyle(COULEURS.encre, 0.25);
      ombre.fillEllipse(x + 2, y + 30, 46, 12);
      const hauteur = 100;
      // L'image fait 170 × 444 pixels (marge des traits comprise), dans une texture plus grande
      // (puissance de 2, pour les mipmaps).
      const corps = new Gelee(this, {
        cle: JOSIANE,
        echelle: hauteur / 444,
        pivot: 444,
        centreX: 85,
      });
      const josiane = this.add.container(x, y + 30, corps.objets).setAlpha(alpha);
      this.ajouter(josiane);
      this.josiane = josiane;
      rendreVivant(this, corps, josiane, { hauteur, caractere: 'surveillante' });
      return;
    }
    const g = this.ajouter(this.add.graphics());
    g.setAlpha(alpha);
    const graine = graineDe(x, y);
    g.fillStyle(COULEURS.encre, 0.25);
    g.fillEllipse(x + 2, y + 30, 44, 12);
    // Jambes en nouilles et chaussures.
    g.lineStyle(7, COULEURS.encre, 1);
    g.lineBetween(x - 7, y + 14, x - 9, y + 28);
    g.lineBetween(x + 7, y + 14, x + 9, y + 28);
    g.lineStyle(4, 0xf5d0b5, 1);
    g.lineBetween(x - 7, y + 14, x - 9, y + 27);
    g.lineBetween(x + 7, y + 14, x + 9, y + 27);
    // Robe.
    forme(
      g,
      [
        { x: x - 22, y: y + 18 },
        { x: x + 22, y: y + 18 },
        { x: x + 11, y: y - 14 },
        { x: x - 11, y: y - 14 },
      ],
      { remplissage: COULEURS.surveillante, trait: 3 },
    );
    // Tête, chignon, lunettes.
    forme(g, contourRond(x, y - 26, 13, graine), { remplissage: 0xf5d0b5, trait: 3 });
    forme(g, contourRond(x + 2, y - 42, 8, graine + 1), { remplissage: 0x8a6a8f, trait: 3 });
    g.lineStyle(2, COULEURS.encre, 1);
    g.strokeCircle(x - 5, y - 26, 4);
    g.strokeCircle(x + 5, y - 26, 4);
    // Sifflet jaune au bout d'un cordon.
    g.lineBetween(x - 4, y - 14, x + 2, y - 4);
    forme(g, contourRond(x + 3, y - 3, 4, graine + 2), { remplissage: COULEURS.jaune, trait: 2 });
  }

  /** Une friandise par zone (chocolat, biscuits, bonbon, sucette) avec sa valeur. */
  /** La friandise d'une zone : tablette de chocolat, biscuits, bonbon ou sucette. */
  private dessinerFriandise(
    g: Phaser.GameObjects.Graphics,
    index: number,
    x: number,
    y: number,
  ): void {
    const contour = (): void => {
      g.lineStyle(3, COULEURS.encre, 1);
    };
    switch (index % 4) {
      case 0: // Tablette de chocolat
        g.fillStyle(0x6b3e1f, 1);
        contour();
        g.fillRoundedRect(x - 26, y - 17, 52, 34, 5);
        g.strokeRoundedRect(x - 26, y - 17, 52, 34, 5);
        g.lineStyle(2, 0x4a2a14, 1);
        for (const dx of [-9, 9]) g.lineBetween(x + dx, y - 15, x + dx, y + 15);
        g.lineBetween(x - 24, y, x + 24, y);
        g.fillStyle(0xd9d9d9, 1);
        g.fillTriangle(x + 10, y + 17, x + 26, y + 17, x + 26, y + 3);
        break;
      case 1: // Paquet de biscuits : deux biscuits ronds
        g.fillStyle(0xd9a25a, 1);
        contour();
        for (const dx of [-12, 12]) {
          g.fillCircle(x + dx, y, 17);
          g.strokeCircle(x + dx, y, 17);
        }
        g.fillStyle(0x7a4a22, 1);
        for (const [dx, dy] of [
          [-17, -5],
          [-8, 6],
          [9, -6],
          [17, 5],
        ] as const)
          g.fillCircle(x + dx, y + dy, 3);
        break;
      case 2: // Bonbon emballé
        g.fillStyle(0xe86aa6, 1);
        contour();
        g.fillTriangle(x - 30, y - 12, x - 30, y + 12, x - 12, y);
        g.strokeTriangle(x - 30, y - 12, x - 30, y + 12, x - 12, y);
        g.fillTriangle(x + 30, y - 12, x + 30, y + 12, x + 12, y);
        g.strokeTriangle(x + 30, y - 12, x + 30, y + 12, x + 12, y);
        g.fillCircle(x, y, 16);
        g.strokeCircle(x, y, 16);
        break;
      default: // Sucette
        g.lineStyle(5, COULEURS.craie, 1);
        g.lineBetween(x, y + 6, x, y + 30);
        g.fillStyle(0xf2994a, 1);
        contour();
        g.fillCircle(x, y - 4, 18);
        g.strokeCircle(x, y - 4, 18);
        g.lineStyle(3, 0xffe066, 1);
        g.beginPath();
        g.arc(x, y - 4, 9, 0, Math.PI * 1.5);
        g.strokePath();
        break;
    }
  }

  private dessinerGouter(
    index: number,
    x: number,
    y: number,
    points: number,
    prise: Bande | undefined,
    garde: boolean,
  ): void {
    const g = this.ajouter(this.add.graphics());
    if (prise) {
      forme(g, contourRond(x, y, 30, graineDe(x, y)), {
        remplissage: prise === 'rouge' ? COULEURS.rouge : COULEURS.bleu,
        trait: 3,
      });
    } else if (garde) {
      // Le goûter gardé : un rond lilas en pointillés autour.
      g.lineStyle(4, COULEURS.surveillante, 1);
      const n = 14;
      for (let k = 0; k < n; k += 2) {
        g.beginPath();
        g.arc(x, y, 36, (k / n) * Math.PI * 2, ((k + 1) / n) * Math.PI * 2);
        g.strokePath();
      }
    }
    g.setAlpha(prise ? 0.8 : 1);
    this.dessinerFriandise(g, index, x, y);
    const t = this.texte(x - 26, y - 24, `+${points}`, 17, COULEURS.texteSombre, {
      fontStyle: '700',
    }).setOrigin(0.5);
    const fond = this.add.graphics();
    forme(fond, contourRond(t.x, t.y, 15, graineDe(x, y) + 5), {
      remplissage: COULEURS.jaune,
      trait: 3,
    });
    this.dyn.addAt(fond, this.dyn.getIndex(t));
  }

  private dessinerSurveillante(): void {
    this.josiane = null;
    const garde = gouterSurveille(this.etat);
    if (!garde) return;
    const { x, y } = this.positionSurveillante(garde);
    this.silhouette(x, y, 1);
    this.etiquette(x, y + 34, TEXTES.surveillante, COULEURS.papier);
  }

  /** Îlots touchables pendant certains choix (Rapporteuse, banc, buts, toboggan). */
  private zonesTactiles(): boolean {
    if (this.ctrl.phase !== 'jeu') return false;
    const attente = this.etat.attente;
    if (!attente) return false;
    const touchables = new Map<string, () => void>();
    for (const o of attente.options) {
      if (o.type === 'cpe' || o.type === 'rappeler') {
        touchables.set(o.ilot, () => this.choisir(o));
      } else if (o.type === 'glisser') {
        if (this.departToboggan === null) {
          touchables.set(o.depart, () => {
            this.departToboggan = o.depart;
            this.rafraichir();
          });
        } else if (o.depart === this.departToboggan) {
          touchables.set(o.arrivee, () => this.choisir(o));
        }
      }
    }
    for (const [id, action] of touchables) {
      const p = this.pos(id);
      this.anneauCible(p, RAYON_ILOT + 8);
      const badge = this.badges.get(id);
      if (badge) this.trembler(badge);
      const zone = this.ajouter(this.add.circle(p.x, p.y, RAYON_ILOT + 10, 0xffffff, 0.001));
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', action);
    }
    this.ciblesDesPouvoirs();
    return true;
  }

  /**
   * Les pouvoirs sans îlot à viser se jouent aussi sur la cour : on touche le lieu ou le
   * personnage concerné. Piocher = son portail ; éternuer = le portail adverse ; mot d'excuse =
   * Mme Josiane ; récupérer un puni = son badge, qui sort du bureau de la CPE.
   */
  private ciblesDesPouvoirs(): void {
    const attente = this.etat.attente;
    if (!attente) return;
    const bande = this.bandeActive;
    const adverse: Bande = bande === 'rouge' ? 'bleu' : 'rouge';
    const source = this.pos(attente.effet.ilot);
    const T = TEXTES.pouvoirsSurLaCour;
    const repeches: Option[] = [];
    for (const o of attente.options) {
      if (o.type === 'piocher') {
        this.cibleLieu(source, positionLieu(this.cour, bande, 'portail'), 72, T.piocher, () =>
          this.choisir(o),
        );
      } else if (o.type === 'infirmerie') {
        this.cibleLieu(source, positionLieu(this.cour, adverse, 'portail'), 72, T.eternuer, () =>
          this.choisir(o),
        );
      } else if (o.type === 'surveillante') {
        const garde = gouterSurveille(this.etat);
        if (garde) {
          const m = this.positionSurveillante(garde);
          this.cibleLieu(source, { x: m.x, y: m.y - 6 }, 54, T.motExcuse, () => this.choisir(o));
        }
      } else if (o.type === 'repecher') {
        repeches.push(o);
      }
    }
    // Les punis qu'on peut récupérer sortent du bureau de la CPE, un badge par rôle.
    if (repeches.length > 0) {
      const cpe = positionLieu(this.cour, bande, 'cpe');
      const punis = this.etat.joueurs[bande].cpe;
      const vus = new Set<string>();
      const choix: { role: RoleId; option: Option }[] = [];
      for (const o of repeches) {
        const el = o.type === 'repecher' ? punis.find((x) => x.id === o.eleveId) : undefined;
        if (el && !vus.has(el.role)) {
          vus.add(el.role);
          choix.push({ role: el.role, option: o });
        }
      }
      // Au-dessus du bureau pour la bande du bas, en dessous pour celle du haut.
      const sens = bande === 'rouge' ? -1 : 1;
      choix.forEach(({ role, option }, i) => {
        const x = cpe.x + (i - (choix.length - 1) / 2) * 62;
        const y = cpe.y + sens * 96;
        const b = this.ajouter(creerBadge(this, bande, role, 46));
        b.setPosition(x, y);
        this.anneauCible({ x, y }, 32);
        this.tweens.add({ targets: b, y: y - 6, duration: 380, yoyo: true, repeat: -1 });
        const zone = this.ajouter(this.add.circle(x, y, 34, 0xffffff, 0.001));
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => this.choisir(option));
      });
      this.etiquetteVerbe(cpe.x, cpe.y + sens * 150, T.recuperer);
    }
  }

  /** Une cible du pouvoir : anneau qui pulse, flèche depuis l'élève, verbe sur une étiquette. */
  private cibleLieu(
    depuis: Point,
    p: Point,
    rayon: number,
    verbe: string,
    action: () => void,
  ): void {
    this.flecheCraie(depuis, p, rayon);
    this.anneauCible(p, rayon);
    // Sous la cible quand elle est tout en haut de la cour (le bandeau la cacherait).
    const dessus = p.y - rayon - 22 > 150 + MONTEE;
    this.etiquetteVerbe(p.x, dessus ? p.y - rayon - 22 : p.y + rayon + 22, verbe);
    const zone = this.ajouter(this.add.circle(p.x, p.y, rayon + 8, 0xffffff, 0.001));
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', action);
  }

  /** Flèche en pointillés jaunes, de l'élève qui a le pouvoir vers sa cible. */
  private flecheCraie(a: Point, b: Point, marge: number): void {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < marge + RAYON_ILOT + 20) return;
    const ux = (b.x - a.x) / d;
    const uy = (b.y - a.y) / d;
    const debut = { x: a.x + ux * (RAYON_ILOT + 8), y: a.y + uy * (RAYON_ILOT + 8) };
    const fin = { x: b.x - ux * (marge + 10), y: b.y - uy * (marge + 10) };
    const g = this.ajouter(this.add.graphics());
    g.lineStyle(10, COULEURS.encre, 0.55);
    this.pointilles(g, debut, fin, 18, 12);
    g.lineStyle(6, COULEURS.allume, 1);
    this.pointilles(g, debut, fin, 18, 12);
    // Pointe de la flèche.
    const px = -uy;
    const py = ux;
    const pointe = [
      { x: fin.x + ux * 16, y: fin.y + uy * 16 },
      { x: fin.x - ux * 6 + px * 14, y: fin.y - uy * 6 + py * 14 },
      { x: fin.x - ux * 6 - px * 14, y: fin.y - uy * 6 - py * 14 },
    ];
    forme(g, pointe, { remplissage: COULEURS.allume, trait: 3 });
    this.tweens.add({ targets: g, alpha: 0.55, duration: 420, yoyo: true, repeat: -1 });
  }

  private etiquetteVerbe(x: number, y: number, verbe: string): void {
    const t = this.texte(x, y, verbe, 20, COULEURS.texteSombre, { fontStyle: '700' }).setOrigin(
      0.5,
    );
    const l = t.width + 22;
    const g = this.add.graphics();
    forme(g, contourRect(x - l / 2, y - 17, l, 34, 14, graineDe(x, y), 0.8), {
      remplissage: COULEURS.jaune,
      trait: 3,
      ombre: 3,
    });
    this.dyn.addAt(g, this.dyn.getIndex(t));
    const groupe = [g, t];
    this.tweens.add({ targets: groupe, y: '-=5', duration: 420, yoyo: true, repeat: -1 });
  }

  private anneauCible(p: Point, rayon: number): Phaser.GameObjects.Arc {
    const anneau = this.ajouter(this.add.circle(p.x, p.y, rayon));
    anneau.setStrokeStyle(7, COULEURS.allume, 1);
    this.tweens.add({
      targets: anneau,
      alpha: 0.35,
      scale: 1.08,
      duration: 450,
      yoyo: true,
      repeat: -1,
    });
    return anneau;
  }

  private trembler(cible: Phaser.GameObjects.Container): void {
    const x = cible.x;
    this.tweens.add({
      targets: cible,
      x: x + 4,
      duration: 45,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private choisir(option: Option): void {
    this.departToboggan = null;
    this.agir(() => this.ctrl.choisir(option));
  }

  /**
   * Joue une action du contrôleur, redessine, puis anime ce qui vient d'arriver
   * (d'après les nouvelles lignes du journal).
   */
  private agir(action: () => boolean, grandsFreres = false): boolean {
    const avant = this.etat.journal.length;
    if (!action()) return false;
    const nouveaux = this.etat.journal.slice(avant);
    const duree = this.animations ? dureeAnimations(nouveaux) : 0;
    if (this.ctrl.phase === 'passe' && this.animations) {
      // Coup terminé : le temps de voir l'élève atterrir et ses conséquences, puis on passe le
      // téléphone.
      this.entreDeuxTours = true;
      this.time.delayedCall(Math.max(DUREE_FIN_DE_TOUR, duree + 250), () => {
        this.entreDeuxTours = false;
        this.rafraichir();
      });
    }
    // Les goûters ramassés volent jusqu'au cartable : leurs cases se remplissent à l'arrivée.
    if (this.animations) {
      for (const ev of nouveaux) {
        if (ev.type === 'region') this.gouterEnVol[ev.bande] += ev.bonsPoints;
      }
    }
    this.rafraichir();
    this.gouterEnVol = { rouge: 0, bleu: 0 };
    this.animer(nouveaux, grandsFreres, duree);
    return true;
  }

  // -------------------------------------------------------------------------
  // Bandeau du haut, journal, actions
  // -------------------------------------------------------------------------

  private dessinerHud(): void {
    const e = this.etat;
    const g = this.ajouter(this.add.graphics());
    // Bandeau de papier en haut, bord inférieur un peu tremblé.
    forme(
      g,
      contourRect(GAUCHE - 20, HAUT - 30, DROITE - GAUCHE + 40, 124 - HAUT + MONTEE, 22, 7),
      {
        remplissage: COULEURS.papier,
        ombre: 5,
      },
    );

    // Le cartable de chaque bande : une case par goûter à ramasser, remplie au fur et à mesure.
    for (const b of ['rouge', 'bleu'] as const) {
      const x = b === 'rouge' ? 112 : LARGEUR - 112;
      this.dessinerCartable(b, x, 50, e.joueurs[b].bonsPoints - this.gouterEnVol[b]);
    }

    // La pendule de l'école : elle avance à chaque tour (la règle de la sonnerie ne change pas).
    this.dessinerHorloge(LARGEUR / 2, 24, e.tour);
    if (this.ctrl.phase === 'jeu') {
      this.ajouter(
        creerBouton(
          this,
          LARGEUR / 2 + 52,
          26,
          TEXTES.hud.aide,
          () => {
            this.aideOuverte = true;
            this.rafraichir();
          },
          { largeur: 38, hauteur: 36, taille: 22, couleur: COULEURS.jaune },
        ),
      );
    }
    if (this.ctrl.phase !== 'fin') {
      const b = this.bandeActive;
      const t = this.texte(LARGEUR / 2, 76, TEXTES.hud.tourDe(b), 21, COULEURS.texteSombre, {
        fontStyle: '700',
      }).setOrigin(0.5);
      const l = t.width + 28;
      const fond = this.add.graphics();
      forme(fond, contourRect(LARGEUR / 2 - l / 2, 60, l, 33, 16, 11), {
        remplissage: b === 'rouge' ? COULEURS.rouge : COULEURS.bleu,
        trait: 3,
        ombre: 3,
      });
      this.dyn.addAt(fond, this.dyn.getIndex(t));
    }
  }

  /** Cases du cartable d'une bande, en coordonnées d'écran (pour y faire voler les goûters). */
  private casesCartable(bande: Bande, cx: number, cy: number): Point[] {
    const n = Math.max(1, this.cour.seuilBonsPoints);
    const ecart = 34;
    // La bande rouge remplit de gauche à droite, la bleue de droite à gauche (vers le centre).
    return Array.from({ length: n }, (_, i) => {
      const k = bande === 'rouge' ? i : n - 1 - i;
      return { x: cx + (k - (n - 1) / 2) * ecart, y: cy + 6 };
    });
  }

  private dessinerCartable(bande: Bande, cx: number, cy: number, points: number): void {
    const g = this.ajouter(this.add.graphics());
    const couleur = bande === 'rouge' ? COULEURS.rouge : COULEURS.bleu;
    const n = Math.max(1, this.cour.seuilBonsPoints);
    const l = n * 34 + 34;
    const graine = graineDe(cx, cy);
    // Poignée, sac, rabat : un cartable d'écolier au trait noir.
    g.lineStyle(5, COULEURS.encre, 1);
    g.beginPath();
    g.arc(cx, cy - 22, 15, Math.PI, 0);
    g.strokePath();
    forme(g, contourRect(cx - l / 2, cy - 24, l, 56, 14, graine), {
      remplissage: couleur,
      ombre: 4,
      trait: 4,
    });
    forme(g, contourRect(cx - l / 2 + 6, cy - 24, l - 12, 14, 6, graine + 1, 0.6), {
      remplissage: 0xffffff,
      trait: 3,
    });
    const cases = this.casesCartable(bande, cx, cy);
    cases.forEach((c, i) => {
      const plein = i < points;
      const f = this.ajouter(this.add.graphics());
      const contour =
        bande === 'rouge'
          ? contourRond(c.x, c.y, 13, graine + 2 + i)
          : contourRect(c.x - 13, c.y - 13, 26, 26, 5, graine + 2 + i, 0.5);
      forme(f, contour, { remplissage: plein ? COULEURS.jaune : 0xfff4dc, trait: 3 });
      if (plein) this.dessinerBiscuit(f, c.x, c.y, 8);
    });
    this.cartables[bande] = cases;
  }

  /** Un petit biscuit rond : la case pleine d'un cartable, ou le goûter qui vole vers lui. */
  private dessinerBiscuit(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.fillStyle(0xd9a25a, 1);
    g.lineStyle(2, COULEURS.encre, 1);
    g.fillCircle(x, y, r);
    g.strokeCircle(x, y, r);
    g.fillStyle(0x7a4a22, 1);
    g.fillCircle(x - r * 0.35, y - r * 0.2, r * 0.18);
    g.fillCircle(x + r * 0.3, y + r * 0.3, r * 0.18);
  }

  /** La pendule de l'école. Elle prend cinq minutes de plus à chaque tour, à partir de 10 h. */
  private dessinerHorloge(cx: number, cy: number, tour: number): void {
    const g = this.ajouter(this.add.graphics());
    const r = 21;
    forme(g, contourRond(cx, cy, r, 77), { remplissage: 0xffffff, trait: 4, ombre: 3 });
    g.lineStyle(2, COULEURS.encre, 1);
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      const r1 = h % 3 === 0 ? r - 7 : r - 4;
      g.lineBetween(
        cx + Math.sin(a) * r1,
        cy - Math.cos(a) * r1,
        cx + Math.sin(a) * (r - 2),
        cy - Math.cos(a) * (r - 2),
      );
    }
    const minutes = (tour - 1) * 5;
    const angleMinute = (minutes / 60) * Math.PI * 2;
    const angleHeure = ((10 + minutes / 60) / 12) * Math.PI * 2;
    const aiguille = (
      angle: number,
      longueur: number,
      epaisseur: number,
    ): Phaser.GameObjects.Rectangle => {
      const a = this.ajouter(this.add.rectangle(cx, cy, epaisseur, longueur, COULEURS.encre));
      a.setOrigin(0.5, 1).setRotation(angle);
      return a;
    };
    aiguille(angleHeure, r * 0.5, 4);
    const grande = aiguille(angleMinute, r * 0.8, 3);
    g.fillStyle(COULEURS.rouge, 1);
    g.fillCircle(cx, cy, 3);
    // Quand le tour change, la grande aiguille avance d'un coup sec, comme une vraie pendule.
    if (this.animations && this.tourHorloge !== 0 && this.tourHorloge !== tour) {
      grande.setRotation(angleMinute - Math.PI / 6);
      this.tweens.add({
        targets: grande,
        rotation: angleMinute,
        duration: 380,
        ease: 'Back.easeOut',
      });
    }
    this.tourHorloge = tour;
  }

  private dessinerJournal(): void {
    if (this.fiche) {
      this.dessinerFiche(this.fiche.titre, this.fiche.texte);
      return;
    }
    const attente = this.ctrl.phase === 'jeu' ? this.etat.attente : null;
    const g = this.ajouter(this.add.graphics());
    panneau(g, 16, Y_JOURNAL - 14, LARGEUR - 32, 84, {
      remplissage: attente ? COULEURS.jaune : COULEURS.papier,
    });
    if (attente) {
      this.texte(LARGEUR / 2, Y_JOURNAL + 28, this.consigne(), 19, COULEURS.texteSombre, {
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: LARGEUR - 64 },
      }).setOrigin(0.5);
      return;
    }
    // On garde les lignes les plus récentes qui tiennent dans le cadre (avec retour à la ligne).
    const lignes = dernieresLignes(this.etat.journal, this.cour, 2, tonFun());
    const t = this.texte(32, Y_JOURNAL + 62, '', 19, COULEURS.texteSombre, {
      wordWrap: { width: LARGEUR - 64 },
      lineSpacing: 1,
      fontStyle: '500',
    }).setOrigin(0, 1);
    while (lignes.length > 0) {
      t.setText(lignes.join('\n'));
      if (t.height <= 72 || lignes.length === 1) break;
      lignes.shift();
    }
  }

  /** Fiche dans le cadre du journal : un titre jaune et une explication. */
  private dessinerFiche(titre: string, texte: string): Phaser.GameObjects.Container {
    const fond = this.add.graphics();
    panneau(fond, 16, Y_JOURNAL - 14, LARGEUR - 32, 84);
    const t1 = this.add.text(32, Y_JOURNAL - 26, titre, {
      fontFamily: POLICE,
      fontSize: '18px',
      color: COULEURS.texteSombre,
      fontStyle: '700',
    });
    const etiquette = this.add.graphics();
    forme(etiquette, contourRect(22, Y_JOURNAL - 30, t1.width + 22, 30, 12, 13), {
      remplissage: COULEURS.jaune,
      trait: 3,
      ombre: 3,
    });
    const t2 = this.add.text(32, Y_JOURNAL + 8, texte, {
      fontFamily: POLICE,
      fontSize: '16px',
      color: COULEURS.texteSombre,
      fontStyle: '500',
      wordWrap: { width: LARGEUR - 64 },
    });
    const c = this.add.container(0, 0, [fond, etiquette, t1, t2]);
    this.ajouter(c);
    return c;
  }

  /** Les consignes des choix, didactiques ou pour rire selon le ton. */
  private choixTextes(): Record<keyof typeof FUN.choix, string> {
    const d = TEXTES.choix;
    const f = FUN.choix;
    const g = this.etat.tour;
    const r = {} as Record<keyof typeof FUN.choix, string>;
    for (const k of Object.keys(f) as (keyof typeof FUN.choix)[]) r[k] = aide(d[k], f[k], g);
    return r;
  }

  private consigne(): string {
    const a = this.etat.attente;
    if (!a) return '';
    const c = this.choixTextes();
    if (a.effet.type === 'pouvoir') {
      switch (a.effet.role) {
        case 'populaire':
          return c.populaire;
        case 'chouchou':
          return c.chouchou;
        case 'rapporteuse':
          return c.rapporteuse;
        case 'contagieux':
          return c.contagieux;
        case 'delegue':
          return c.delegue;
        default:
          return '';
      }
    }
    switch (a.effet.equipement) {
      case 'banc':
        return c.banc;
      case 'cabanePerchee':
        return c.cabanePerchee;
      case 'porteVieScolaire':
        return c.porteVieScolaire;
      case 'buts':
        return c.buts;
      case 'toboggan':
        return this.departToboggan ? c.tobogganArrivee : c.tobogganDepart;
      default:
        return '';
    }
  }

  private rangeeBoutons(
    y: number,
    boutons: { texte: string; action: () => void; couleur?: number }[],
  ): void {
    const n = boutons.length;
    if (n === 0) return;
    const ecart = 12;
    const largeur = Math.min(300, (LARGEUR - 40 - ecart * (n - 1)) / n);
    boutons.forEach((b, i) => {
      const x = LARGEUR / 2 + (i - (n - 1) / 2) * (largeur + ecart);
      this.ajouter(
        creerBouton(this, x, y, b.texte, b.action, {
          largeur,
          hauteur: 58,
          taille: largeur < 140 ? 20 : 24,
          ...(b.couleur !== undefined ? { couleur: b.couleur } : {}),
        }),
      );
    });
  }

  /** Le pupitre en bas de l'écran : un grand papier sous les boutons et le rang. */
  private dessinerPupitre(): void {
    const g = this.ajouter(this.add.graphics());
    forme(
      g,
      contourRect(GAUCHE - 20, Y_ACTIONS - 42, DROITE - GAUCHE + 40, BAS - Y_ACTIONS + 80, 26, 17),
      {
        remplissage: 0xffe9c2,
        ombre: 0,
      },
    );
    // Lignes de cahier, discrètes.
    g.lineStyle(2, 0x9fc3e8, 0.5);
    for (let y = Y_ACTIONS + 52; y < BAS; y += 34) g.lineBetween(GAUCHE, y, DROITE, y);
    g.lineStyle(2, 0xf0705f, 0.45);
    g.lineBetween(24, Y_ACTIONS - 40, 24, BAS);
  }

  private dessinerActions(): void {
    const ctrl = this.ctrl;

    const attente = this.etat.attente;
    if (!attente) {
      const boutons: { texte: string; action: () => void; couleur?: number }[] = [];
      const n = ctrl.nombreAppel;
      if (n > 0) {
        boutons.push({
          texte: TEXTES.boutons.appeler(n),
          couleur: COULEURS.allume,
          action: () => {
            this.agir(() => ctrl.appeler());
          },
        });
      }
      const j = this.etat.joueurs[this.etat.courant];
      const peutPoser = j.rang.some(
        (el) => !j.infirmerie.includes(el.id) && ciblesPossibles(this.etat, el.id).length > 0,
      );
      if (boutons.length === 1 && n > 0) {
        // Consigne à gauche, bouton « Appeler » à droite.
        this.texte(
          30,
          Y_ACTIONS,
          peutPoser
            ? aide(TEXTES.hud.consigneTour, FUN.hud.consigneTour, this.etat.tour)
            : aide(TEXTES.hud.consigneSansPose, FUN.hud.consigneSansPose, this.etat.tour),
          18,
          COULEURS.texteSombre,
          { wordWrap: { width: 330 }, fontStyle: '600' },
        ).setOrigin(0, 0.5);
        const b = boutons[0] as (typeof boutons)[number];
        this.ajouter(
          creerBouton(this, LARGEUR - 185, Y_ACTIONS, b.texte, b.action, {
            largeur: 320,
            hauteur: 58,
            taille: 24,
            couleur: COULEURS.jaune,
          }),
        );
        return;
      }
      this.rangeeBoutons(Y_ACTIONS, boutons);
      return;
    }

    // Choix d'un pouvoir ou d'un équipement : il se joue en touchant sa cible sur la cour
    // (voir `ciblesDesPouvoirs`) ; il ne reste ici que « Passer ».
    const options: { texte: string; action: () => void; couleur?: number }[] = [];
    const lignes: (typeof options)[] = [];
    for (let i = 0; i < options.length; i += 4) lignes.push(options.slice(i, i + 4));
    // « Passer » ne sert presque jamais (demande de Clément) : on le garde seulement pour le banc,
    // où reprendre un de ses propres élèves est un vrai choix. Ailleurs, on touche la cible.
    // Filet de sécurité : sans surveillante à toucher, le mot d'excuse se passe aussi.
    const sansCible =
      attente.options.every((o) => o.type === 'surveillante') && !gouterSurveille(this.etat);
    const passerUtile =
      (attente.effet.type === 'equipement' && attente.effet.equipement === 'banc') || sansCible;
    const fin = passerUtile
      ? [
          {
            texte: TEXTES.boutons.passer,
            action: () => {
              this.departToboggan = null;
              this.agir(() => ctrl.passer());
            },
          },
        ]
      : [];
    if (this.attenteHorsRang()) {
      if (fin.length > 0) lignes.push(fin);
      lignes.forEach((l, i) => this.rangeeBoutons(Y_ACTIONS + i * 72, l));
    } else {
      // Chouchou : on garde le rang visible pour y prendre le 2e élève.
      this.rangeeBoutons(Y_ACTIONS, fin);
    }
  }

  // -------------------------------------------------------------------------
  // Le rang et le glisser-déposer
  // -------------------------------------------------------------------------

  private dessinerRang(): void {
    const e = this.etat;
    const bande = e.courant;
    const j = e.joueurs[bande];
    // Le couloir et la CPE sont dessinés autour de la cour (portail, bureau) : plus de compteurs ici.
    if (j.rang.length > 0) {
      this.texte(
        LARGEUR - 30,
        RANG.y - RANG.hauteurCarte / 2 - 28,
        aide(TEXTES.hud.toucherCarte, FUN.hud.toucherCarte, this.etat.tour),
        15,
        '#6b6152',
        { fontStyle: '500' },
      ).setOrigin(1, 0);
    }
    if (j.rang.length === 0) {
      this.texte(
        LARGEUR / 2,
        RANG.y,
        aide(TEXTES.hud.rangVide, FUN.hud.rangVide, this.etat.tour),
        22,
        COULEURS.texteSombre,
        { fontStyle: '600', align: 'center', wordWrap: { width: LARGEUR - 80 } },
      ).setOrigin(0.5);
      return;
    }
    const attente = e.attente;
    const optionsChouchou =
      attente?.options.filter((o): o is Extract<Option, { type: 'poser' }> => o.type === 'poser') ??
      null;

    j.rang.forEach((el, i) => {
      const malade = j.infirmerie.includes(el.id);
      const cibles = optionsChouchou
        ? optionsChouchou.filter((o) => o.eleveId === el.id).map((o) => o.cible)
        : malade
          ? []
          : ciblesPossibles(e, el.id);
      const carte = this.carte(el, xCarteRang(i, j.rang.length), RANG.y, malade, cibles.length > 0);
      this.rendreTouchable(carte, el, malade, cibles.length > 0);
      if (cibles.length > 0) this.rendreDeplacable(carte, el, cibles, optionsChouchou !== null);
    });
  }

  private carte(
    el: Eleve,
    x: number,
    y: number,
    malade: boolean,
    jouable: boolean,
  ): Phaser.GameObjects.Container {
    const { largeurCarte: l, hauteurCarte: h } = RANG;
    const g = this.add.graphics();
    const graine = graineDe(x, y) + el.role.length;
    forme(g, contourRect(-l / 2, -h / 2, l, h, 12, graine, 1), {
      remplissage: el.bande === 'rouge' ? 0xffe1d9 : 0xe1e6ff,
      ombre: 5,
      trait: 3,
    });
    // Tête et débardeur seulement : la carte montre la chasuble de l'élève.
    const skin = skinActif();
    const badge = skin.buste
      ? skin.buste(this, el.bande, el.role, l - 8, h - 44)
      : skin.eleve(this, el.bande, el.role, 56);
    badge.setPosition(0, skin.buste ? -18 : -24);
    const nom = this.add
      .text(0, 52, TEXTES.rolesCourts[el.role], {
        fontFamily: POLICE,
        fontSize: TEXTES.rolesCourts[el.role].length > 9 ? '13px' : '15px',
        color: COULEURS.texteSombre,
        fontStyle: '600',
        align: 'center',
        wordWrap: { width: l - 4 },
      })
      .setOrigin(0.5);
    const enfants: Phaser.GameObjects.GameObject[] = [g, badge, nom];
    if (malade) {
      const voile = this.add.graphics();
      voile.fillStyle(0xbfe3b0, 0.8);
      voile.fillPoints(contourRect(-l / 2, -h / 2, l, h, 12, graine, 1), true);
      const t = this.add
        .text(0, 0, TEXTES.hud.infirmerie, {
          fontFamily: POLICE,
          fontSize: '15px',
          color: COULEURS.texteSombre,
          fontStyle: '700',
          backgroundColor: '#ffffff',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setRotation(-0.5);
      enfants.push(voile, t);
    } else if (!jouable) {
      enfants.forEach((o) => (o as unknown as { setAlpha(a: number): void }).setAlpha(0.5));
    }
    const carte = this.add.container(x, y, enfants);
    carte.setSize(l, h);
    // Les cartes sont posées un peu de travers, comme sur une table.
    carte.setRotation(((Math.round(x) % 3) - 1) * 0.03);
    this.ajouter(carte);
    return carte;
  }

  private texteFicheEleve(el: Eleve, malade: boolean, jouable: boolean): string {
    const F = TEXTES.fiche;
    const D = FUN.fiche;
    const g = this.etat.tour;
    const suite = malade
      ? aide(F.infirmerie, D.infirmerie, g)
      : jouable
        ? aide(F.glisser, D.glisser, g)
        : aide(F.nonJouable, D.nonJouable, g);
    return `${TEXTES.pouvoirs[el.role]} ${suite}`;
  }

  /** Toucher une carte (sans la glisser) ouvre la fiche de l'élève. */
  private rendreTouchable(
    carte: Phaser.GameObjects.Container,
    el: Eleve,
    malade: boolean,
    jouable: boolean,
  ): void {
    if (!carte.input) carte.setInteractive({ useHandCursor: true });
    let glisse = false;
    carte.on('pointerdown', () => (glisse = false));
    carte.on('dragstart', () => (glisse = true));
    carte.on('pointerup', () => {
      if (glisse) return;
      this.montrerFiche(
        TEXTES.fiche.eleve(el.role, valeur(el.role)),
        this.texteFicheEleve(el, malade, jouable),
      );
    });
  }

  private rendreDeplacable(
    carte: Phaser.GameObjects.Container,
    el: Eleve,
    cibles: string[],
    chouchou: boolean,
  ): void {
    this.input.setDraggable(carte, true);
    const depart = { x: carte.x, y: carte.y };
    let ficheGlisse: Phaser.GameObjects.Container | null = null;
    let pantin: PantinVisuel | null = null;
    let doigt = { x: carte.x, y: carte.y };
    // Pastille sous l'élève tenu : l'îlot où il tombera si on le lâche maintenant.
    let survol: Phaser.GameObjects.Arc | null = null;
    // Aperçu du coup sous le doigt : plaquage, goûters, chemin, victoire.
    let dernierVise: string | null = null;
    let objetsApercu: Phaser.GameObjects.GameObject[] = [];
    const effacerApercu = (): void => {
      for (const o of objetsApercu) {
        this.tweens.killTweensOf(o);
        o.destroy();
      }
      objetsApercu = [];
    };
    const animer = (_t: number, delta: number): void => {
      pantin?.suivre(doigt.x, doigt.y, Math.min(delta, 50) / 1000);
      const vise = noeudSous(this.cour, cibles, { x: doigt.x, y: doigt.y - VISEE }, RAYON_DEPOT);
      if (survol) {
        survol.setVisible(vise !== null);
        if (vise) survol.setPosition(this.pos(vise).x, this.pos(vise).y);
      }
      if (vise !== dernierVise) {
        dernierVise = vise;
        effacerApercu();
        if (vise) {
          objetsApercu = this.montrerApercu(
            chouchou
              ? { type: 'choisir', option: { type: 'poser', eleveId: el.id, cible: vise } }
              : { type: 'envoyer', eleveId: el.id, cible: vise },
            vise,
          );
          if (pantin) this.dyn.bringToTop(pantin.conteneur);
        }
      }
    };
    const lacher = (): void => {
      this.events.off('update', animer);
      effacerApercu();
      dernierVise = null;
      pantin?.destroy();
      pantin = null;
      survol?.destroy();
      survol = null;
    };

    carte.on('dragstart', (p: Phaser.Input.Pointer) => {
      ficheGlisse = this.dessinerFiche(
        TEXTES.fiche.eleve(el.role, valeur(el.role)),
        this.texteFicheEleve(el, false, true),
      );
      this.montrerCibles(el, cibles);
      jouerSon('prise');
      doigt = { x: p.worldX, y: p.worldY };
      if (this.animations) {
        // La carte s'efface : c'est l'élève lui-même qu'on tient par le col.
        carte.setAlpha(0.01);
        survol = this.ajouter(this.add.circle(0, 0, RAYON_ILOT + 4, COULEURS.allume, 0.45));
        survol.setVisible(false);
        pantin = new PantinVisuel(this, el, doigt.x, doigt.y);
        this.ajouter(pantin.conteneur);
        this.events.on('update', animer);
      } else {
        this.dyn.bringToTop(carte);
        carte.setScale(1.15);
      }
    });
    carte.on('drag', (p: Phaser.Input.Pointer, x: number, y: number) => {
      doigt = { x: p.worldX, y: p.worldY };
      if (!pantin) carte.setPosition(x, y - 30);
    });
    carte.on('dragend', (p: Phaser.Input.Pointer) => {
      this.cacherCibles();
      ficheGlisse?.destroy();
      ficheGlisse = null;
      const avecPantin = pantin !== null;
      lacher();
      const visee = { x: p.worldX, y: p.worldY - (avecPantin ? VISEE : 30) };
      const cible = noeudSous(this.cour, cibles, visee, RAYON_DEPOT);
      const ok =
        cible !== null &&
        this.agir(
          () =>
            chouchou
              ? this.ctrl.choisir({ type: 'poser', eleveId: el.id, cible })
              : this.ctrl.envoyer(el.id, cible),
          chouchou,
        );
      if (!ok) {
        // Retour au rang : la carte revient en rebondissant.
        if (avecPantin) {
          carte.setPosition(p.worldX, p.worldY - HAUTEUR_PRISE / 2);
          carte.setAlpha(1);
          carte.setScale(0.8);
        }
        this.tweens.add({
          targets: carte,
          x: depart.x,
          y: depart.y,
          scale: 1,
          duration: 260,
          ease: 'Back.easeOut',
        });
      }
    });
  }

  /**
   * Montre ce que ferait le coup avant qu'on lâche l'élève : l'adversaire qui serait plaqué, le
   * chemin à la craie qui s'allongerait, les goûters qui seraient ramassés, la victoire.
   */
  private montrerApercu(action: Action, cible: string): Phaser.GameObjects.GameObject[] {
    const a = apercu(this.etat, action);
    if (!a) return [];
    const objets: Phaser.GameObjects.GameObject[] = [];
    const bande = this.bandeActive;
    const couleur = bande === 'rouge' ? COULEURS.rouge : COULEURS.bleu;
    const p = this.pos(cible);

    // Le chemin gagné, en pointillés de la couleur de la bande.
    if (a.nouvellesAllees.length > 0) {
      const g = this.ajouter(this.add.graphics());
      g.lineStyle(14, couleur, 0.85);
      for (const i of a.nouvellesAllees) {
        const [u, v] = this.cour.allees[i] as [string, string];
        this.pointilles(g, this.pos(u), this.pos(v), 16, 12);
      }
      this.tweens.add({ targets: g, alpha: 0.4, duration: 380, yoyo: true, repeat: -1 });
      objets.push(g);
    }

    const bulle = (x: number, y: number, mot: string, taille: number): void => {
      const t = this.texte(x, y, mot, taille, '#ffe066', {
        fontStyle: 'bold',
        stroke: COULEURS.texteSombre,
        strokeThickness: 6,
      })
        .setOrigin(0.5)
        .setAngle(-6);
      this.tweens.add({ targets: t, scale: 1.12, duration: 300, yoyo: true, repeat: -1 });
      objets.push(t);
    };

    if (a.victoire) {
      bulle(p.x, p.y - 96, TEXTES.animations.victoire, 40);
    } else if (a.plaque) {
      bulle(p.x, p.y - 82, TEXTES.animations.apercuPlaque(a.plaque), 26);
    }

    // Les goûters qui seraient ramassés sautillent avec leur valeur.
    for (const gouter of a.gouters) {
      const c = this.positionGouter(gouter.region);
      const anneau = this.ajouter(this.add.circle(c.x, c.y, 34));
      anneau.setStrokeStyle(6, COULEURS.allume, 1);
      this.tweens.add({
        targets: anneau,
        scale: 1.25,
        alpha: 0.4,
        duration: 320,
        yoyo: true,
        repeat: -1,
      });
      objets.push(anneau);
      bulle(c.x, c.y - 50, `+${gouter.bonsPoints}`, 30);
    }
    return objets;
  }

  private montrerCibles(el: Eleve, cibles: string[]): void {
    for (const id of cibles) {
      const n = this.cour.noeuds[id];
      const p = this.pos(id);
      this.surbrillances.push(this.anneauCible(p, n?.type === 'cabane' ? 78 : RAYON_ILOT + 8));
      const dessus = sommet(this.etat, id);
      const badge = this.badges.get(id);
      if (dessus && dessus.bande !== el.bande && badge) {
        this.trembler(badge);
        this.surbrillances.push(badge);
      }
    }
  }

  private cacherCibles(): void {
    for (const o of this.surbrillances) {
      this.tweens.killTweensOf(o);
      if (o instanceof Phaser.GameObjects.Arc) o.destroy();
    }
    // Remet les badges tremblants à leur place.
    for (const [id, badge] of this.badges) {
      const p = this.pos(id);
      badge.setPosition(p.x, p.y);
    }
    this.surbrillances = [];
  }

  /**
   * Juste après un coup : on laisse voir l'atterrissage un instant, rang caché et écran bloqué,
   * puis vient l'écran « Passe le téléphone ».
   */
  private dessinerFinDeTour(): void {
    this.texte(
      LARGEUR / 2,
      RANG.y,
      TEXTES.passe.bientot(this.etat.courant),
      26,
      COULEURS.texteSombre,
      {
        fontStyle: '700',
      },
    ).setOrigin(0.5);
    const bloc = this.ajouter(
      this.add.rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, 0x000000, 0.001),
    );
    bloc.setOrigin(0, 0).setInteractive();
  }

  private voile(alpha: number): void {
    const v = this.ajouter(
      this.add.rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, COULEURS.fondSombre, alpha),
    );
    v.setOrigin(0, 0);
    v.setInteractive();
  }

  private dessinerPasse(): void {
    const b = this.etat.courant;
    this.voile(0.9);
    const cx = LARGEUR / 2;
    const g = this.ajouter(this.add.graphics());
    panneau(g, 50, 250, LARGEUR - 100, 760, {
      remplissage: b === 'rouge' ? 0xffe1d9 : 0xe1e6ff,
      rayon: 34,
      ombre: 10,
    });
    this.texte(cx, 330, TEXTES.passe.titre, 52, COULEURS.texteSombre, {
      fontStyle: '700',
    }).setOrigin(0.5);
    this.texte(
      cx,
      400,
      TEXTES.passe.a(b),
      38,
      b === 'rouge' ? COULEURS.texteRouge : COULEURS.texteBleu,
      {
        fontStyle: '700',
      },
    ).setOrigin(0.5);
    // Un élève de la bande qui attend, tout content.
    const eleve = skinActif().eleve(this, b, b === 'rouge' ? 'grand' : 'petit', 120);
    eleve.setPosition(cx, 610);
    this.ajouter(eleve);
    this.tweens.add({
      targets: eleve,
      y: 596,
      angle: { from: -3, to: 3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.texte(
      cx,
      790,
      aide(TEXTES.passe.cache, FUN.passe.cache, this.etat.tour),
      22,
      COULEURS.texteSombre,
      {
        fontStyle: '500',
        align: 'center',
        wordWrap: { width: LARGEUR - 160 },
      },
    ).setOrigin(0.5);
    this.ajouter(
      creerBouton(
        this,
        cx,
        910,
        TEXTES.boutons.pret(b),
        () => {
          this.ctrl.reprendre();
          this.rafraichir();
        },
        { largeur: 440, hauteur: 92, taille: 32, couleur: COULEURS.jaune },
      ),
    );
  }

  private dessinerAide(): void {
    const A = TEXTES.aide;
    this.voile(0.85);
    const fondAide = this.ajouter(this.add.graphics());
    const x0 = 34;
    const largeur = LARGEUR - 68;
    let y = 40;
    this.texte(LARGEUR / 2, y, A.titre, 38, COULEURS.texteSombre, {
      fontFamily: POLICE_TITRE,
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    y += 62;
    for (const para of [A.but, A.tour]) {
      const t = this.texte(x0, y, para, 17, COULEURS.texteSombre, {
        wordWrap: { width: largeur },
        fontStyle: '500',
      });
      y += t.height + 10;
    }
    this.texte(x0, y, A.eleves, 21, COULEURS.texteRouge, { fontStyle: '700' });
    y += 32;
    for (const r of ROLES) {
      const badge = creerBadge(this, 'rouge', r.id, 34);
      badge.setPosition(x0 + 20, y + 20);
      this.ajouter(badge);
      const nom = this.texte(x0 + 52, y, TEXTES.roles[r.id], 17, COULEURS.texteSombre, {
        fontStyle: '700',
      });
      const t = this.texte(
        x0 + 52,
        y + nom.height,
        TEXTES.pouvoirs[r.id],
        15,
        COULEURS.texteSombre,
        {
          wordWrap: { width: largeur - 52 },
        },
      );
      y += Math.max(48, nom.height + t.height + 6);
    }
    const speciaux = this.cour.ilots
      .map((id) => this.cour.noeuds[id])
      .filter((n) => n?.equipement && this.etat.equipements);
    if (speciaux.length > 0) {
      y += 4;
      this.texte(x0, y, A.special, 21, COULEURS.texteRouge, { fontStyle: '700' });
      y += 30;
      for (const n of speciaux) {
        if (!n?.equipement) continue;
        const t = this.texte(
          x0,
          y,
          `★ ${n.nom} : ${TEXTES.effetsEquipements[n.equipement]}`,
          16,
          COULEURS.texteSombre,
          { wordWrap: { width: largeur } },
        );
        y += t.height + 8;
      }
    }
    y += 6;
    for (const l of A.legende) {
      const t = this.texte(x0, y, `• ${l}`, 14, '#5b5346', { wordWrap: { width: largeur } });
      y += t.height + 4;
    }
    panneau(fondAide, 14, 24, LARGEUR - 28, Math.min(HAUTEUR - 40, y + 90), { rayon: 28 });
    this.ajouter(
      creerBouton(
        this,
        LARGEUR / 2,
        Math.min(HAUTEUR - 50, y + 46),
        A.fermer,
        () => {
          this.aideOuverte = false;
          this.rafraichir();
        },
        { largeur: 300, hauteur: 64, couleur: COULEURS.jaune },
      ),
    );
  }

  /** Bulle de conseil pour débuter : un seul à la fois, à fermer avant de jouer. */
  private dessinerConseil(): void {
    if (!this.conseilsActifs) return;
    const bande = this.bandeActive;
    const tour = this.etat.tour;
    const id = prochainConseil(
      this.etat,
      this.ctrl.phase,
      this.conseilsVus[bande],
      this.tourDernierConseil[bande] === tour,
    );
    if (!id) return;
    const C = TEXTES.conseils;
    this.voile(0.45);
    const x0 = 40;
    const largeur = LARGEUR - 80;
    // En bas de l'écran, pour laisser voir la cour dont parle le conseil.
    const mesure = this.add.text(0, 0, C[id], {
      fontFamily: POLICE,
      fontSize: '27px',
      wordWrap: { width: largeur - 60 },
      lineSpacing: 6,
    });
    const hauteur = 78 + mesure.height + 130;
    mesure.destroy();
    const y0 = BAS - hauteur - 24;
    const corps = this.texte(x0 + 30, y0 + 78, C[id], 27, COULEURS.texteSombre, {
      wordWrap: { width: largeur - 60 },
      lineSpacing: 6,
    });
    const fond = this.ajouter(this.add.graphics());
    panneau(fond, x0, y0, largeur, hauteur, { rayon: 28, ombre: 9 });
    // Bandeau jaune du titre, comme un bout de scotch.
    forme(fond, contourRect(x0 + 18, y0 + 16, largeur - 36, 48, 14, 23), {
      remplissage: COULEURS.jaune,
      trait: 3,
    });
    this.dyn.bringToTop(corps);
    this.texte(
      x0 + 30,
      y0 + 24,
      `${C.titre} · ${TEXTES.bandesTitre[bande]}`,
      26,
      COULEURS.texteSombre,
      {
        fontStyle: '700',
      },
    );
    const yb = y0 + hauteur - 62;
    const vu = (): void => {
      this.conseilsVus[bande].add(id);
      if (this.conseilsVus.rouge.size + this.conseilsVus.bleu.size >= 2 * NB_CONSEILS) tutoPasse();
      if (id !== 'pouvoir') this.tourDernierConseil[bande] = tour;
    };
    this.ajouter(
      creerBouton(
        this,
        x0 + largeur * 0.3,
        yb,
        C.couper,
        () => {
          vu();
          this.conseilsActifs = false;
          ecrireConseils(false);
          this.rafraichir(true);
        },
        { largeur: largeur * 0.5 - 20, hauteur: 70, taille: 22 },
      ),
    );
    this.ajouter(
      creerBouton(
        this,
        x0 + largeur * 0.76,
        yb,
        C.compris,
        () => {
          vu();
          this.rafraichir(true);
        },
        { largeur: largeur * 0.4, hauteur: 70, taille: 28, couleur: COULEURS.jaune },
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Sensations : atterrissage, plaquage, secousses, goûters, cinématiques, sons
  // -------------------------------------------------------------------------

  /**
   * Met en scène un coup en trois temps : l'élève est annoncé (il se ramasse en l'air), il tombe
   * (impact, poussière, « BOUM »), puis chaque conséquence se joue sur la cour, l'une après
   * l'autre : l'adversaire file chez la CPE, le goûter vole au cartable, la surveillante marche,
   * les copains arrivent du portail… Les panneaux des moments marquants viennent après.
   */
  private animer(nouveaux: Evenement[], grandsFreres: boolean, duree: number): void {
    const plan = planAnimations(nouveaux);
    // Origine des effets à distance (éternuement) : l'îlot où l'élève vient d'arriver.
    const derniereCible = [...nouveaux].reverse().find((ev) => ev.type === 'pose');
    const origine =
      derniereCible?.type === 'pose' && this.cour.noeuds[derniereCible.cible]
        ? this.pos(derniereCible.cible)
        : { x: LARGEUR / 2, y: 500 };
    for (const { ev, debut } of plan) {
      const jouer = (): void => this.animerEvenement(ev, origine);
      if (debut === 0 || !this.animations) jouer();
      else this.time.delayedCall(debut, jouer);
    }
    if (!this.animations) return;
    const suite = cinematiquesPour(nouveaux, grandsFreres);
    if (suite.length === 0) return;
    // Les panneaux attendent que la cour ait montré le coup.
    this.time.delayedCall(duree, () => {
      this.cinematiques.push(...suite);
      if (!this.cinematiqueEnCours) this.cinematiqueSuivante();
    });
  }

  private animerEvenement(ev: Evenement, origine: Point): void {
    switch (ev.type) {
      case 'pose':
        if (this.cour.noeuds[ev.cible]?.type === 'ilot') {
          this.atterrissage(ev.cible, ev.plaque);
        } else {
          jouerSon('pose');
        }
        break;
      case 'glissade':
        jouerSon('glissade');
        this.glissade(ev.depart, ev.arrivee);
        break;
      case 'region':
        this.ramasserGouter(ev.region, ev.bande, ev.bonsPoints);
        break;
      case 'appel':
      case 'pioche':
        jouerSon('pioche');
        this.copainsArrivent(ev.bande, ev.nombre);
        break;
      case 'cpe':
        this.volerVersLieu(this.pos(ev.ilot), ev.bande, ev.role, ev.bande, 'cpe');
        break;
      case 'infirmerie':
        this.eternuement(origine, ev.bande);
        break;
      case 'rappel':
        this.volerVersRang(this.pos(ev.ilot), ev.bande);
        break;
      case 'repechage':
        this.volerVersRang(positionLieu(this.cour, ev.bande, 'cpe'), ev.bande);
        break;
      case 'surveillante':
        this.marcheSurveillante(ev.position, ev.pas);
        break;
      case 'fin':
        this.victoire(ev.raison === 'cabane');
        break;
      default:
        break;
    }
  }

  private secousse(force: number, duree = 180): void {
    if (this.animations) this.cameras.main.shake(duree, force);
  }

  /** Grosse onomatopée dessinée qui surgit puis s'envole. */
  private onomatopee(x: number, y: number, mot: string, taille = 34, couleur = '#ffe066'): void {
    const t = this.texte(x, y, mot, taille, couleur, {
      fontStyle: 'bold',
      stroke: COULEURS.texteSombre,
      strokeThickness: 7,
    })
      .setOrigin(0.5)
      .setScale(0.3)
      .setAngle(Phaser.Math.Between(-10, 6));
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: y - 34,
      delay: 620,
      duration: 280,
      onComplete: () => t.destroy(),
    });
  }

  /**
   * Les trois temps de l'arrivée : l'élève apparaît au-dessus de l'îlot et se ramasse (annonce),
   * tombe (action), s'écrase et rebondit (conséquence). S'il plaque, la chute est plus sèche,
   * l'image se fige un instant et l'adversaire s'aplatit dessous.
   */
  private atterrissage(id: string, plaque: RoleId | undefined): void {
    const badge = this.badges.get(id);
    if (!badge || !this.animations) {
      jouerSon(plaque ? 'plaque' : 'pose');
      return;
    }
    const y0 = badge.y;
    // Annonce : en l'air, ramassé en boule, il prend son élan.
    badge.setY(y0 - 120).setScale(1.15, 0.85);
    this.tweens.add({
      targets: badge,
      y: y0 - 136,
      scaleX: 0.9,
      scaleY: 1.15,
      duration: ANNONCE,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Action : la chute.
        this.tweens.add({
          targets: badge,
          y: y0,
          scaleX: 1,
          scaleY: 1,
          duration: plaque ? 200 : 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            // Conséquence : écrasement, puis retour en forme.
            badge.setScale(1.3, 0.72);
            this.tweens.add({
              targets: badge,
              scaleX: 1,
              scaleY: 1,
              duration: 340,
              ease: 'Elastic.easeOut',
              easeParams: [1.2, 0.5],
            });
            if (plaque) this.plaquage(id, badge, plaque);
            else jouerSon('pose');
          },
        });
      },
    });
  }

  private plaquage(id: string, badge: Phaser.GameObjects.Container, role: RoleId): void {
    const p = this.pos(id);
    jouerSon('plaque');
    this.secousse(0.014, 240);
    // Arrêt sur image : tout se fige un très court instant, ça donne du poids au choc.
    this.tweens.timeScale = 0.05;
    this.time.delayedCall(70, () => (this.tweens.timeScale = 1));
    // L'adversaire plaqué : son badge s'aplatit sous l'élève, avec des étoiles qui tournent.
    const adv = this.bandeActive === 'rouge' ? 'bleu' : 'rouge';
    const plaqueBadge = this.ajouter(creerBadge(this, adv, role, 40));
    plaqueBadge.setPosition(p.x, p.y + 28).setScale(1.3, 0.4);
    this.dyn.moveBelow(plaqueBadge, badge);
    this.tweens.add({
      targets: plaqueBadge,
      x: p.x - RAYON_ILOT - 22,
      y: p.y - 30,
      scaleX: 0.65,
      scaleY: 0.65,
      delay: 380,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => plaqueBadge.destroy(),
    });
    for (let k = 0; k < 3; k++) {
      const etoile = this.texte(p.x, p.y + 20, '★', 22, '#ffe066', {
        stroke: COULEURS.texteSombre,
        strokeThickness: 4,
      }).setOrigin(0.5);
      const a0 = (k / 3) * Math.PI * 2;
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 600,
        onUpdate: (tw) => {
          const v = tw.getValue() ?? 0;
          const a = a0 + v * Math.PI * 2;
          etoile.setPosition(p.x + Math.cos(a) * 44, p.y + 26 + Math.sin(a) * 12);
          etoile.setAlpha(1 - v * 0.6);
        },
        onComplete: () => etoile.destroy(),
      });
    }
    // Nuage de poussière.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const nuage = this.ajouter(this.add.circle(p.x, p.y + 24, 10, 0xe6d8b4, 0.95));
      nuage.setStrokeStyle(2, COULEURS.encre, 0.8);
      this.tweens.add({
        targets: nuage,
        x: p.x + Math.cos(a) * 74,
        y: p.y + 24 + Math.sin(a) * 34,
        scale: 1.9,
        alpha: 0,
        duration: 480,
        ease: 'Quad.easeOut',
        onComplete: () => nuage.destroy(),
      });
    }
    this.onomatopee(p.x, p.y - 70, TEXTES.animations.boum, 40);
  }

  /** Toboggan : l'élève glisse d'un îlot à l'autre en tournoyant. */
  private glissade(depart: string, arrivee: string): void {
    const badge = this.badges.get(arrivee);
    if (!badge) return;
    const a = this.pos(depart);
    const b = this.pos(arrivee);
    badge.setPosition(a.x, a.y);
    this.tweens.add({
      targets: badge,
      x: b.x,
      y: b.y,
      angle: 360,
      duration: 520,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        badge.setAngle(0);
        this.secousse(0.006, 120);
      },
    });
  }

  /**
   * Fait voler un objet de `a` à `b` en cloche, en tournant un peu, puis le détruit et appelle
   * `arrivee`.
   */
  private volerEnCloche(
    objet: Phaser.GameObjects.Container | Phaser.GameObjects.Graphics,
    a: Point,
    b: Point,
    duree: number,
    arrivee?: () => void,
  ): void {
    const hauteur = Math.min(160, 60 + Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
    objet.setPosition(a.x, a.y);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: duree,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        objet.setPosition(
          a.x + (b.x - a.x) * v,
          a.y + (b.y - a.y) * v - Math.sin(v * Math.PI) * hauteur,
        );
        objet.setAngle(Math.sin(v * Math.PI * 2) * 14);
      },
      onComplete: () => {
        objet.destroy();
        arrivee?.();
      },
    });
  }

  /** Le panneau d'un lieu fait un petit bond : quelqu'un vient d'y arriver ou d'en partir. */
  private rebondLieu(bande: Bande, lieu: Lieu): void {
    const c = this.panneauxLieux.get(`${bande}:${lieu}`);
    if (!c) return;
    this.tweens.add({
      targets: c,
      scaleX: 1.15,
      scaleY: 0.9,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Un élève quitte la cour pour un lieu (CPE) : il vole jusqu'au panneau, qui rebondit. */
  private volerVersLieu(
    depuis: Point,
    bandeEleve: Bande,
    role: RoleId,
    bandeLieu: Bande,
    lieu: Lieu,
  ): void {
    jouerSon('cpe');
    const badge = this.ajouter(creerBadge(this, bandeEleve, role, 44));
    this.volerEnCloche(badge, depuis, positionLieu(this.cour, bandeLieu, lieu), 560, () =>
      this.rebondLieu(bandeLieu, lieu),
    );
  }

  /** Des copains sortent du portail et courent jusqu'au rang. */
  private copainsArrivent(bande: Bande, n: number): void {
    const portail = positionLieu(this.cour, bande, 'portail');
    this.rebondLieu(bande, 'portail');
    for (let k = 0; k < n; k++) {
      const tete = this.ajouter(this.add.graphics());
      forme(tete, contourRond(0, 0, 16, graineDe(k, n) + 9), {
        remplissage: bande === 'rouge' ? 0xffc2b6 : 0xc3ccff,
        trait: 3,
      });
      tete.setVisible(false);
      this.time.delayedCall(k * 160, () => {
        tete.setVisible(true);
        this.volerEnCloche(
          tete,
          portail,
          { x: LARGEUR / 2 + (k - (n - 1) / 2) * 70, y: RANG.y },
          620,
        );
      });
    }
  }

  /** Un élève rentre dans le rang (banc, porte de la vie scolaire). */
  private volerVersRang(depuis: Point, bande: Bande): void {
    jouerSon('pioche');
    const tete = this.ajouter(this.add.graphics());
    forme(tete, contourRond(0, 0, 18, graineDe(depuis.x, depuis.y)), {
      remplissage: bande === 'rouge' ? 0xffc2b6 : 0xc3ccff,
      trait: 3,
    });
    this.volerEnCloche(tete, depuis, { x: LARGEUR / 2, y: RANG.y }, 600);
  }

  /** Atchoum : un nuage de microbes part de l'élève vers le portail de la bande adverse. */
  private eternuement(depuis: Point, bande: Bande): void {
    jouerSon('infirmerie');
    this.onomatopee(depuis.x, depuis.y - 70, TEXTES.animations.atchoum, 32, '#b9f0a0');
    const nuage = this.ajouter(this.add.graphics());
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      nuage.fillStyle(0x9fe08a, 0.95);
      nuage.lineStyle(3, COULEURS.encre, 1);
      nuage.fillCircle(Math.cos(a) * 14, Math.sin(a) * 9, 13);
      nuage.strokeCircle(Math.cos(a) * 14, Math.sin(a) * 9, 13);
    }
    nuage.fillStyle(0x9fe08a, 1);
    nuage.fillCircle(0, 0, 16);
    this.volerEnCloche(nuage, depuis, positionLieu(this.cour, bande, 'portail'), 620, () =>
      this.rebondLieu(bande, 'portail'),
    );
  }

  /** Mme Josiane marche jusqu'au goûter qu'elle va garder, à petits pas sautillants. */
  private marcheSurveillante(position: number, pas: number): void {
    const j = this.josiane;
    const ronde = this.cour.ronde;
    if (!j || ronde.length === 0) return;
    const indexRegion = ronde.at((((position - pas) % ronde.length) + ronde.length) % ronde.length);
    const ancien = indexRegion === undefined ? undefined : this.cour.regions.at(indexRegion)?.id;
    if (!ancien || pas === 0) return;
    const a = this.positionSurveillante(ancien);
    const arrivee = { x: j.x, y: j.y };
    j.setPosition(a.x, a.y + 30);
    this.onomatopee(a.x, a.y - 40, TEXTES.animations.sifflet, 26, '#e2c8ff');
    const duree = 760;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: duree,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        // Petits pas : elle sautille 5 fois en chemin.
        const saut = Math.abs(Math.sin(v * Math.PI * 5)) * 10;
        j.setPosition(a.x + (arrivee.x - a.x) * v, a.y + 30 + (arrivee.y - a.y - 30) * v - saut);
      },
      onComplete: () => j.setPosition(arrivee.x, arrivee.y),
    });
  }

  /** Le goûter ramassé s'envole de la cour jusqu'au cartable de la bande, qui se remplit. */
  private ramasserGouter(regionId: string, bande: Bande, n: number): void {
    jouerSon('gouter');
    if (!this.animations) return;
    const c = this.positionGouter(regionId);
    this.secousse(0.005, 140);
    const anneau = this.ajouter(this.add.circle(c.x, c.y, 20));
    anneau.setStrokeStyle(5, COULEURS.allume, 1);
    this.tweens.add({
      targets: anneau,
      scale: 3.2,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => anneau.destroy(),
    });
    this.onomatopee(c.x, c.y - 40, TEXTES.animations.gouter(n), 30);
    // Les cases à remplir : celles qui suivent les goûters déjà rangés dans le cartable.
    const cases = this.cartables[bande];
    const total = this.etat.joueurs[bande].bonsPoints;
    for (let k = 0; k < n; k++) {
      const index = total - n + k;
      const cible = cases[Math.min(index, cases.length - 1)];
      if (!cible) continue;
      const biscuit = this.ajouter(this.add.graphics());
      this.dessinerBiscuit(biscuit, 0, 0, 14);
      biscuit.setVisible(false);
      this.time.delayedCall(k * 140, () => {
        biscuit.setVisible(true);
        this.volerEnCloche(biscuit, c, { x: cible.x, y: cible.y + MONTEE }, 700, () => {
          if (index >= cases.length) return;
          const plein = this.ajouter(this.add.graphics());
          forme(
            plein,
            bande === 'rouge'
              ? contourRond(cible.x, cible.y + MONTEE, 13, graineDe(index, 1))
              : contourRect(
                  cible.x - 13,
                  cible.y + MONTEE - 13,
                  26,
                  26,
                  5,
                  graineDe(index, 1),
                  0.5,
                ),
            { remplissage: COULEURS.jaune, trait: 3 },
          );
          this.dessinerBiscuit(plein, cible.x, cible.y + MONTEE, 8);
          this.secousse(0.003, 80);
        });
      });
    }
  }

  private victoire(parCabane: boolean): void {
    jouerSon('victoire');
    if (!this.animations) return;
    if (parCabane) this.secousse(0.02, 400);
    const couleurs = [COULEURS.rouge, COULEURS.bleu, COULEURS.allume, COULEURS.craie, 0x8fbf6a];
    for (let k = 0; k < 50; k++) {
      const x = Phaser.Math.Between(20, LARGEUR - 20);
      const c = this.ajouter(
        this.add.rectangle(x, -20, 10, 16, couleurs[k % couleurs.length] as number),
      );
      c.setAngle(Phaser.Math.Between(0, 180));
      this.tweens.add({
        targets: c,
        y: BAS + 30,
        x: x + Phaser.Math.Between(-80, 80),
        angle: c.angle + Phaser.Math.Between(200, 600),
        delay: Phaser.Math.Between(0, 700),
        duration: Phaser.Math.Between(1600, 2600),
        onComplete: () => c.destroy(),
      });
    }
  }

  private tweenCinematique(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
    const t = this.tweens.add(config);
    this.tweensCinematique.add(t);
    t.once('complete', () => this.tweensCinematique.delete(t));
  }

  /**
   * Cinématique provisoire : un bandeau qui traverse l'écran avec un pictogramme. L'emplacement
   * (`dessinerPictogramme`) est prêt à recevoir l'animation définitive. Toucher la passe.
   */
  private cinematiqueSuivante(): void {
    const cin = this.cinematiques.shift();
    if (!cin) {
      this.cinematiqueEnCours = null;
      return;
    }
    const id = cin.id;
    if (!cin.sansVideo && this.cinematiqueVideo(cin)) return;
    const T = TEXTES.cinematiques;
    const C =
      id === 'gouter'
        ? T.gouter(
            cin.bande ?? 'rouge',
            nomGouter(this.cour, cin.region ?? ''),
            cin.bonsPoints ?? 1,
          )
        : T[id];
    const SONS: Record<CinematiqueId, SonId> = {
      cpe: 'cpe',
      infirmerie: 'infirmerie',
      grandsFreres: 'grandsFreres',
      sonnerie: 'sonnerie',
      gouter: 'gouter',
      toboggan: 'glissade',
      delegue: 'pioche',
    };
    jouerSon(SONS[id]);
    const fond = this.add.rectangle(
      GAUCHE,
      HAUT,
      DROITE - GAUCHE,
      BAS - HAUT,
      COULEURS.fondSombre,
      0.55,
    );
    fond.setOrigin(0, 0).setInteractive();
    const bandeau = this.add.graphics();
    const COULEURS_PANNEAU: Record<CinematiqueId, number> = {
      cpe: 0xc9a7f0,
      infirmerie: 0xff9f9f,
      sonnerie: 0xffd84d,
      grandsFreres: 0x9fb3ff,
      gouter: 0xffc48a,
      toboggan: 0x8fe3cf,
      delegue: 0xb8c2ff,
    };
    const couleur = COULEURS_PANNEAU[id];
    forme(bandeau, contourRect(-40, 470, LARGEUR + 80, 340, 30, 31, 3), {
      remplissage: couleur,
      trait: 7,
      ombre: 12,
    });
    const picto = this.add.graphics();
    this.dessinerPictogramme(picto, id, 150, 640, cin);
    const style = { fontFamily: POLICE, color: COULEURS.texteSombre };
    const titre = this.add
      .text(270, 610, C.titre, {
        ...style,
        fontSize: '46px',
        fontStyle: '700',
        wordWrap: { width: LARGEUR - 290 },
      })
      .setOrigin(0, 0.5);
    const sous = this.add
      .text(270, 700, C.sous, {
        ...style,
        fontSize: '24px',
        fontStyle: '500',
        wordWrap: { width: LARGEUR - 300 },
      })
      .setOrigin(0, 0.5);
    const passer = this.add
      .text(LARGEUR / 2, 860, TEXTES.cinematiques.passer, {
        ...style,
        color: COULEURS.texteClair,
        fontSize: '18px',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    const scene = this.add.container(-LARGEUR, 0, [bandeau, picto, titre, sous]);
    const tout = this.add.container(0, 0, [fond, scene, passer]).setDepth(1000);
    this.cinematiqueEnCours = tout;

    let fini = false;
    const finir = (): void => {
      if (fini) return;
      fini = true;
      this.tweenCinematique({
        targets: scene,
        x: LARGEUR,
        duration: 220,
        ease: 'Quad.easeIn',
        onComplete: () => {
          tout.destroy();
          this.cinematiqueSuivante();
        },
      });
      this.tweenCinematique({ targets: [fond, passer], alpha: 0, duration: 220 });
    };
    this.tweenCinematique({ targets: scene, x: 0, duration: 280, ease: 'Back.easeOut' });
    this.tweenCinematique({
      targets: picto,
      angle: { from: -6, to: 6 },
      duration: 180,
      yoyo: true,
      repeat: 5,
    });
    if (id === 'sonnerie') this.secousse(0.01, 700);
    fond.on('pointerup', finir);
    this.time.delayedCall(1100, finir);
  }

  /**
   * Vidéo du pouvoir, si le skin actif en a une (pour l'instant : le Contagieux). Elle couvre
   * l'écran, le titre du panneau s'affiche par-dessus après l'éternuement, et toucher la passe.
   * Si la vidéo ne démarre pas (réseau, navigateur), on retombe sur le panneau habituel.
   * Renvoie `false` quand il n'y a pas de vidéo à jouer.
   */
  private cinematiqueVideo(cin: Cinematique): boolean {
    const ROLE_DU_POUVOIR: Partial<Record<CinematiqueId, RoleId>> = { infirmerie: 'contagieux' };
    const role = ROLE_DU_POUVOIR[cin.id];
    const url = role ? skinActif().videoPouvoir?.(cin.bande ?? 'rouge', role) : undefined;
    if (!url) return false;

    const fond = this.add
      .rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, 0x000000, 1)
      .setOrigin(0, 0)
      .setInteractive();
    const video = this.add.video(LARGEUR / 2, HAUTEUR / 2);
    const C = TEXTES.cinematiques[cin.id as Exclude<CinematiqueId, 'gouter'>];
    const style = { fontFamily: POLICE, color: COULEURS.texteClair, align: 'center' };
    const titre = this.add
      .text(LARGEUR / 2, 1010, C.titre, {
        ...style,
        fontSize: '64px',
        fontStyle: '700',
        stroke: '#1d1a16',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const sous = this.add
      .text(LARGEUR / 2, 1090, C.sous, {
        ...style,
        fontSize: '30px',
        fontStyle: '600',
        stroke: '#1d1a16',
        strokeThickness: 7,
        wordWrap: { width: LARGEUR - 80 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const passer = this.add
      .text(LARGEUR / 2, 1190, TEXTES.cinematiques.passer, { ...style, fontSize: '18px' })
      .setOrigin(0.5)
      .setAlpha(0.7);
    const tout = this.add
      .container(0, 0, [fond, video, titre, sous, passer])
      .setDepth(1000)
      .setAlpha(0);
    this.cinematiqueEnCours = tout;

    let fini = false;
    let demarree = false;
    const finir = (repli = false): void => {
      if (fini) return;
      fini = true;
      this.tweenCinematique({
        targets: tout,
        alpha: 0,
        duration: repli ? 0 : 260,
        onComplete: () => {
          video.stop();
          tout.destroy();
          // La vidéo n'a pas pu démarrer : le panneau prend le relais.
          if (repli) this.cinematiques.unshift({ ...cin, sansVideo: true });
          this.cinematiqueSuivante();
        },
      });
    };
    const demarrer = (): void => {
      if (demarree || fini) return;
      demarree = true;
      // La vidéo couvre tout l'écran, quelle que soit sa forme, sans être déformée.
      const w = video.width || LARGEUR;
      const h = video.height || HAUTEUR;
      video.setScale(Math.max((DROITE - GAUCHE) / w, (BAS - HAUT) / h));
      this.tweenCinematique({ targets: tout, alpha: 1, duration: 160 });
      // Le titre arrive avec l'éternuement, vers la fin : on suit l'horloge de la vidéo, pas
      // celle du jeu, pour rester calé même si le téléphone rame.
      const duree = Math.max(1, video.getDuration() || 4);
      const guetter = (): void => {
        if (fini || video.getCurrentTime() < duree - 0.9) return;
        this.events.off(Phaser.Scenes.Events.UPDATE, guetter);
        this.tweenCinematique({ targets: [titre, sous], alpha: 1, duration: 160 });
        this.tweenCinematique({
          targets: titre,
          scale: { from: 1.6, to: 1 },
          duration: 260,
          ease: 'Back.easeOut',
        });
      };
      this.events.on(Phaser.Scenes.Events.UPDATE, guetter);
      tout.once(Phaser.GameObjects.Events.DESTROY, () =>
        this.events.off(Phaser.Scenes.Events.UPDATE, guetter),
      );
      // Filet de sécurité si la fin de la vidéo n'est jamais annoncée.
      this.time.delayedCall(duree * 1000 + 2000, () => finir());
    };

    // Première image prête : on montre la vidéo.
    video.on(Phaser.GameObjects.Events.VIDEO_PLAY, demarrer);
    video.on(Phaser.GameObjects.Events.VIDEO_COMPLETE, () => {
      if (!fini) this.time.delayedCall(700, () => finir());
    });
    video.on(Phaser.GameObjects.Events.VIDEO_ERROR, () => finir(!demarree));
    // Le navigateur refuse le son sans geste récent : on rejoue la vidéo en muet.
    video.on(Phaser.GameObjects.Events.VIDEO_LOCKED, () => {
      video.setMute(true);
      video.play();
    });
    fond.on('pointerup', () => finir());
    // Rien après 2,5 s (réseau lent) : on montre le panneau plutôt que de faire attendre.
    this.time.delayedCall(2500, () => {
      if (!demarree) finir(true);
    });
    video.loadURL(url, !lireSons());
    video.play();
    return true;
  }

  /** Emplacement de l'animation de chaque cinématique : pictogramme provisoire. */
  private dessinerPictogramme(
    g: Phaser.GameObjects.Graphics,
    id: CinematiqueId,
    x: number,
    y: number,
    cin?: Cinematique,
  ): void {
    g.setPosition(x, y);
    g.lineStyle(5, COULEURS.encre, 1);
    switch (id) {
      case 'cpe': // Porte du bureau
        g.fillStyle(0x8a5a2b, 1);
        g.fillRoundedRect(-55, -90, 110, 180, 8);
        g.strokeRoundedRect(-55, -90, 110, 180, 8);
        g.fillStyle(COULEURS.papier, 1);
        g.fillRect(-35, -70, 70, 30);
        g.fillStyle(0xffe066, 1);
        g.fillCircle(35, 10, 8);
        break;
      case 'infirmerie': // Croix rouge
        g.fillStyle(0xffffff, 1);
        g.fillCircle(0, 0, 80);
        g.strokeCircle(0, 0, 80);
        g.fillStyle(0xc0392b, 1);
        g.fillRect(-18, -55, 36, 110);
        g.fillRect(-55, -18, 110, 36);
        break;
      case 'grandsFreres': // Deux grandes silhouettes
        for (const dx of [-38, 38]) {
          g.fillStyle(COULEURS.bleu, 1);
          g.fillRoundedRect(dx - 30, -30, 60, 110, 14);
          g.strokeRoundedRect(dx - 30, -30, 60, 110, 14);
          g.fillStyle(0xf2c9a0, 1);
          g.fillCircle(dx, -60, 28);
          g.strokeCircle(dx, -60, 28);
        }
        break;
      case 'gouter': {
        // Le goûter ramassé, en grand.
        const i = Math.max(
          0,
          this.cour.regions.findIndex((r) => r.id === cin?.region),
        );
        g.setScale(2.6);
        this.dessinerFriandise(g, i, 0, 0);
        break;
      }
      case 'toboggan':
        g.fillStyle(0xe0b84a, 1);
        g.fillRect(-70, -80, 14, 160);
        g.strokeRect(-70, -80, 14, 160);
        g.fillStyle(COULEURS.rouge, 1);
        g.fillTriangle(-56, -80, -56, -60, 80, 80);
        g.fillTriangle(-56, -60, 80, 80, 60, 80);
        g.lineBetween(-56, -80, 80, 80);
        break;
      case 'delegue': // Mot d'excuse
        g.fillStyle(COULEURS.papier, 1);
        g.fillRect(-60, -75, 120, 150);
        g.strokeRect(-60, -75, 120, 150);
        g.lineStyle(4, 0x8a8a7a, 1);
        for (let k = 0; k < 5; k++) g.lineBetween(-45, -45 + k * 25, 45, -45 + k * 25);
        g.lineStyle(5, COULEURS.rouge, 1);
        g.lineBetween(10, 50, 45, 30);
        break;
      default: // Cloche de la sonnerie
        g.fillStyle(0xffe066, 1);
        g.fillTriangle(-70, 50, 70, 50, 0, -80);
        g.fillCircle(0, -20, 55);
        g.strokeCircle(0, -20, 55);
        g.fillStyle(COULEURS.fondSombre, 1);
        g.fillCircle(0, 65, 16);
        break;
    }
  }

  private dessinerFin(): void {
    const fin = this.etat.fin;
    if (!fin) return;
    this.voile(0.85);
    const cx = LARGEUR / 2;
    const g = this.ajouter(this.add.graphics());
    panneau(g, 40, 150, LARGEUR - 80, 940, {
      remplissage: fin.gagnant === 'rouge' ? 0xffe1d9 : 0xe1e6ff,
      rayon: 36,
      ombre: 12,
    });
    forme(g, contourRect(cx - 230, 190, 460, 120, 30, 41, 2.5), {
      remplissage: COULEURS.jaune,
      ombre: 6,
    });
    this.texte(cx, 250, TEXTES.fin.titre, 64, COULEURS.texteSombre, {
      fontStyle: '700',
    }).setOrigin(0.5);
    // Les élèves gagnants sautent de joie.
    (['petit', 'grand', 'populaire'] as const).forEach((role, i) => {
      const el = skinActif().eleve(this, fin.gagnant, role, 82);
      el.setPosition(cx + (i - 1) * 140, 500);
      this.ajouter(el);
      this.tweens.add({
        targets: el,
        y: 470,
        duration: 260 + i * 40,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeOut',
        delay: i * 90,
      });
    });
    this.texte(
      cx,
      650,
      TEXTES.fin.gagnant(fin.gagnant),
      46,
      fin.gagnant === 'rouge' ? COULEURS.texteRouge : COULEURS.texteBleu,
      {
        fontStyle: '700',
      },
    ).setOrigin(0.5);
    this.texte(
      cx,
      708,
      tonFun() ? FUN.fin.raison[fin.raison] : TEXTES.fin.raison(fin.raison),
      28,
      COULEURS.texteSombre,
      { fontStyle: '600' },
    ).setOrigin(0.5);
    // Une partie terminée : le tuto est passé, les aides suivantes seront pour rire.
    tutoPasse();
    const e = this.etat;
    this.texte(
      cx,
      770,
      TEXTES.fin.score(e.joueurs.rouge.bonsPoints, e.joueurs.bleu.bonsPoints),
      22,
      COULEURS.texteSombre,
      { fontStyle: '500' },
    ).setOrigin(0.5);
    this.texte(cx, 804, TEXTES.fin.tours(e.tour), 20, '#6b6152').setOrigin(0.5);
    this.ajouter(
      creerBouton(
        this,
        cx,
        900,
        TEXTES.boutons.rejouer,
        () => this.scene.restart({ ...this.donnees, graine: Date.now() }),
        { largeur: 360, hauteur: 84, taille: 32, couleur: COULEURS.jaune },
      ),
    );
    this.ajouter(
      creerBouton(this, cx, 1010, TEXTES.boutons.accueil, () => this.scene.start('accueil'), {
        largeur: 360,
        hauteur: 70,
      }),
    );
  }
}
