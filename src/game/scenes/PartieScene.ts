import { choisirEquipes, equipeDe } from '../../data/equipes';
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
  estPlanque,
  type Action,
  type Option,
  type RoleId,
} from '../../engine/index';
import { apercu } from '../apercu';
import { DUREE_CONSEQUENCE, dureeAnimations, planAnimations, rondeParcourue } from '../sequence';
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
import { Ordi } from '../ordi';
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
  versEcran,
} from '../disposition';
import { nomGouter, phraseEvenement } from '../journal';
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
import { cleGouter, DECOR, ILLUSTRATIONS, PLATEAU } from './ChargementScene';
import { cadrer, decorPlein } from '../ui/ecran';
import { animerMarionnette, Marionnette } from '../ui/marionnette';
import { visuelCarte, type VisuelCarte } from '../cartes';
import { choisirCarte } from '../../data/cartes';
import { jouerIncrust } from '../ui/incrust';

const RAYON_ILOT = 48;
/** Haut de la cour, à défaut de cabane en haut (fiche de la cour). */
const ZONE_HAUT_COUR = 100;
const TAILLE_BADGE = 70;
/** Pastille d'un élève posé sur un îlot : un peu plus grande que l'îlot, la tête dépasse. */
const DIAMETRE_PASTILLE = 92;
const RAYON_DEPOT = 75;
const Y_ACTIONS = 1064 + DESCENTE;

/** Temps laissé pour voir un coup avant de passer le téléphone (ms). */
const DUREE_FIN_DE_TOUR = 900;
/** Annonce d'une arrivée : l'élève se ramasse en l'air avant de tomber (ms). */
const ANNONCE = 130;
/** Vol d'une carte du portail jusqu'au rang (ms). */
const DUREE_ARRIVEE_CARTE = 650;

type Texte = Phaser.GameObjects.Text;

/** La partie à deux sur un même téléphone (étape 2 : formes simples). */
export class PartieScene extends Phaser.Scene {
  private ctrl!: Controleur;
  private cour!: Cour;
  private donnees!: DonneesPartie;
  /** Ce que montre la carte jouée : décor, îlots, cabanes, surveillant. */
  private visuel!: VisuelCarte;
  /** Tout ce qui est redessiné à chaque changement d'état. */
  private dyn!: Phaser.GameObjects.Container;
  /** Badge visible de chaque îlot (pour le faire trembler). */
  private badges = new Map<string, Phaser.GameObjects.Container>();
  /** Surbrillances des cibles pendant un glisser-déposer. */
  private surbrillances: Phaser.GameObjects.GameObject[] = [];
  private departToboggan: string | null = null;
  /** Fiche d'information affichée à la place du journal (élève ou îlot touché). */
  private fiche: { titre: string; texte: string; ancre?: Point } | null = null;
  /** Rang de la bande qui joue, juste avant son coup : les nouveaux venus y entrent en volant. */
  /** Rang avant le dernier coup, et d'où arrivent les nouveaux venus (portail par défaut). */
  private rangAvant: {
    bande: Bande;
    ids: Set<string>;
    origines: Map<string, Point>;
    /** Quand les cartes partent (après l’arrivée de l’élève qui a déclenché l’appel), en ms. */
    debut: number;
  } | null = null;
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
  /** La partie vient de se finir : la cour finit de jouer le coup avant l'écran de victoire. */
  private finEnAttente = false;
  /** Fiche de la cour affichée au lancement, avant le premier « Passe le téléphone ». */
  private presentation = true;
  /**
   * Plus tard, en ligne : la fiche sert d'écran d'attente pendant qu'on cherche un adversaire
   * (le bouton laisse place à « On attend un adversaire… »).
   */
  private attenteAdversaire = false;
  private finDeTour: Phaser.Time.TimerEvent | null = null;
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
  /** Tout ce qui dessine Mme Josiane sur la cour (ombre, marionnette, étiquette) : bouge avec elle. */
  private objetsJosiane: Phaser.GameObjects.GameObject[] = [];
  /** Le point où ces objets sont dessinés en ce moment (voir positionSurveillante). */
  private ancreJosiane: Point | null = null;
  /**
   * Où on la montre dans sa ronde tant que ses marches du coup ne sont pas finies
   * (`null` : là où le moteur la place).
   */
  private surveillanteVue: number | null = null;
  /** Ses marches lancées et pas encore finies. */
  private marchesEnCours = 0;
  /** Panneau de chaque lieu (portail, CPE), pour le faire rebondir quand un élève y arrive. */
  private panneauxLieux = new Map<string, Phaser.GameObjects.Container>();
  /** Goûters en train de voler vers le cartable (leurs cases restent vides jusqu'à l'arrivée). */
  private gouterEnVol: Record<Bande, number> = { rouge: 0, bleu: 0 };
  /** Partie en solo : l'ordinateur qui joue la bande bleue (`null` : partie à deux). */
  private ordi: Ordi | null = null;
  /** La bande dont le rang est affiché en bas de l'écran (pendant ce dessin). */
  private rangVisible: Bande | null = null;
  /** Prochain coup de l'ordi, programmé pour laisser voir le précédent. */
  private coupOrdi: Phaser.Time.TimerEvent | null = null;
  /** Durée des animations du dernier coup joué (ms). */
  private dureeDernierCoup = 0;

  constructor() {
    super('partie');
  }

  init(donnees: DonneesPartie): void {
    this.donnees = donnees;
    // La carte et les équipes choisies avant la partie (DB.1, DB.5) ; la récré par défaut.
    const carte = donnees.carte ?? 'cour-premier-jour';
    choisirCarte(carte);
    choisirEquipes(donnees.equipes ?? { rouge: 'rouges', bleu: 'bleus' });
    this.visuel = visuelCarte(carte);
    this.cour = chargerCour(COURS[carte] as CourData);
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
    this.finEnAttente = false;
    this.surveillanteVue = null;
    this.marchesEnCours = 0;
    this.presentation = true;
    this.attenteAdversaire = false;
    this.tourHorloge = 0;
    // En solo, le joueur garde la bande rouge (en bas, D2.1) ; l'ordi joue la bleue.
    this.ordi = donnees.ordi ? new Ordi('bleu', donnees.ordi, donnees.graine) : null;
    this.coupOrdi = null;
    this.dureeDernierCoup = 0;
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
    const decor = this.textures.exists(this.visuel.decor) ? this.visuel.decor : DECOR;
    if (this.textures.exists(decor)) {
      decorPlein(this.add.image(LARGEUR / 2, HAUTEUR / 2, decor));
    }
    this.dyn = this.add.container(0, 0);
    // Un toucher bref ouvre la fiche ; il faut bouger un peu le doigt pour glisser.
    this.input.dragDistanceThreshold = 12;
    this.rafraichir();
  }

  /** Redessine tout l'écran à partir de l'état. La fiche ouverte est fermée, sauf demande. */
  rafraichir(garderFiche = false): void {
    if (!garderFiche) this.fiche = null;
    // En solo, pas de « Passe le téléphone » : le téléphone reste dans les mêmes mains.
    if (this.ordi && this.ctrl.phase === 'passe' && !this.presentation && !this.entreDeuxTours) {
      this.ctrl.reprendre();
    }
    // Les animations du plateau s'arrêtent ; celles d'une cinématique continuent.
    for (const t of this.tweens.getTweens()) if (!this.tweensCinematique.has(t)) t.stop();
    this.dyn.removeAll(true);
    this.badges.clear();
    this.surbrillances = [];
    this.rangVisible = null;

    this.dessinerCour();
    // Le contenu du bandeau du haut remonte vers le bord sur un écran allongé (pas son papier, qui
    // va déjà jusqu'au bord).
    const avantHud = this.dyn.length + 1;
    // Pendant la fiche de la cour, son bandeau remplace celui du jeu.
    if (!(this.presentation && this.ctrl.phase === 'passe')) this.dessinerHud();
    for (const o of this.dyn.list.slice(avantHud)) {
      const objet = o as unknown as { y: number };
      objet.y += MONTEE;
    }
    // Plus de zone de notes : le rang reste toujours visible, et les explications viennent en
    // bulles près de ce qu'elles décrivent (demande de Clément).
    if (this.ctrl.phase === 'jeu' && this.tourOrdi) {
      // L'ordi joue : on garde son propre rang sous les yeux, sans pouvoir y toucher.
      this.dessinerRang(this.bandeVue, false);
      this.texte(LARGEUR / 2, Y_ACTIONS, TEXTES.hud.ordiReflechit, 24, COULEURS.texteSombre, {
        fontStyle: '700',
        stroke: '#fff6e4',
        strokeThickness: 6,
      }).setOrigin(0.5);
      this.planifierOrdi();
    } else if (this.ctrl.phase === 'jeu') {
      this.dessinerActions();
      // Pendant un choix hors du rang, le rang reste visible mais ne se glisse pas.
      this.dessinerRang(this.bandeActive, !this.attenteHorsRang());
      this.bulleConsigne();
    }
    if (this.ctrl.phase === 'passe') {
      if (this.presentation) this.dessinerPresentation();
      else if (this.entreDeuxTours) this.dessinerFinDeTour();
      else this.dessinerPasse();
    }
    // Le rang d'en face : combien d'élèves l'adversaire a en main (demande de Clément).
    if (this.rangVisible) this.dessinerRangAdverse(this.rangVisible === 'rouge' ? 'bleu' : 'rouge');
    if (this.ctrl.phase === 'fin' && !this.finEnAttente) this.dessinerFin();
    if (this.fiche) this.dessinerFiche(this.fiche.titre, this.fiche.texte, this.fiche.ancre);
    if (this.aideOuverte) this.dessinerAide();
    else this.dessinerConseil();
  }

  private montrerFiche(titre: string, texte: string, ancre?: Point): void {
    this.fiche = ancre ? { titre, texte, ancre } : { titre, texte };
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

  /** En solo, c'est au tour de l'ordi. */
  private get tourOrdi(): boolean {
    return this.ordi !== null && this.ordi.doitJouer(this.etat);
  }

  /** La bande dont on montre le rang quand personne ne le touche (en solo : celle du joueur). */
  private get bandeVue(): Bande {
    return this.ordi ? this.ordi.humain : this.etat.courant === 'rouge' ? 'bleu' : 'rouge';
  }

  /**
   * Programme la prochaine action de l'ordi, une fois le coup précédent vu. Un tour de l'ordi
   * peut demander plusieurs actions (pose puis pouvoir) : chacune est jouée comme un toucher.
   */
  private planifierOrdi(): void {
    if (!this.ordi || this.coupOrdi) return;
    const delai = this.animations ? Math.max(750, this.dureeDernierCoup + 350) : 30;
    this.coupOrdi = this.time.delayedCall(delai, () => {
      this.coupOrdi = null;
      const ordi = this.ordi;
      if (!ordi || this.ctrl.phase !== 'jeu' || !this.tourOrdi) return;
      // L'aide est ouverte : on attend qu'elle soit fermée.
      if (this.aideOuverte) {
        this.planifierOrdi();
        return;
      }
      const action = ordi.prochaineAction(this.etat);
      const deuxieme = action.type === 'choisir' && action.option.type === 'poser';
      this.departToboggan = null;
      if (!this.agir(() => this.ctrl.jouer(action), deuxieme)) this.rafraichir();
    });
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

  /** Trois chevrons d'encre au milieu d'un sentier à sens unique, pointés de `a` vers `b`. */
  private flechesSensUnique(a: Point, b: Point): void {
    const g = this.ajouter(this.add.graphics());
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    for (const k of [-1, 0, 1]) {
      const cx = mx + ux * k * 26;
      const cy = my + uy * k * 26;
      const pointe = { x: cx + ux * 12, y: cy + uy * 12 };
      const aile = (s: number) => ({
        x: cx - ux * 8 + Math.cos(ang + (s * Math.PI) / 2) * 14,
        y: cy - uy * 8 + Math.sin(ang + (s * Math.PI) / 2) * 14,
      });
      for (const [l, c] of [
        [12, COULEURS.encre],
        [6, COULEURS.jaune],
      ] as const) {
        g.lineStyle(l, c, 1);
        g.beginPath();
        g.moveTo(aile(1).x, aile(1).y);
        g.lineTo(pointe.x, pointe.y);
        g.lineTo(aile(-1).x, aile(-1).y);
        g.strokePath();
      }
    }
  }

  private dessinerCour(): void {
    const e = this.etat;
    const g = this.ajouter(this.add.graphics());

    // Allées en pointillés d'encre, comme tracées à la craie grasse sur le goudron.
    for (const [a, b] of this.cour.allees) {
      g.lineStyle(7, COULEURS.encre, 0.55);
      this.pointilles(g, this.pos(a), this.pos(b), 14, 10);
    }
    // Sentiers à sens unique (camp scout, DB.2) : des flèches dans le sens où l'on passe.
    for (const [i, depuis] of Object.entries(this.cour.sensUnique)) {
      const [a, b] = this.cour.allees[Number(i)] as [string, string];
      this.flechesSensUnique(this.pos(depuis), this.pos(depuis === a ? b : a));
    }

    // Chemin de chaque bande : un gros trait de couleur cerné d'encre.
    for (const b of ['rouge', 'bleu'] as const) {
      const segments = alleesDuChemin(e, b).map((i) => this.cour.allees[i] as [string, string]);
      for (const [largeur, couleur] of [
        [26, COULEURS.encre],
        [18, equipeDe(b).couleur],
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
      const dessin = n?.decor ? this.visuel.ilots[n.decor] : undefined;
      const pieceIlot =
        dessin && this.textures.exists(dessin)
          ? dessin
          : special
            ? PLATEAU.ilotSpecial
            : PLATEAU.ilot;
      if (this.textures.exists(pieceIlot)) {
        // Îlot illustré (phase 2) : une touffe d'herbe, jaune à étoile pour un îlot spécial.
        const im = this.add.image(p.x, p.y + 6, pieceIlot);
        im.setScale((RAYON_ILOT * 2.4) / 512);
        this.ajouter(im);
      }
      const gi = this.ajouter(this.add.graphics());
      if (this.textures.exists(pieceIlot)) gi.setVisible(false);
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
        // Le dessin fait 648 × 550 pixels (marge des traits comprise) dans une texture de 1024 × 1024.
        const im = this.add.image(p.x, p.y + RAYON_ILOT * 0.35, illustration);
        im.setOrigin(324 / im.width, 550 / im.height).setScale((RAYON_ILOT * 1.8) / 648);
        this.ajouter(im);
      }
      // Seuls les îlots spéciaux ont un nom (demande de Clément) ; il passe devant les pieds.
      if (special) {
        etiquettes.push(() =>
          this.etiquette(
            p.x,
            p.y + RAYON_ILOT + 8,
            // Un élève assis sur le banc est planqué : l'étiquette le dit.
            estPlanque(e, id) ? `★ ${TEXTES.planque}` : `★ ${n?.nom ?? id}`,
            COULEURS.jaune,
          ),
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
          { x: m.x, y: m.y - 30 },
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
          c,
        );
      });
    }
  }

  private ficheNoeud(id: string): void {
    const n = this.cour.noeuds[id];
    if (!n) return;
    const F = TEXTES.fiche;
    if (n.type === 'cabane' && n.bande) {
      this.montrerFiche(TEXTES.bandesTitre[n.bande], F.cabane(n.bande), this.pos(id));
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
    this.montrerFiche(special ? n.nom : TEXTES.fiche.titreIlot, morceaux.join(' '), this.pos(id));
  }

  private dessinerCabane(id: string, bande: Bande): void {
    const p = this.pos(id);
    const cabaneCarte = this.visuel.cabane;
    if (cabaneCarte && this.textures.exists(cabaneCarte.image)) {
      // Cabane de la carte (vestiaire, tente) : neutre, les murs prennent la couleur de l'équipe.
      this.ajouter(this.add.image(p.x, p.y - 8, cabaneCarte.image).setScale(136 / 512));
      if (this.textures.exists(cabaneCarte.murs)) {
        const m = this.add.image(p.x, p.y - 8, cabaneCarte.murs).setScale(136 / 512);
        this.ajouter(m.setTint(equipeDe(bande).couleur));
      }
      // La forme de la bande (rond ou carré), lisible sans les couleurs.
      const g = this.ajouter(this.add.graphics());
      const graine = graineDe(p.x, p.y);
      forme(
        g,
        bande === 'rouge'
          ? contourRond(p.x + 40, p.y + 30, 11, graine)
          : contourRect(p.x + 29, p.y + 19, 22, 22, 3, graine, 0.5),
        { remplissage: COULEURS.papier, trait: 3 },
      );
      return;
    }
    const piece = bande === 'rouge' ? PLATEAU.cabaneRouge : PLATEAU.cabaneBleue;
    if (this.textures.exists(piece)) {
      const im = this.add.image(p.x, p.y - 8, piece);
      im.setScale(136 / 512);
      this.ajouter(im);
      // Les murs prennent la couleur de l'équipe qui joue ce camp (DB.1).
      const murs = bande === 'rouge' ? PLATEAU.mursRouge : PLATEAU.mursBleue;
      if (this.textures.exists(murs)) {
        const m = this.add.image(p.x, p.y - 8, murs).setScale(136 / 512);
        m.setTint(equipeDe(bande).couleur);
        this.ajouter(m);
      }
      // La forme de la bande est dans la fenêtre : ronde chez les rouges, carrée chez les bleus.
      return;
    }
    const g = this.ajouter(this.add.graphics());
    const couleur = equipeDe(bande).couleur;
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
    const illustre = true;
    // Lieu illustré (DF.32) : l'image seule, en grand, sans carte de papier autour.
    if (!illustre) {
      forme(g, contourRect(-62, -34, 124, 76, 14, graine), {
        remplissage: COULEURS.papier,
        ombre: 5,
        trait: 4,
      });
    }
    const yTitre = illustre ? -58 : -36;
    const t = this.add
      .text(0, yTitre, titre, {
        fontFamily: POLICE,
        fontSize: '16px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const e = this.add.graphics();
    forme(e, contourRect(-t.width / 2 - 9, yTitre - 12, t.width + 18, 24, 10, graine + 1, 0.6), {
      remplissage: equipeDe(bande).couleur,
      trait: 3,
    });
    c.add([g, e, t]);
    c.setRotation(
      illustre ? 0 : (bande === 'rouge' ? 1 : -1) * (lieu === 'portail' ? -0.04 : 0.04),
    );
    c.setSize(124, illustre ? 120 : 90);
    if (this.ctrl.phase === 'jeu') {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', fiche);
    }
    this.ajouter(c);
    this.panneauxLieux.set(`${bande}:${lieu}`, c);
    return c;
  }

  /** Pastille de nombre d'un lieu illustré (copains au portail, punis à la CPE). */
  private compteurLieu(
    x: number,
    y: number,
    texte: string,
    bande: Bande,
  ): Phaser.GameObjects.Container {
    const t = this.add
      .text(0, 0, texte, {
        fontFamily: POLICE,
        fontSize: '22px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const g = this.add.graphics();
    const l = Math.max(40, t.width + 18);
    forme(g, contourRect(-l / 2, -17, l, 34, 17, graineDe(x, l), 0.5), {
      remplissage: COULEURS.papier,
      trait: 3,
    });
    g.lineStyle(3, equipeDe(bande).couleur, 1);
    return this.add.container(x, y, [g, t]);
  }

  /** Les enrhumés du rang : un mouchoir avec leur nombre, au coin du portail. */
  private dessinerMalades(c: Phaser.GameObjects.Container, malades: number): void {
    if (malades === 0) return;
    const m = this.add.graphics();
    forme(m, contourRond(-46, 30, 17, graineDe(malades, 9)), { remplissage: 0xffffff, trait: 3 });
    m.fillStyle(0xe0503f, 1);
    m.fillRect(-50, 19, 8, 22);
    m.fillRect(-57, 26, 22, 8);
    const tm = this.add
      .text(-30, 44, `${malades}`, {
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

  /** Un bonnet d'âne : cône de papier, oreilles grises, pompon et bandeau bleu. */
  private dessinerBonnetAne(g: Phaser.GameObjects.Graphics, x: number, y: number, k: number): void {
    const P = (px: number, py: number): { x: number; y: number } => ({
      x: x + px * k,
      y: y + py * k,
    });
    // Oreilles d'âne, longues et dressées, derrière le cône.
    for (const sens of [-1, 1]) {
      forme(
        g,
        [
          P(sens * 6, 6),
          P(sens * 16, -16),
          P(sens * 30, -36),
          P(sens * 38, -34),
          P(sens * 32, -12),
          P(sens * 16, 12),
        ],
        { remplissage: 0xb9b3c2, trait: 3 },
      );
      forme(g, [P(sens * 14, 2), P(sens * 30, -28), P(sens * 26, -8)], {
        remplissage: 0xf2b8c6,
        trait: 0,
      });
    }
    // Le cône, légèrement penché.
    forme(g, [P(4, -46), P(-24, 34), P(-14, 40), P(14, 42), P(26, 34)], {
      remplissage: 0xfffaf0,
      trait: 3.5,
      ombre: 4,
    });
    // Bandeau du bas.
    forme(g, [P(-21, 26), P(23, 26), P(26, 34), P(14, 42), P(-14, 40), P(-24, 34)], {
      remplissage: 0xa9bdf0,
      trait: 3,
    });
    // Pompon au sommet.
    g.fillStyle(COULEURS.jaune, 1);
    g.fillCircle(x + 4 * k, y - 47 * k, 6 * k);
    g.lineStyle(3, COULEURS.encre, 1);
    g.strokeCircle(x + 4 * k, y - 47 * k, 6 * k);
  }

  /**
   * Le rang de l'adversaire, à côté de sa cabane : des cartes vues de dos en éventail et leur
   * nombre. On voit combien d'élèves il a en main, pas lesquels.
   */
  private dessinerRangAdverse(bande: Bande): void {
    const cabane = this.cour.cabanes[bande][0];
    if (!cabane) return;
    const p = this.pos(cabane);
    const n = this.etat.joueurs[bande].rang.length;
    const c = this.add.container(p.x + 106, p.y + (bande === 'rouge' ? -20 : 0));
    const couleur = equipeDe(bande).couleur;
    const clair = bande === 'rouge' ? 0xffd2c8 : 0xd5dcff;
    const visibles = Math.min(3, n);
    for (let k = 0; k < visibles; k++) {
      const angle = (k - (visibles - 1) / 2) * 0.28;
      const g = this.add.graphics();
      forme(g, contourRect(-13, -36, 26, 36, 5, graineDe(k, 31), 0.5), {
        remplissage: couleur,
        trait: 3,
        ombre: 2,
      });
      g.fillStyle(clair, 1);
      g.fillRoundedRect(-8, -31, 16, 26, 3);
      g.setPosition(0, 14).setRotation(angle);
      c.add(g);
    }
    const t = this.add
      .text(0, 30, `×${n}`, {
        fontFamily: POLICE,
        fontSize: '28px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
        stroke: '#fff6e4',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    c.add(t);
    c.setScale(1.35).setSize(64, 80);
    if (this.ctrl.phase === 'jeu') {
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () =>
        this.montrerFiche(TEXTES.lieux.ficheRang(bande), TEXTES.lieux.texteRang(n), {
          x: c.x,
          y: c.y,
        }),
      );
    }
    this.ajouter(c);
  }

  /**
   * La pioche (DF.34) : les copains pas encore appelés, en paquet de cartes face cachée, comme
   * les cartes du rang. Le nombre est dans une pastille ; le paquet maigrit quand il se vide.
   */
  private dessinerPortail(bande: Bande): void {
    const j = this.etat.joueurs[bande];
    const n = j.couloir.length;
    const c = this.panneauLieu(bande, 'portail', TEXTES.lieux.portail, () =>
      this.montrerFiche(
        TEXTES.lieux.fichePortail(bande),
        TEXTES.lieux.texteCouloir(n),
        positionLieu(this.cour, bande, 'portail'),
      ),
    );
    const couleur = equipeDe(bande).couleur;
    const g = this.add.graphics();
    const epaisseur = n === 0 ? 0 : Math.min(4, Math.ceil(n / 4));
    const L = 56;
    const H = 80;
    if (n === 0) {
      // Pioche vide : juste l'emplacement en pointillés.
      g.lineStyle(3, COULEURS.encre, 0.5);
      for (let k = 0; k < 12; k += 2) {
        const t0 = k / 12;
        const t1 = (k + 1) / 12;
        const per = (t: number): [number, number] => {
          const d = t * 2 * (L + H);
          if (d < L) return [-L / 2 + d, -H / 2];
          if (d < L + H) return [L / 2, -H / 2 + d - L];
          if (d < 2 * L + H) return [L / 2 - (d - L - H), H / 2];
          return [-L / 2, H / 2 - (d - 2 * L - H)];
        };
        const [x0, y0] = per(t0);
        const [x1, y1] = per(t1);
        g.lineBetween(x0, y0, x1, y1);
      }
    }
    for (let k = epaisseur - 1; k >= 0; k--) {
      const dx = -k * 4;
      const dy = k * 4;
      const graine = graineDe(k, bande.length);
      forme(g, contourRect(dx - L / 2, dy - H / 2, L, H, 9, graine, 0.5), {
        remplissage: couleur,
        trait: 3,
        ombre: k === epaisseur - 1 ? 4 : 0,
      });
      if (k === 0) {
        // Dos de carte : un cadre clair et le goûter de la cour au centre.
        forme(g, contourRect(dx - L / 2 + 7, dy - H / 2 + 7, L - 14, H - 14, 6, graine + 1, 0.4), {
          remplissage: bande === 'rouge' ? 0xf4a29b : 0xa9bdf0,
          trait: 2,
        });
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(dx, dy - 4, 12);
        g.lineStyle(2.5, COULEURS.encre, 1);
        g.strokeCircle(dx, dy - 4, 12);
        g.fillStyle(COULEURS.encre, 1);
        g.fillCircle(dx - 4, dy - 6, 2);
        g.fillCircle(dx + 4, dy - 6, 2);
        g.lineStyle(2, COULEURS.encre, 1);
        g.beginPath();
        g.arc(dx, dy - 3, 5, 0.2, Math.PI - 0.2);
        g.strokePath();
      }
    }
    c.addAt(g, 0);
    c.add(this.compteurLieu(36, 34, `×${n}`, bande));
    this.dessinerMalades(c, j.infirmerie.length);
  }

  /**
   * Les cartons rouges (DF.36) : les exclus, sous un carton rouge brandi. Les 3 derniers arrivés sont
   * en badges ; leur nombre est dans une pastille.
   */
  private dessinerBureauCpe(bande: Bande): void {
    const punis = this.etat.joueurs[bande].cpe;
    const c = this.panneauLieu(bande, 'cpe', TEXTES.lieux.cpe, () =>
      this.montrerFiche(
        TEXTES.lieux.ficheCpe(bande),
        TEXTES.lieux.texteCpe(punis.length),
        positionLieu(this.cour, bande, 'cpe'),
      ),
    );
    // Le carton rouge (DF.36) : illustré, ou à défaut un bonnet d'âne dessiné en code.
    if (this.textures.exists(PLATEAU.carton)) {
      c.addAt(this.add.image(0, -6, PLATEAU.carton).setScale(82 / 512), 0);
    } else {
      const g = this.add.graphics();
      this.dessinerBonnetAne(g, -6, 4, 0.82);
      c.addAt(g, 0);
    }
    // Les exclus (les 3 derniers) et leur nombre.
    punis.slice(-3).forEach((el, k) => {
      const b = creerBadge(this, el.bande, el.role, 22);
      b.setPosition(-30 + k * 18, 42);
      c.add(b);
    });
    c.add(this.compteurLieu(46, 42, punis.length === 0 ? '0' : `×${punis.length}`, bande));
  }

  /** Centre d'une zone, légèrement décalé pour ne pas gêner les allées. */
  private positionGouter(regionId: string): Point {
    const r = this.cour.regions.find((x) => x.id === regionId);
    if (!r) return { x: 0, y: 0 };
    // Goûter placé par le plan (piscine : sur le carrelage, entre la cabane et les deux îlots).
    if (r.gouter) return versEcran(r.gouter.x, r.gouter.y);
    const c = centreRegion(this.cour, r.ilots);
    const decalage = r.id === 'haut' ? -18 : r.id === 'bas' ? -22 : 0;
    return { x: c.x, y: c.y + decalage };
  }

  /** Où se tient la surveillante quand elle garde ce goûter : juste à côté. */
  private positionSurveillante(regionId: string): Point {
    const c = this.positionGouter(regionId);
    return { x: c.x + 42, y: c.y + 4 };
  }

  /** Mme Josiane : la marionnette dodue, ou à défaut un dessin au trait (robe lilas, chignon). */
  private silhouette(x: number, y: number, alpha: number): void {
    const { texture, rig } = this.visuel.surveillant;
    if (this.textures.exists(texture)) {
      const ombre = this.ajouter(this.add.graphics());
      ombre.fillStyle(COULEURS.encre, 0.25);
      ombre.fillEllipse(x + 2, y + 30, 46, 12);
      // Marionnette articulée, comme les élèves (pieds à l'origine).
      const corps = new Marionnette(this, texture, rig, 100 / rig.hauteur);
      const josiane = this.add.container(x, y + 30, [corps.racine]).setAlpha(alpha);
      this.ajouter(josiane);
      this.josiane = josiane;
      animerMarionnette(this, corps, josiane, { caractere: 'surveillante' });
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
        remplissage: equipeDe(prise).couleur,
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
    const illu = cleGouter(index);
    if (this.textures.exists(illu)) {
      this.ajouter(
        this.add
          .image(x, y, illu)
          .setScale(64 / 512)
          .setAlpha(prise ? 0.85 : 1),
      );
    } else {
      this.dessinerFriandise(g, index, x, y);
    }
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
    this.objetsJosiane = [];
    this.ancreJosiane = null;
    const ronde = this.cour.ronde;
    const vue = this.surveillanteVue;
    const garde =
      vue !== null && ronde.length > 0
        ? (this.cour.regions.at(ronde[vue % ronde.length] as number)?.id ?? null)
        : gouterSurveille(this.etat);
    if (!garde) return;
    const { x, y } = this.positionSurveillante(garde);
    const avant = this.dyn.length;
    this.silhouette(x, y, 1);
    this.etiquette(x, y + 34, TEXTES.surveillante, COULEURS.papier);
    this.objetsJosiane = this.dyn.list.slice(avant);
    this.ancreJosiane = { x, y };
  }

  /** Îlots touchables pendant certains choix (Rapporteuse, banc, buts, toboggan). */
  private zonesTactiles(): boolean {
    if (this.ctrl.phase !== 'jeu' || this.tourOrdi) return false;
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
    const bande = this.bandeActive;
    const rangAvant = new Set(this.etat.joueurs[bande].rang.map((el) => el.id));
    if (!action()) return false;
    const nouveaux = this.etat.journal.slice(avant);
    const origines = new Map<string, Point>();
    for (const ev of nouveaux) {
      if (ev.type === 'rappel') origines.set(ev.eleveId, this.pos(ev.ilot));
      if (ev.type === 'repechage')
        origines.set(ev.eleveId, positionLieu(this.cour, ev.bande, 'cpe'));
    }
    const arrivees = planAnimations(nouveaux).filter(({ ev }) =>
      ['appel', 'pioche', 'rappel', 'repechage'].includes(ev.type),
    );
    const debut = arrivees.length > 0 ? Math.min(...arrivees.map((a) => a.debut)) : 0;
    this.rangAvant = { bande, ids: rangAvant, origines, debut };
    const duree = this.animations ? dureeAnimations(nouveaux) : 0;
    this.dureeDernierCoup = duree;
    if (this.ctrl.phase === 'passe' && this.animations) {
      // Coup terminé : le temps de voir l'élève atterrir et ses conséquences, puis on passe le
      // téléphone.
      this.entreDeuxTours = true;
      this.finDeTour?.remove();
      this.finDeTour = this.time.delayedCall(Math.max(DUREE_FIN_DE_TOUR, duree + 250), () => {
        this.entreDeuxTours = false;
        if (!this.ordi) jouerSon('passe');
        this.rafraichir();
      });
    }
    if (this.ctrl.phase === 'fin' && this.animations && duree > 0) {
      // Victoire : on laisse la cour finir le coup (la surveillante qui marche, le goûter qui
      // vole au cartable) avant de cacher la cour sous l'écran de fin.
      this.finEnAttente = true;
      this.finDeTour?.remove();
      this.finDeTour = this.time.delayedCall(duree + 250, () => {
        this.finEnAttente = false;
        this.rafraichir();
      });
    }
    // Tant que ses marches ne sont pas jouées, Mme Josiane reste sur le goûter qu'elle quitte.
    const marche = nouveaux.find((ev) => ev.type === 'surveillante' && ev.pas !== 0);
    if (this.animations && marche?.type === 'surveillante' && this.cour.ronde.length > 0) {
      this.surveillanteVue =
        rondeParcourue(this.cour.ronde.length, marche.position, marche.pas)[0] ?? null;
    }
    // Les goûters ramassés volent jusqu'au cartable : leurs cases se remplissent à l'arrivée.
    if (this.animations) {
      for (const ev of nouveaux) {
        if (ev.type === 'region') this.gouterEnVol[ev.bande] += ev.bonsPoints;
      }
    }
    this.rafraichir();
    this.gouterEnVol = { rouge: 0, bleu: 0 };
    this.rangAvant = null;
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
        remplissage: equipeDe(b).couleur,
        trait: 3,
        ombre: 3,
      });
      this.dyn.addAt(fond, this.dyn.getIndex(t));
    }
  }

  /** Où atterrissent les goûters ramassés : le biscuit de la boîte, en coordonnées d'écran. */
  private casesCartable(bande: Bande, cx: number, cy: number): Point[] {
    const n = Math.max(1, this.cour.seuilBonsPoints);
    return Array.from({ length: n }, () => ({ x: cx - 40, y: cy + 4 }));
  }

  /**
   * Boîte à goûter (DF.37) : un biscuit illustré et le score écrit en gros, « 2 / 3 ».
   * Plus de cases : le nombre de goûters à ramasser se lit d'un coup d'œil.
   */
  private dessinerCartable(bande: Bande, cx: number, cy: number, points: number): void {
    const g = this.ajouter(this.add.graphics());
    const couleur = equipeDe(bande).couleur;
    const n = Math.max(1, this.cour.seuilBonsPoints);
    const l = 150;
    forme(g, contourRect(cx - l / 2, cy - 22, l, 54, 27, graineDe(cx, cy)), {
      remplissage: couleur,
      ombre: 4,
      trait: 4,
    });
    const [cible] = this.casesCartable(bande, cx, cy);
    if (cible) {
      const icone = cleGouter(1);
      if (this.textures.exists(icone)) {
        this.ajouter(this.add.image(cible.x, cible.y, icone).setScale(60 / 512));
      } else {
        this.dessinerBiscuit(g, cible.x, cible.y, 16);
      }
    }
    this.texte(cx + 22, cy + 5, `${Math.min(points, n)} / ${n}`, 30, '#ffffff', {
      fontStyle: '700',
      stroke: '#2b2228',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.cartables[bande] = this.casesCartable(bande, cx, cy);
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
      jouerSon('pendule');
      this.tweens.add({
        targets: grande,
        rotation: angleMinute,
        duration: 380,
        ease: 'Back.easeOut',
      });
    }
    this.tourHorloge = tour;
  }

  /**
   * Une bulle de papier qui pointe vers `ancre` (au-dessus si la place le permet, sinon
   * dessous). Sans ancre, elle se pose juste au-dessus du pupitre.
   */
  private bulle(
    titre: string | null,
    texte: string,
    ancre?: Point,
    fond: number = COULEURS.papier,
    largeurMax = 400,
    /** Forcer la bulle sous ce qu'elle décrit (pour ne pas le cacher). */
    dessous = false,
    /** Décaler la bulle de côté (sa pointe reste sur la cible). */
    decalageX = 0,
  ): Phaser.GameObjects.Container {
    const marge = 16;
    const corps = this.add.text(0, 0, texte, {
      fontFamily: POLICE,
      fontSize: '18px',
      color: COULEURS.texteSombre,
      fontStyle: '500',
      wordWrap: { width: largeurMax - 2 * marge },
    });
    const enTete = titre
      ? this.add.text(0, 0, titre, {
          fontFamily: POLICE,
          fontSize: '18px',
          color: COULEURS.texteSombre,
          fontStyle: '700',
          wordWrap: { width: largeurMax - 2 * marge },
        })
      : null;
    const l = Math.min(largeurMax, Math.max(corps.width, enTete?.width ?? 0) + 2 * marge);
    const h = corps.height + (enTete ? enTete.height + 4 : 0) + 2 * marge - 4;
    const cible = ancre ?? { x: LARGEUR / 2, y: Y_ACTIONS - 60 };
    const dessus = !ancre || (!dessous && cible.y - h - 30 > 130 + MONTEE);
    const x0 = Phaser.Math.Clamp(cible.x - l / 2 + decalageX, GAUCHE + 12, DROITE - 12 - l);
    const y0 = ancre ? (dessus ? cible.y - 26 - h : cible.y + 26) : cible.y - h;
    const g = this.add.graphics();
    forme(g, contourRect(x0, y0, l, h, 16, graineDe(x0, y0), 0.8), {
      remplissage: fond,
      trait: 3,
      ombre: 4,
    });
    if (ancre) {
      // La pointe de la bulle, vers ce qu'elle décrit.
      const px = Phaser.Math.Clamp(cible.x, x0 + 24, x0 + l - 24);
      const by = dessus ? y0 + h - 2 : y0 + 2;
      const pointe = dessus ? cible.y - 6 : cible.y + 6;
      g.fillStyle(fond, 1);
      g.lineStyle(3, COULEURS.encre, 1);
      g.fillTriangle(px - 12, by, px + 12, by, px, pointe);
      g.lineBetween(px - 12, by, px, pointe);
      g.lineBetween(px + 12, by, px, pointe);
    }
    const enfants: Phaser.GameObjects.GameObject[] = [g];
    let y = y0 + marge - 2;
    if (enTete) {
      enTete.setPosition(x0 + marge, y);
      enfants.push(enTete);
      y += enTete.height + 4;
    }
    corps.setPosition(x0 + marge, y);
    enfants.push(corps);
    const c = this.add.container(0, 0, enfants);
    c.setData('cadre', new Phaser.Geom.Rectangle(x0, y0, l, h));
    this.ajouter(c);
    return c;
  }

  /** Fiche d'un élève, d'un îlot ou d'un lieu : une bulle qui pointe vers lui. */
  private dessinerFiche(titre: string, texte: string, ancre?: Point): Phaser.GameObjects.Container {
    const c = this.bulle(titre, texte, ancre);
    // Toucher ailleurs ferme la bulle.
    const fermer = this.add.rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, 0x000000, 0.001);
    fermer.setOrigin(0, 0).setInteractive();
    fermer.on('pointerup', () => this.rafraichir());
    this.dyn.addAt(fermer, this.dyn.getIndex(c));
    if (this.ctrl.phase !== 'jeu') fermer.destroy();
    return c;
  }

  /** Pendant un choix, la consigne est une bulle au-dessus de l'élève ou de l'îlot qui le déclenche. */
  private bulleConsigne(): void {
    const a = this.etat.attente;
    if (!a || this.fiche) return;
    const p = this.pos(a.effet.ilot);
    const c = this.bulle(null, this.consigne(), { x: p.x, y: p.y - RAYON_ILOT }, COULEURS.jaune);
    this.tweens.add({
      targets: c,
      y: -5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
      if (boutons.length === 1 && n > 0) {
        // Plus de feuille de cahier (demande de Clément) : le bouton est posé seul sur le décor.
        const b = boutons[0] as (typeof boutons)[number];
        this.ajouter(
          creerBouton(this, LARGEUR / 2, Y_ACTIONS, b.texte, b.action, {
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
    // « Passer » ne sert presque jamais (demande de Clément) : on le garde pour le Délégué.
    // Ailleurs, on touche la cible.
    // Filet de sécurité : sans surveillante à toucher, le mot d'excuse se passe aussi.
    const sansCible =
      attente.options.every((o) => o.type === 'surveillante') && !gouterSurveille(this.etat);
    // Le mot d'excuse du Délégué peut aussi se garder (demande de Clément) : éloigner Mme Josiane
    // n'arrange pas toujours.
    const passerUtile =
      (attente.effet.type === 'pouvoir' && attente.effet.role === 'delegue') || sansCible;
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

  /**
   * Le rang d'une bande, en bas. `interactif` : ses cartes se touchent et se glissent ; sinon il
   * reste juste visible (pendant un choix hors du rang, ou le temps de voir la fin de son coup).
   */
  private dessinerRang(bande: Bande, interactif: boolean): void {
    this.rangVisible = bande;
    const e = this.etat;
    const j = e.joueurs[bande];
    // Le couloir et la CPE sont dessinés autour de la cour (portail, bureau) : plus de compteurs ici.
    // Plus de « Touche un élève » au-dessus du rang (DF.24) : le tuto l'expliquera.
    if (j.rang.length === 0 && interactif) {
      this.texte(
        LARGEUR / 2,
        RANG.y,
        aide(TEXTES.hud.rangVide, FUN.hud.rangVide, this.etat.tour),
        22,
        COULEURS.texteSombre,
        {
          fontStyle: '600',
          align: 'center',
          wordWrap: { width: LARGEUR - 80 },
          stroke: '#fff6e4',
          strokeThickness: 6,
        },
      ).setOrigin(0.5);
      return;
    }
    const attente = interactif ? e.attente : null;
    const optionsChouchou =
      attente?.options.filter((o): o is Extract<Option, { type: 'poser' }> => o.type === 'poser') ??
      null;

    // Les nouveaux venus volent jusqu'à leur place : copains appelés depuis le portail, élève
    // rappelé depuis son îlot, élève repêché depuis le bureau de la CPE.
    const avant = this.rangAvant?.bande === bande ? this.rangAvant : null;
    const portailBande = positionLieu(this.cour, bande, 'portail');
    let nouveaux = 0;
    j.rang.forEach((el, i) => {
      const malade = j.infirmerie.includes(el.id);
      const cibles = !interactif
        ? []
        : optionsChouchou
          ? optionsChouchou.filter((o) => o.eleveId === el.id).map((o) => o.cible)
          : malade
            ? []
            : ciblesPossibles(e, el.id);
      const x = xCarteRang(i, j.rang.length);
      const carte = this.carte(el, x, RANG.y, malade, !interactif || cibles.length > 0);
      if (interactif) {
        this.rendreTouchable(carte, el, malade, cibles.length > 0);
        if (cibles.length > 0) this.rendreDeplacable(carte, el, cibles, optionsChouchou !== null);
      }
      if (avant && !avant.ids.has(el.id) && this.animations) {
        const portail = avant.origines.get(el.id) ?? portailBande;
        const delai = avant.debut + DUREE_ARRIVEE_CARTE * 0.25 * nouveaux++;
        const angle = carte.rotation;
        carte.setPosition(portail.x, portail.y).setScale(0.4).setAngle(-30).setAlpha(0);
        this.tweens.add({
          targets: carte,
          alpha: 1,
          duration: 80,
          delay: delai,
        });
        this.tweens.addCounter({
          from: 0,
          to: 1,
          delay: delai,
          duration: DUREE_ARRIVEE_CARTE,
          ease: 'Sine.easeInOut',
          onUpdate: (tw) => {
            const v = tw.getValue() ?? 0;
            carte.setPosition(
              portail.x + (x - portail.x) * v,
              portail.y + (RANG.y - portail.y) * v - Math.sin(v * Math.PI) * 140,
            );
            carte.setScale(0.4 + 0.6 * v);
            carte.setRotation(angle + (1 - v) * -0.5);
          },
          onComplete: () => {
            this.tweens.add({
              targets: carte,
              scaleY: 0.85,
              scaleX: 1.12,
              duration: 70,
              yoyo: true,
            });
          },
        });
      }
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
        { x: carte.x, y: carte.y - RANG.hauteurCarte / 2 },
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
      // Pendant le glisser, la fiche est une simple bulle (rien à toucher pour la fermer).
      ficheGlisse = this.bulle(
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
    const couleur = equipeDe(bande).couleur;
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
    // La bande qui vient de jouer voit encore son rang (le téléphone est toujours dans ses mains) :
    // les copains appelés y arrivent.
    this.dessinerRang(this.bandeVue, false);
    this.texte(
      LARGEUR / 2,
      Y_ACTIONS,
      TEXTES.passe.bientot(this.etat.courant),
      24,
      COULEURS.texteSombre,
      { fontStyle: '700', stroke: '#fff6e4', strokeThickness: 6 },
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

  /**
   * Fiche de la cour, au lancement (demandes de Clément) : la vraie cour reste visible et se
   * légende elle-même par quelques bulles ; un bandeau en haut donne le nom et le contexte, un
   * volet en bas la règle spéciale et « C'est parti ! ». En ligne, le volet servira d'écran
   * d'attente (`attenteAdversaire`).
   */
  private dessinerPresentation(): void {
    const P = TEXTES.presentation;
    const infos = P.cours[this.cour.id];
    // La cour déjà dessinée passe dans un plateau qu'on recentre (et réduit si besoin) entre le
    // bandeau et le volet.
    const plateau = this.add.container(0, 0);
    const objets = [...this.dyn.list];
    this.dyn.removeAll(false);
    plateau.add(objets);
    this.dyn.add(plateau);
    // La cour ne se touche pas pendant la fiche.
    const bloc = this.ajouter(
      this.add.rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, COULEURS.fondSombre, 0.12),
    );
    bloc.setOrigin(0, 0).setInteractive();
    const cx = LARGEUR / 2;

    // Bandeau du haut : le nom de la cour et le contexte, par-dessus le bandeau de jeu.
    const fondHaut = this.ajouter(this.add.graphics());
    const titre = this.texte(cx, HAUT + 22, this.cour.nom, 34, COULEURS.texteSombre, {
      fontFamily: POLICE_TITRE,
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    let bas = titre.y + titre.height;
    if (infos) {
      const t = this.texte(cx, bas + 6, infos.contexte, 18, COULEURS.texteSombre, {
        fontStyle: '500',
        align: 'center',
        wordWrap: { width: LARGEUR - 90 },
      }).setOrigin(0.5, 0);
      bas = t.y + t.height;
    }
    forme(
      fondHaut,
      contourRect(GAUCHE - 20, HAUT - 30, DROITE - GAUCHE + 40, bas - HAUT + 50, 26, 5),
      {
        remplissage: COULEURS.papier,
        ombre: 6,
      },
    );

    // Volet du bas : la règle spéciale et le bouton (ou l'attente d'un adversaire).
    const regle = this.etat.equipements && infos ? infos.regle : P.sansRegle;
    const yBouton = Math.min(BAS - 64, 1210 + DESCENTE);
    const corps = this.texte(cx, 0, regle, 18, COULEURS.texteSombre, {
      fontStyle: '500',
      align: 'center',
      wordWrap: { width: LARGEUR - 110 },
    }).setOrigin(0.5, 0);
    const enTete = this.texte(cx, 0, P.regleTitre, 22, COULEURS.texteSombre, {
      fontStyle: '700',
    }).setOrigin(0.5, 0);
    const haut = yBouton - 64 - corps.height - enTete.height - 34;
    enTete.setY(haut + 22);
    corps.setY(enTete.y + enTete.height + 4);
    const fondBas = this.add.graphics();
    forme(fondBas, contourRect(GAUCHE - 20, haut, DROITE - GAUCHE + 40, BAS - haut + 40, 26, 9), {
      remplissage: COULEURS.jaune,
      ombre: 6,
    });
    this.dyn.addAt(fondBas, this.dyn.getIndex(corps));
    // Le plateau : de la toiture de la cabane du haut aux bureaux du bas, centré dans l'espace libre.
    const bleue = this.cour.cabanes.bleu[0];
    const rouge = this.cour.cabanes.rouge[0];
    const dessusCour = bleue ? this.pos(bleue).y - 80 : ZONE_HAUT_COUR;
    const dessousCour = rouge
      ? Math.max(this.pos(rouge).y + 50, positionLieu(this.cour, 'rouge', 'portail').y + 60)
      : haut;
    const libreHaut = bas + 24;
    const libreBas = haut - 12;
    const echelle = Math.min(1, (libreBas - libreHaut) / (dessousCour - dessusCour));
    plateau.setScale(echelle);
    plateau.setPosition(
      (LARGEUR * (1 - echelle)) / 2,
      (libreHaut + libreBas) / 2 - ((dessusCour + dessousCour) / 2) * echelle,
    );
    const surPlateau = (p: Point): Point => ({
      x: plateau.x + p.x * echelle,
      y: plateau.y + p.y * echelle,
    });

    // Les bulles posées sur la cour, qui apparaissent l'une après l'autre.
    const bulles: { ancre: Point; texte: string; dessous?: boolean; decalage?: number }[] = [];
    const cabane = this.cour.cabanes.bleu[0];
    if (cabane) {
      const p = this.pos(cabane);
      bulles.push({ ancre: { x: p.x, y: p.y + 34 }, texte: P.bulles.cabane, dessous: true });
    }
    // Le goûter le plus bas de la cour que personne ne garde : loin de la bulle de la cabane.
    const gardee = gouterSurveille(this.etat);
    const region =
      this.cour.regions.find((r) => r.id === 'bas') ??
      [...this.cour.regions]
        .filter((r) => r.id !== gardee)
        .sort((r1, r2) => this.positionGouter(r2.id).y - this.positionGouter(r1.id).y)[0];
    if (region) {
      const c = this.positionGouter(region.id);
      bulles.push({
        ancre: { x: c.x, y: region.id === 'bas' ? c.y + 22 : c.y - 26 },
        texte: P.bulles.gouter(this.cour.seuilBonsPoints),
        // Sous le goûter du bas de la récré ; ailleurs, au-dessus, pour ne pas cacher sa cabane.
        dessous: region.id === 'bas',
      });
    }
    const banc = this.etat.equipements
      ? [...this.cour.ilots].reverse().find((id) => this.cour.noeuds[id]?.equipement === 'banc')
      : undefined;
    if (banc) {
      const p = this.pos(banc);
      bulles.push({ ancre: { x: p.x, y: p.y - RAYON_ILOT }, texte: P.bulles.banc });
    }
    const garde = gouterSurveille(this.etat);
    if (garde) {
      const m = this.positionSurveillante(garde);
      // Au-dessus de sa tête, pour ne pas la cacher.
      bulles.push({
        ancre: { x: m.x, y: m.y - 82 },
        texte: P.bulles.josiane,
        // Vers le bord le plus proche, pour ne pas cacher le goûter du milieu.
        decalage: m.x < LARGEUR / 2 ? -110 : 110,
      });
    }
    const posees: Phaser.Geom.Rectangle[] = [];
    const gouters = this.cour.regions.map((r) => surPlateau(this.positionGouter(r.id)));
    const cadre = (c: Phaser.GameObjects.Container): Phaser.Geom.Rectangle =>
      c.getData('cadre') as Phaser.Geom.Rectangle;
    bulles.forEach((b, i) => {
      const poser = (
        dessous: boolean | undefined,
        decalage?: number,
      ): Phaser.GameObjects.Container =>
        this.bulle(null, b.texte, surPlateau(b.ancre), COULEURS.papier, 300, dessous, decalage);
      // Une bulle ne cache ni une autre bulle ni un goûter : sinon elle passe de l'autre côté de
      // ce qu'elle montre, ou de côté (sa pointe reste sur sa cible).
      const gene = (r: Phaser.Geom.Rectangle): boolean =>
        posees.some((q) => Phaser.Geom.Intersects.RectangleToRectangle(q, r)) ||
        gouters.some((g) => Phaser.Geom.Rectangle.Contains(r, g.x, g.y));
      const essais: [boolean | undefined, number | undefined][] = [
        [b.dessous, b.decalage],
        [b.dessous, 150],
        [b.dessous, -150],
        [!b.dessous, b.decalage],
      ];
      let c = poser(b.dessous, b.decalage);
      for (const [dessous, decalage] of essais.slice(1)) {
        if (!gene(cadre(c))) break;
        const autre = poser(dessous, decalage);
        if (gene(cadre(autre))) {
          autre.destroy();
        } else {
          c.destroy();
          c = autre;
        }
      }
      posees.push(cadre(c));
      if (!this.animations) return;
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 220, delay: 300 + i * 450 });
      this.tweens.add({
        targets: c,
        y: { from: 14, to: 0 },
        duration: 320,
        delay: 300 + i * 450,
        ease: 'Back.easeOut',
      });
    });

    if (this.attenteAdversaire) {
      const t = this.texte(cx, yBouton, `${P.attente}…`, 26, COULEURS.texteSombre, {
        fontStyle: '700',
      }).setOrigin(0.5);
      this.tweens.add({ targets: t, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
      return;
    }
    this.ajouter(
      creerBouton(
        this,
        cx,
        yBouton,
        P.bouton,
        () => {
          this.presentation = false;
          this.rafraichir();
        },
        { largeur: 400, hauteur: 80, taille: 30, couleur: COULEURS.papier },
      ),
    );
  }

  /** Ce que l'adversaire vient de faire (remplace l'ancien journal en bas de l'écran). */
  private resumeCoupAdverse(cx: number, y: number): void {
    const journal = this.etat.journal;
    const dernier = journal.at(-1);
    if (!dernier) return;
    const lignes: string[] = [];
    for (let i = journal.length - 1; i >= 0; i--) {
      const ev = journal[i] as Evenement;
      if (ev.tour !== dernier.tour) break;
      const p = phraseEvenement(ev, this.cour, tonFun(), i);
      if (p) lignes.unshift(p);
    }
    if (lignes.length === 0) return;
    this.texte(cx, y, TEXTES.passe.resume, 22, COULEURS.texteSombre, {
      fontStyle: '700',
    }).setOrigin(0.5);
    this.texte(cx, y + 24, lignes.slice(-3).join('\n'), 21, COULEURS.texteSombre, {
      fontStyle: '500',
      align: 'center',
      lineSpacing: 6,
      wordWrap: { width: LARGEUR - 170 },
    }).setOrigin(0.5, 0);
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
    const eleve = skinActif().eleve(this, b, b === 'rouge' ? 'grand' : 'petit', 100);
    eleve.setPosition(cx, 540);
    this.ajouter(eleve);
    this.tweens.add({
      targets: eleve,
      y: 528,
      angle: { from: -3, to: 3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.resumeCoupAdverse(cx, 690);
    this.texte(
      cx,
      840,
      aide(TEXTES.passe.cache, FUN.passe.cache, this.etat.tour),
      20,
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
        925,
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
    if (!this.conseilsActifs || this.tourOrdi) return;
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
        this.copainsArrivent(ev.bande);
        break;
      case 'cpe':
        this.volerVersLieu(this.pos(ev.ilot), ev.bande, ev.role, ev.bande, 'cpe');
        break;
      case 'infirmerie':
        this.eternuement(origine, ev.bande);
        break;
      case 'rappel':
      case 'repechage':
        // La carte de l'élève vole elle-même jusqu'au rang (voir dessinerRang).
        jouerSon('pioche');
        break;
      case 'surveillante':
        this.marcheSurveillante(ev.position, ev.pas);
        break;
      case 'courant':
        this.tourbillon(ev.anneau);
        break;
      case 'fin':
        this.victoire(ev.raison === 'cabane');
        break;
      default:
        break;
    }
  }

  /** Le courant de la piscine (DB.3) : un tourbillon de flèches autour du grand bain. */
  private tourbillon(anneau: string[]): void {
    if (!this.animations || anneau.length === 0) return;
    const pts = anneau.map((id) => this.pos(id));
    const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length;
    const cy = pts.reduce((t, p) => t + p.y, 0) / pts.length;
    const r = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) * 0.62;
    const g = this.add.graphics().setPosition(cx, cy).setDepth(50);
    for (let k = 0; k < 4; k++) {
      const a0 = (k * Math.PI) / 2 + 0.2;
      const a1 = a0 + Math.PI / 2 - 0.5;
      for (const [l, c] of [
        [14, COULEURS.encre],
        [7, 0xffffff],
      ] as const) {
        g.lineStyle(l, c, 1);
        g.beginPath();
        g.arc(0, 0, r, a0, a1);
        g.strokePath();
        const bout = { x: Math.cos(a1) * r, y: Math.sin(a1) * r };
        const t = { x: -Math.sin(a1), y: Math.cos(a1) };
        const n = { x: Math.cos(a1), y: Math.sin(a1) };
        g.beginPath();
        g.moveTo(bout.x - t.x * 14 + n.x * 12, bout.y - t.y * 14 + n.y * 12);
        g.lineTo(bout.x + t.x * 6, bout.y + t.y * 6);
        g.lineTo(bout.x - t.x * 14 - n.x * 12, bout.y - t.y * 14 - n.y * 12);
        g.strokePath();
      }
    }
    g.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: g, angle: 120, duration: 900, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: g,
      alpha: 0,
      delay: 700,
      duration: 300,
      onComplete: () => g.destroy(),
    });
    jouerSon('glissade');
    this.onomatopee(cx, cy, 'GLOUGLOU !', 34, '#bfefff');
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
    // Le nuage de bagarre, par-dessus l'îlot (DF.38).
    jouerIncrust(this, 'plaquage', p.x, p.y - 10, 260);
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

  /** Les copains appelés : le portail s'ouvre (leurs cartes volent jusqu'au rang). */
  private copainsArrivent(bande: Bande): void {
    this.rebondLieu(bande, 'portail');
    // Le mégaphone qui appelle les copains, au-dessus du portail (DF.38).
    const portail = positionLieu(this.cour, bande, 'portail');
    jouerIncrust(this, 'appelCopains', portail.x, portail.y - 40, 230);
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

  /**
   * Mme Josiane marche jusqu'au goûter qu'elle va garder, à petits pas sautillants, en suivant
   * sa ronde (elle longe les goûters qu'elle saute). Plusieurs marches dans un même coup (le
   * Délégué, puis le pas de fin de tour) se suivent : chacune part de là où l'autre s'arrête.
   */
  private marcheSurveillante(position: number, pas: number): void {
    const ronde = this.cour.ronde;
    if (ronde.length === 0 || pas === 0) return;
    const etapes = rondeParcourue(ronde.length, position, pas).map((k) => {
      const id = this.cour.regions.at(ronde[k] as number)?.id;
      return id ? this.positionSurveillante(id) : null;
    });
    if (etapes.some((p) => p === null)) return;
    const points = etapes as Point[];
    const depart = points[0] as Point;
    const fini = (): void => {
      this.marchesEnCours = Math.max(0, this.marchesEnCours - 1);
      // La dernière marche finie, on la montre de nouveau là où le moteur la place.
      this.surveillanteVue = this.marchesEnCours > 0 ? position : null;
    };
    this.marchesEnCours += 1;
    // On la place au départ (elle y est peut-être déjà), puis on la déplace d'autant.
    const deplacer = (p: Point): void => {
      const ici = this.ancreJosiane;
      if (!ici) return;
      const dx = p.x - ici.x;
      const dy = p.y - ici.y;
      for (const o of this.objetsJosiane) {
        const t = o as unknown as Phaser.GameObjects.Components.Transform;
        if (o.active) t.setPosition(t.x + dx, t.y + dy);
      }
      this.ancreJosiane = p;
    };
    deplacer(depart);
    this.onomatopee(depart.x, depart.y - 40, TEXTES.animations.sifflet, 26, '#e2c8ff');
    jouerSon('sifflet');
    const segments = points.length - 1;
    const arrivee = points[segments] as Point;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: DUREE_CONSEQUENCE,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        const k = Math.min(segments - 1, Math.floor(v * segments));
        const a = points[k] as Point;
        const b = points[k + 1] as Point;
        const u = v * segments - k;
        // Petits pas : elle sautille 5 fois par goûter.
        const saut = Math.abs(Math.sin(v * Math.PI * 5 * segments)) * 10;
        deplacer({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - saut });
      },
      onComplete: () => {
        deplacer(arrivee);
        fini();
      },
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
    if (id === 'sonnerie') picto.setVisible(false);
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
    const gouter = picto.getData('gouter') as number | undefined;
    if (gouter !== undefined) {
      scene.add(this.add.image(picto.x, picto.y, cleGouter(gouter)).setScale(170 / 512));
    }
    const imagePicto = picto.getData('image') as string | undefined;
    if (imagePicto) scene.add(this.add.image(picto.x, picto.y, imagePicto).setScale(190 / 512));
    // Le réveil qui sonne remplace le pictogramme de la sonnerie (DF.38).
    if (id === 'sonnerie') jouerIncrust(this, 'sonnerie', 150, 640, 240, { parent: scene });
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
      case 'cpe': // Le carton rouge (DF.36), ou à défaut le bonnet d'âne
        if (this.textures.exists(PLATEAU.carton)) g.setData('image', PLATEAU.carton);
        else this.dessinerBonnetAne(g, 0, -10, 1.9);
        break;
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
      case 'grandsFreres': // Une grande silhouette : le Chouchou n'appelle qu'un renfort
        for (const dx of [0]) {
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
        if (this.textures.exists(cleGouter(i))) g.setData('gouter', i);
        else this.dessinerFriandise(g, i, 0, 0);
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
      this.ordi
        ? TEXTES.fin.gagnantSolo(fin.gagnant === this.ordi.bande)
        : TEXTES.fin.gagnant(fin.gagnant),
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
