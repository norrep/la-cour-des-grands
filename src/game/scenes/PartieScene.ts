import Phaser from 'phaser';
import { COURS } from '../../data/boards/index';
import { TEXTES } from '../../data/textes';
import {
  actionsLegales,
  alleeSuivante,
  alleeSurveillante,
  chargerCour,
  ciblesPossibles,
  ilotsSurveilles,
  ROLES,
  sommet,
  valeur,
  type Bande,
  type Cour,
  type CourData,
  type Eleve,
  type Evenement,
  type Option,
} from '../../engine/index';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { alleesDuChemin } from '../chemins';
import { cinematiquesPour, type Cinematique, type CinematiqueId } from '../cinematiques';
import { prochainConseil, type ConseilId } from '../conseils';
import { Controleur } from '../controleur';
import {
  centreRegion,
  noeudSous,
  positionNoeud,
  RANG,
  xCarteRang,
  type Point,
} from '../disposition';
import { dernieresLignes, nomGouter } from '../journal';
import { creerBadge } from '../ui/badge';
import { skinActif } from '../skins/index';
import { creerBouton } from '../ui/bouton';
import { ecrireConseils, lireSons } from '../preferences';
import { activerSons, jouerSon, type SonId } from '../sons';
import { HAUTEUR_PRISE, PantinVisuel, VISEE } from '../ui/pantin';
import type { DonneesPartie } from './AccueilScene';

const RAYON_ILOT = 48;
const TAILLE_BADGE = 62;
const RAYON_DEPOT = 75;
const Y_JOURNAL = 935;
const Y_ACTIONS = 1040;
/** Temps laissé pour voir un coup avant de passer le téléphone (ms). */
const DUREE_FIN_DE_TOUR = 900;

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
    this.cameras.main.setBackgroundColor(COULEURS.fond);
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
    this.dessinerHud();
    this.dessinerJournal();
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
    const bloquee = alleeSurveillante(e);
    const suivante = alleeSuivante(e);

    // Chemin à la craie de chaque bande : les allées qui relient sa cabane à ses îlots.
    for (const b of ['rouge', 'bleu'] as const) {
      g.lineStyle(22, b === 'rouge' ? COULEURS.rouge : COULEURS.bleu, 0.8);
      for (const i of alleesDuChemin(e, b)) {
        const [a, c] = this.cour.allees[i] as [string, string];
        const pa = this.pos(a);
        const pc = this.pos(c);
        g.lineBetween(pa.x, pa.y, pc.x, pc.y);
      }
    }

    // Allées en pointillés à la craie ; celle de la surveillante en violet plein.
    this.cour.allees.forEach(([a, b], i) => {
      const pa = this.pos(a);
      const pb = this.pos(b);
      if (i === bloquee) {
        // Allée bloquée par la surveillante : trait plein rouge, bien visible.
        g.lineStyle(10, COULEURS.bloquee, 0.95);
        g.lineBetween(pa.x, pa.y, pb.x, pb.y);
      } else {
        g.lineStyle(5, COULEURS.craie, 0.75);
        this.pointilles(g, pa, pb);
      }
    });

    // Zones à bons points : un goûter à ramasser au centre, entouré de la couleur du gagnant.
    this.cour.regions.forEach((r, i) => {
      const c = this.positionGouter(r.id);
      this.dessinerGouter(i, c.x, c.y, r.bonsPoints, e.regionsPrises[r.id]);
    });

    // Cabanes.
    for (const b of ['rouge', 'bleu'] as const) {
      for (const id of this.cour.cabanes[b]) this.dessinerCabane(id, b);
    }

    // Îlots et piles.
    const surveilles = new Set(ilotsSurveilles(e));
    for (const id of this.cour.ilots) {
      const p = this.pos(id);
      const n = this.cour.noeuds[id];
      const special = e.equipements && n?.equipement;
      const gi = this.ajouter(this.add.graphics());
      gi.fillStyle(0x000000, 0.2);
      gi.fillCircle(p.x + 3, p.y + 5, RAYON_ILOT);
      gi.fillStyle(special ? COULEURS.ilotSpecial : COULEURS.ilot, 1);
      gi.lineStyle(4, COULEURS.craie, 1);
      gi.fillCircle(p.x, p.y, RAYON_ILOT);
      gi.strokeCircle(p.x, p.y, RAYON_ILOT);
      if (surveilles.has(id)) {
        gi.lineStyle(4, COULEURS.surveillante, 1);
        const pts = 16;
        for (let k = 0; k < pts; k += 2) {
          const a1 = (k / pts) * Math.PI * 2;
          const a2 = ((k + 1) / pts) * Math.PI * 2;
          gi.beginPath();
          gi.arc(p.x, p.y, RAYON_ILOT + 9, a1, a2);
          gi.strokePath();
        }
      }
      this.texte(
        p.x,
        p.y + RAYON_ILOT + 4,
        special ? `★ ${n?.nom ?? id} ★` : (n?.nom ?? id),
        special ? 18 : 16,
        special ? '#ffe066' : COULEURS.texteClair,
        {
          stroke: COULEURS.texteSombre,
          strokeThickness: 4,
          fontStyle: special ? 'bold' : 'normal',
        },
      ).setOrigin(0.5, 0);

      // Élèves plaqués : petits badges en colonne à gauche de l'îlot (le plus haut = juste dessous).
      const pileIlot = e.piles[id] ?? [];
      const dessous = pileIlot.slice(0, -1).reverse();
      dessous.slice(0, 4).forEach((el, k) => {
        const mini = creerBadge(this, el.bande, el.role, 26);
        mini.setPosition(p.x - RAYON_ILOT - 24, p.y - 30 + k * 22);
        mini.setAlpha(0.95);
        this.ajouter(mini);
      });

      const dessus = sommet(e, id);
      if (dessus) {
        const badge = skinActif().eleve(this, dessus.bande, dessus.role, TAILLE_BADGE);
        badge.setPosition(p.x, p.y);
        this.ajouter(badge);
        this.badges.set(id, badge);
        const hauteur = e.piles[id]?.length ?? 0;
        if (hauteur > 1) {
          const cg = this.ajouter(this.add.graphics());
          cg.fillStyle(COULEURS.papier, 1);
          cg.lineStyle(2, COULEURS.fondSombre, 1);
          cg.fillCircle(p.x + 38, p.y - 34, 15);
          cg.strokeCircle(p.x + 38, p.y - 34, 15);
          this.texte(p.x + 38, p.y - 34, `×${hauteur}`, 15, COULEURS.texteSombre, {
            fontStyle: 'bold',
          }).setOrigin(0.5);
        }
      }
    }

    this.marcheSurveillante(bloquee, suivante);
    this.dessinerSurveillante(bloquee);
    if (!this.zonesTactiles()) this.zonesInformation();
    this.bulleEffet();
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
    // La surveillante : où elle bloque, où elle ira.
    const ronde = this.etat;
    const m = this.milieuAllee(alleeSurveillante(ronde));
    const zs = this.ajouter(this.add.circle(m.x, m.y, 34, 0xffffff, 0.001));
    zs.setInteractive();
    zs.on('pointerup', () =>
      this.montrerFiche(
        TEXTES.surveillante,
        TEXTES.fiche.surveillante(
          this.nomAllee(alleeSurveillante(ronde)),
          this.nomAllee(alleeSuivante(ronde)),
        ),
      ),
    );
    // Goûters : toucher montre les îlots de la zone.
    for (const r of this.cour.regions) {
      const c = this.positionGouter(r.id);
      const zone = this.ajouter(this.add.circle(c.x, c.y, 34, 0xffffff, 0.001));
      zone.setInteractive();
      zone.on('pointerup', () => {
        const prise = this.etat.regionsPrises[r.id];
        const noms = r.ilots.map((id) => this.cour.noeuds[id]?.nom ?? id);
        this.montrerFiche(
          TEXTES.regionTitre(nomGouter(this.cour, r.id), r.bonsPoints),
          prise ? TEXTES.regionPrise(prise, r.bonsPoints) : TEXTES.region(r.bonsPoints, noms),
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
    if (ilotsSurveilles(this.etat).includes(id)) morceaux.push(F.surveille);
    const pile = (this.etat.piles[id] ?? []).slice().reverse();
    morceaux.push(
      pile.length === 0
        ? F.ilotVide
        : F.pile(pile.map((el) => F.elevePile(el.role, el.bande, valeur(el.role)))),
    );
    this.montrerFiche(n.nom, morceaux.join(' '));
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
    g.fillStyle(0x000000, 0.2);
    g.fillRect(p.x - 56, p.y - 18, 116, 60);
    g.fillStyle(couleur, 1);
    g.lineStyle(4, COULEURS.craie, 1);
    g.fillRect(p.x - 60, p.y - 22, 120, 60);
    g.strokeRect(p.x - 60, p.y - 22, 120, 60);
    g.fillTriangle(p.x - 72, p.y - 20, p.x + 72, p.y - 20, p.x, p.y - 62);
    g.strokeTriangle(p.x - 72, p.y - 20, p.x + 72, p.y - 20, p.x, p.y - 62);
    g.fillStyle(COULEURS.fondSombre, 1);
    g.fillRect(p.x - 12, p.y + 4, 24, 34);
    // Badge de forme de la bande, pour les daltoniens.
    g.fillStyle(COULEURS.craie, 1);
    if (bande === 'rouge') g.fillCircle(p.x - 36, p.y + 8, 9);
    else g.fillRect(p.x - 45, p.y - 1, 18, 18);
  }

  /** Centre d'une zone, légèrement décalé pour ne pas gêner les allées. */
  private positionGouter(regionId: string): Point {
    const r = this.cour.regions.find((x) => x.id === regionId);
    if (!r) return { x: 0, y: 0 };
    const c = centreRegion(this.cour, r.ilots);
    const decalage = r.id === 'haut' ? -18 : r.id === 'bas' ? -22 : 0;
    return { x: c.x, y: c.y + decalage };
  }

  private milieuAllee(allee: number): Point {
    const [a, b] = this.cour.allees[allee] as [string, string];
    const pa = this.pos(a);
    const pb = this.pos(b);
    return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
  }

  private nomAllee(allee: number): string {
    const [a, b] = this.cour.allees[allee] as [string, string];
    const nom = (id: string) => this.cour.noeuds[id]?.nom ?? id;
    return `${nom(a)} – ${nom(b)}`;
  }

  /**
   * Prochaine étape de la ronde : traces de pas qui partent de la surveillante, passent par
   * le coin commun aux deux allées et mènent à sa silhouette pâle, là où elle sera ensuite.
   */
  private marcheSurveillante(actuelle: number, suivante: number): void {
    const depart = this.milieuAllee(actuelle);
    const arrivee = this.milieuAllee(suivante);
    const [a, b] = this.cour.allees[actuelle] as [string, string];
    const autre = this.cour.allees[suivante] as [string, string];
    const commun = autre.includes(a) ? a : autre.includes(b) ? b : null;
    const points = commun ? [depart, this.pos(commun), arrivee] : [depart, arrivee];

    // Longueur du trajet, puis un pas tous les ~34 px, sans marcher sur les deux silhouettes.
    const segments = points.slice(1).map((p, i) => {
      const q = points[i] as Point;
      return { de: q, a: p, long: Math.hypot(p.x - q.x, p.y - q.y) };
    });
    const total = segments.reduce((t, sg) => t + sg.long, 0);
    const surChemin = (d: number): { x: number; y: number; angle: number } | null => {
      let reste = d;
      for (const sg of segments) {
        if (reste <= sg.long) {
          const t = reste / sg.long;
          return {
            x: sg.de.x + (sg.a.x - sg.de.x) * t,
            y: sg.de.y + (sg.a.y - sg.de.y) * t,
            angle: Math.atan2(sg.a.y - sg.de.y, sg.a.x - sg.de.x),
          };
        }
        reste -= sg.long;
      }
      return null;
    };
    const cache = (x: number, y: number): boolean => {
      if (!commun) return false;
      const c = this.pos(commun);
      return Math.hypot(x - c.x, y - c.y) < RAYON_ILOT + 4;
    };
    let k = 0;
    for (let d = 40; d < total - 56; d += 30, k++) {
      const p = surChemin(d);
      if (!p) break;
      const cote = k % 2 === 0 ? 6 : -6;
      const x = p.x - Math.sin(p.angle) * cote;
      const y = p.y + Math.cos(p.angle) * cote;
      if (cache(x, y)) continue; // Pas cachés sous l'îlot du coin.
      const pas = this.ajouter(this.add.ellipse(x, y, 18, 10, COULEURS.surveillante, 1));
      pas.setRotation(p.angle);
      pas.setStrokeStyle(2, COULEURS.craie, 1);
    }
    // Flèche juste avant la silhouette pâle, dans le sens de la marche.
    const bout = surChemin(Math.max(0, total - 38));
    if (bout && !cache(bout.x, bout.y)) {
      const { x, y, angle } = bout;
      const f = this.ajouter(this.add.graphics());
      f.fillStyle(COULEURS.surveillante, 1);
      f.lineStyle(2, COULEURS.craie, 1);
      const pt = (d: number, o: number) => ({
        x: x + Math.cos(angle) * d - Math.sin(angle) * o,
        y: y + Math.sin(angle) * d + Math.cos(angle) * o,
      });
      const [p1, p2, p3] = [pt(11, 0), pt(-7, 10), pt(-7, -10)];
      f.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      f.strokeTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    }
    this.silhouette(arrivee.x, arrivee.y, 0.5);
  }

  private silhouette(x: number, y: number, alpha: number): void {
    const g = this.ajouter(this.add.graphics());
    g.setAlpha(alpha);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x + 2, y + 26, 40, 12);
    g.fillStyle(COULEURS.surveillante, 1);
    g.lineStyle(3, COULEURS.craie, 1);
    g.fillTriangle(x - 18, y + 24, x + 18, y + 24, x, y - 8);
    g.strokeTriangle(x - 18, y + 24, x + 18, y + 24, x, y - 8);
    g.fillStyle(0xf2c9a0, 1);
    g.fillCircle(x, y - 14, 12);
    g.strokeCircle(x, y - 14, 12);
    g.fillStyle(0x5a3a22, 1);
    g.fillCircle(x, y - 24, 7);
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
      g.lineStyle(3, COULEURS.fondSombre, 1);
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
  ): void {
    const g = this.ajouter(this.add.graphics());
    if (prise) {
      g.fillStyle(prise === 'rouge' ? COULEURS.rouge : COULEURS.bleu, 1);
      g.lineStyle(3, COULEURS.craie, 1);
      g.fillCircle(x, y, 30);
      g.strokeCircle(x, y, 30);
    }
    g.setAlpha(prise ? 0.75 : 1);
    this.dessinerFriandise(g, index, x, y);
    this.texte(x + 22, y - 22, `+${points}`, 18, '#ffe066', {
      fontStyle: 'bold',
      stroke: COULEURS.texteSombre,
      strokeThickness: 5,
    }).setOrigin(0.5);
  }

  private dessinerSurveillante(allee: number): void {
    const { x, y } = this.milieuAllee(allee);
    this.silhouette(x, y, 1);
    this.texte(x, y + 30, TEXTES.surveillante, 14, COULEURS.texteClair, {
      stroke: COULEURS.texteSombre,
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
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
    return true;
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
    if (this.ctrl.phase === 'passe' && this.animations) {
      // Coup terminé : un court instant pour voir l'élève atterrir, puis on passe le téléphone.
      this.entreDeuxTours = true;
      this.time.delayedCall(DUREE_FIN_DE_TOUR, () => {
        this.entreDeuxTours = false;
        this.rafraichir();
      });
    }
    this.rafraichir();
    this.animer(nouveaux, grandsFreres);
    return true;
  }

  // -------------------------------------------------------------------------
  // Bandeau du haut, journal, actions
  // -------------------------------------------------------------------------

  private dessinerHud(): void {
    const e = this.etat;
    const g = this.ajouter(this.add.graphics());
    g.fillStyle(COULEURS.fondSombre, 0.85);
    g.fillRect(0, 0, LARGEUR, 92);

    const rouge = creerBadge(this, 'rouge', 'grand', 44);
    rouge.setPosition(42, 46);
    (rouge.list[1] as Texte).setText('');
    this.ajouter(rouge);
    this.texte(74, 46, `${e.joueurs.rouge.bonsPoints}`, 40, COULEURS.texteClair, {
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const bleu = creerBadge(this, 'bleu', 'grand', 44);
    bleu.setPosition(LARGEUR - 42, 46);
    (bleu.list[1] as Texte).setText('');
    this.ajouter(bleu);
    this.texte(LARGEUR - 74, 46, `${e.joueurs.bleu.bonsPoints}`, 40, COULEURS.texteClair, {
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.texte(LARGEUR / 2, 24, TEXTES.hud.seuil(this.cour.seuilBonsPoints), 20).setOrigin(0.5);
    if (this.ctrl.phase === 'jeu') {
      this.ajouter(
        creerBouton(
          this,
          LARGEUR - 152,
          24,
          TEXTES.hud.aide,
          () => {
            this.aideOuverte = true;
            this.rafraichir();
          },
          { largeur: 44, hauteur: 36, taille: 24, couleur: COULEURS.allume },
        ),
      );
    }
    if (this.ctrl.phase !== 'fin') {
      const b = this.bandeActive;
      this.texte(LARGEUR / 2, 62, TEXTES.hud.tourDe(b), 28, b === 'rouge' ? '#ff8a80' : '#8ab4ff', {
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  private dessinerJournal(): void {
    const g = this.ajouter(this.add.graphics());
    g.fillStyle(COULEURS.fondSombre, 0.55);
    g.fillRoundedRect(16, Y_JOURNAL - 14, LARGEUR - 32, 80, 12);
    if (this.fiche) {
      this.dessinerFiche(this.fiche.titre, this.fiche.texte);
      return;
    }
    const attente = this.ctrl.phase === 'jeu' ? this.etat.attente : null;
    if (attente) {
      this.texte(LARGEUR / 2, Y_JOURNAL + 26, this.consigne(), 19, '#ffe066', {
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: LARGEUR - 56 },
      }).setOrigin(0.5);
      return;
    }
    // On garde les lignes les plus récentes qui tiennent dans le cadre (avec retour à la ligne).
    const lignes = dernieresLignes(this.etat.journal, this.cour, 3);
    const t = this.texte(30, Y_JOURNAL + 58, '', 18, '#ffffff', {
      wordWrap: { width: LARGEUR - 60 },
      lineSpacing: 2,
    }).setOrigin(0, 1);
    while (lignes.length > 0) {
      t.setText(lignes.join('\n'));
      if (t.height <= 70 || lignes.length === 1) break;
      lignes.shift();
    }
  }

  /** Fiche dans le cadre du journal : un titre jaune et une explication. */
  private dessinerFiche(titre: string, texte: string): Phaser.GameObjects.Container {
    const fond = this.add.graphics();
    fond.fillStyle(0x14201a, 0.97);
    fond.lineStyle(3, COULEURS.allume, 1);
    fond.fillRoundedRect(16, Y_JOURNAL - 14, LARGEUR - 32, 80, 12);
    fond.strokeRoundedRect(16, Y_JOURNAL - 14, LARGEUR - 32, 80, 12);
    const t1 = this.add.text(30, Y_JOURNAL - 8, titre, {
      fontFamily: POLICE,
      fontSize: '19px',
      color: '#ffe066',
      fontStyle: 'bold',
    });
    const t2 = this.add.text(30, Y_JOURNAL + 16, texte, {
      fontFamily: POLICE,
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: LARGEUR - 60 },
    });
    const c = this.add.container(0, 0, [fond, t1, t2]);
    this.ajouter(c);
    return c;
  }

  private consigne(): string {
    const a = this.etat.attente;
    if (!a) return '';
    const c = TEXTES.choix;
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
          peutPoser ? TEXTES.hud.consigneTour : TEXTES.hud.consigneSansPose,
          18,
          COULEURS.texteClair,
          { wordWrap: { width: 330 }, fontStyle: 'bold' },
        ).setOrigin(0, 0.5);
        const b = boutons[0] as (typeof boutons)[number];
        this.ajouter(
          creerBouton(this, LARGEUR - 185, Y_ACTIONS, b.texte, b.action, {
            largeur: 320,
            hauteur: 58,
            taille: 24,
            couleur: COULEURS.allume,
          }),
        );
        return;
      }
      this.rangeeBoutons(Y_ACTIONS, boutons);
      return;
    }

    // Choix d'un pouvoir ou d'un équipement : options à boutons, puis « Passer ».
    const options: { texte: string; action: () => void; couleur?: number }[] = [];
    const vusRoles = new Set<string>();
    for (const o of attente.options) {
      if (o.type === 'piocher') {
        options.push({ texte: TEXTES.boutons.piocher, action: () => this.choisir(o) });
      } else if (o.type === 'infirmerie') {
        options.push({ texte: TEXTES.boutons.infirmerie, action: () => this.choisir(o) });
      } else if (o.type === 'surveillante') {
        options.push({ texte: TEXTES.choix.pas(o.pas), action: () => this.choisir(o) });
      } else if (o.type === 'repecher') {
        const el = this.etat.joueurs[this.etat.courant].cpe.find((x) => x.id === o.eleveId);
        if (el && !vusRoles.has(el.role)) {
          vusRoles.add(el.role);
          options.push({ texte: TEXTES.rolesCourts[el.role], action: () => this.choisir(o) });
        }
      }
    }
    const lignes: (typeof options)[] = [];
    for (let i = 0; i < options.length; i += 4) lignes.push(options.slice(i, i + 4));
    const fin = [
      {
        texte: TEXTES.boutons.passer,
        action: () => {
          this.departToboggan = null;
          this.agir(() => ctrl.passer());
        },
      },
    ];
    if (this.attenteHorsRang()) {
      lignes.push(fin);
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
    this.texte(
      30,
      RANG.y - RANG.hauteurCarte / 2 - 28,
      `${TEXTES.hud.couloir(j.couloir.length)}   ·   ${TEXTES.hud.cpe(j.cpe.length)}`,
      18,
    );
    if (j.rang.length > 0) {
      this.texte(
        LARGEUR - 30,
        RANG.y - RANG.hauteurCarte / 2 - 28,
        TEXTES.hud.toucherCarte,
        16,
        '#c8d6c0',
      ).setOrigin(1, 0);
    }
    if (j.rang.length === 0) {
      this.texte(LARGEUR / 2, RANG.y, TEXTES.hud.rangVide, 22).setOrigin(0.5);
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
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-l / 2 + 3, -h / 2 + 5, l, h, 12);
    g.fillStyle(COULEURS.papier, 1);
    g.lineStyle(3, COULEURS.fondSombre, 1);
    g.fillRoundedRect(-l / 2, -h / 2, l, h, 12);
    g.strokeRoundedRect(-l / 2, -h / 2, l, h, 12);
    const badge = skinActif().eleve(this, el.bande, el.role, 56);
    badge.setPosition(0, -26);
    const nom = this.add
      .text(0, 50, TEXTES.rolesCourts[el.role], {
        fontFamily: POLICE,
        fontSize: TEXTES.rolesCourts[el.role].length > 9 ? '13px' : '15px',
        color: COULEURS.texteSombre,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: l - 4 },
      })
      .setOrigin(0.5);
    const enfants: Phaser.GameObjects.GameObject[] = [g, badge, nom];
    if (malade) {
      const voile = this.add.graphics();
      voile.fillStyle(0x6a8a5a, 0.75);
      voile.fillRoundedRect(-l / 2, -h / 2, l, h, 12);
      const t = this.add
        .text(0, 0, TEXTES.hud.infirmerie, {
          fontFamily: POLICE,
          fontSize: '15px',
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: '#c0392b',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setRotation(-0.5);
      enfants.push(voile, t);
    } else if (!jouable) {
      enfants.forEach((o) => (o as unknown as { setAlpha(a: number): void }).setAlpha(0.55));
    }
    const carte = this.add.container(x, y, enfants);
    carte.setSize(l, h);
    this.ajouter(carte);
    return carte;
  }

  private texteFicheEleve(el: Eleve, malade: boolean, jouable: boolean): string {
    const F = TEXTES.fiche;
    const suite = malade ? F.infirmerie : jouable ? F.glisser : F.nonJouable;
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
    const animer = (_t: number, delta: number): void => {
      pantin?.suivre(doigt.x, doigt.y, Math.min(delta, 50) / 1000);
      const vise = noeudSous(this.cour, cibles, { x: doigt.x, y: doigt.y - VISEE }, RAYON_DEPOT);
      if (survol) {
        survol.setVisible(vise !== null);
        if (vise) survol.setPosition(this.pos(vise).x, this.pos(vise).y);
      }
    };
    const lacher = (): void => {
      this.events.off('update', animer);
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
      24,
      COULEURS.texteClair,
      {
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    const bloc = this.ajouter(this.add.rectangle(0, 0, LARGEUR, HAUTEUR, 0x000000, 0.001));
    bloc.setOrigin(0, 0).setInteractive();
  }

  private voile(alpha: number): void {
    const v = this.ajouter(this.add.rectangle(0, 0, LARGEUR, HAUTEUR, COULEURS.fondSombre, alpha));
    v.setOrigin(0, 0);
    v.setInteractive();
  }

  private dessinerPasse(): void {
    const b = this.etat.courant;
    this.voile(0.97);
    const cx = LARGEUR / 2;
    this.texte(cx, 330, TEXTES.passe.titre, 56, COULEURS.texteClair, {
      fontFamily: POLICE_TITRE,
    }).setOrigin(0.5);
    this.texte(cx, 410, TEXTES.passe.a(b), 40, b === 'rouge' ? '#ff8a80' : '#8ab4ff', {
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const badge = creerBadge(this, b, 'grand', 150);
    (badge.list[1] as Texte).setText('');
    badge.setPosition(cx, 600);
    this.ajouter(badge);
    this.tweens.add({ targets: badge, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });
    this.texte(cx, 760, TEXTES.passe.cache, 24).setOrigin(0.5);
    this.ajouter(
      creerBouton(
        this,
        cx,
        900,
        TEXTES.boutons.pret(b),
        () => {
          this.ctrl.reprendre();
          this.rafraichir();
        },
        { largeur: 440, hauteur: 96, taille: 32, couleur: COULEURS.allume },
      ),
    );
  }

  private dessinerAide(): void {
    const A = TEXTES.aide;
    this.voile(0.97);
    const x0 = 34;
    const largeur = LARGEUR - 68;
    let y = 40;
    this.texte(LARGEUR / 2, y, A.titre, 40, COULEURS.texteClair, {
      fontFamily: POLICE_TITRE,
    }).setOrigin(0.5, 0);
    y += 62;
    for (const para of [A.but, A.tour]) {
      const t = this.texte(x0, y, para, 18, COULEURS.texteClair, { wordWrap: { width: largeur } });
      y += t.height + 10;
    }
    this.texte(x0, y, A.eleves, 21, '#ffe066', { fontStyle: 'bold' });
    y += 32;
    for (const r of ROLES) {
      const badge = skinActif().eleve(this, 'rouge', r.id, 40);
      badge.setPosition(x0 + 20, y + 22);
      this.ajouter(badge);
      const nom = this.texte(x0 + 52, y, TEXTES.roles[r.id], 17, '#ffe066', { fontStyle: 'bold' });
      const t = this.texte(
        x0 + 52,
        y + nom.height,
        TEXTES.pouvoirs[r.id],
        15,
        COULEURS.texteClair,
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
      this.texte(x0, y, A.special, 21, '#ffe066', { fontStyle: 'bold' });
      y += 30;
      for (const n of speciaux) {
        if (!n?.equipement) continue;
        const t = this.texte(
          x0,
          y,
          `★ ${n.nom} : ${TEXTES.effetsEquipements[n.equipement]}`,
          16,
          COULEURS.texteClair,
          { wordWrap: { width: largeur } },
        );
        y += t.height + 8;
      }
    }
    y += 6;
    for (const l of A.legende) {
      const t = this.texte(x0, y, `• ${l}`, 15, '#c8d6c0', { wordWrap: { width: largeur } });
      y += t.height + 4;
    }
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
        { largeur: 300, hauteur: 64, couleur: COULEURS.allume },
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
    const y0 = HAUTEUR - hauteur - 24;
    const corps = this.texte(x0 + 30, y0 + 78, C[id], 27, COULEURS.texteSombre, {
      wordWrap: { width: largeur - 60 },
      lineSpacing: 6,
    });
    const fond = this.ajouter(this.add.graphics());
    fond.fillStyle(0x000000, 0.25);
    fond.fillRoundedRect(x0 + 6, y0 + 8, largeur, hauteur, 26);
    fond.fillStyle(COULEURS.papier, 1);
    fond.lineStyle(6, COULEURS.allume, 1);
    fond.fillRoundedRect(x0, y0, largeur, hauteur, 26);
    fond.strokeRoundedRect(x0, y0, largeur, hauteur, 26);
    this.dyn.bringToTop(corps);
    this.texte(
      x0 + 30,
      y0 + 24,
      `${C.titre} · ${TEXTES.bandesTitre[bande]}`,
      26,
      COULEURS.texteSombre,
      {
        fontStyle: 'bold',
      },
    );
    const yb = y0 + hauteur - 62;
    const vu = (): void => {
      this.conseilsVus[bande].add(id);
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
        { largeur: largeur * 0.4, hauteur: 70, taille: 28, couleur: COULEURS.allume },
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Sensations : atterrissage, plaquage, secousses, goûters, cinématiques, sons
  // -------------------------------------------------------------------------

  private animer(nouveaux: Evenement[], grandsFreres: boolean): void {
    for (const ev of nouveaux) {
      switch (ev.type) {
        case 'pose':
          if (this.cour.noeuds[ev.cible]?.type === 'ilot') {
            this.atterrissage(ev.cible, ev.plaque !== undefined);
          }
          break;
        case 'glissade':
          jouerSon('glissade');
          this.atterrissage(ev.arrivee, false);
          break;
        case 'region':
          this.ramasserGouter(ev.region, ev.bonsPoints);
          break;
        case 'appel':
        case 'pioche':
          jouerSon('pioche');
          break;
        case 'fin':
          this.victoire(ev.raison === 'cabane');
          break;
        default:
          break;
      }
    }
    if (!this.animations) return;
    const suite = cinematiquesPour(nouveaux, grandsFreres);
    if (suite.length === 0) return;
    this.cinematiques.push(...suite);
    if (!this.cinematiqueEnCours) this.cinematiqueSuivante();
  }

  private secousse(force: number, duree = 180): void {
    if (this.animations) this.cameras.main.shake(duree, force);
  }

  /** L'élève tombe sur l'îlot, rebondit, et s'écrase un peu ; s'il plaque, tout tremble. */
  private atterrissage(id: string, plaque: boolean): void {
    const badge = this.badges.get(id);
    if (!badge || !this.animations) {
      jouerSon(plaque ? 'plaque' : 'pose');
      return;
    }
    const y0 = badge.y;
    badge.setY(y0 - 70).setScale(1.2);
    this.tweens.add({
      targets: badge,
      y: y0,
      scale: 1,
      duration: plaque ? 260 : 480,
      ease: plaque ? 'Quad.easeIn' : 'Bounce.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: badge,
          scaleX: 1.22,
          scaleY: 0.8,
          duration: 80,
          yoyo: true,
        });
        if (plaque) this.plaquage(id);
      },
    });
    if (!plaque) this.time.delayedCall(120, () => jouerSon('pose'));
  }

  private plaquage(id: string): void {
    const p = this.pos(id);
    jouerSon('plaque');
    this.secousse(0.012, 220);
    // Nuage de poussière.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const nuage = this.ajouter(this.add.circle(p.x, p.y + 20, 9, 0xd8c9a3, 0.9));
      this.tweens.add({
        targets: nuage,
        x: p.x + Math.cos(a) * 62,
        y: p.y + 20 + Math.sin(a) * 30,
        scale: 1.8,
        alpha: 0,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => nuage.destroy(),
      });
    }
    const t = this.texte(p.x, p.y - 60, TEXTES.animations.plaque, 30, '#ffe066', {
      fontStyle: 'bold',
      stroke: COULEURS.texteSombre,
      strokeThickness: 7,
    })
      .setOrigin(0.5)
      .setScale(0.3)
      .setAngle(-8);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: p.y - 90, delay: 650, duration: 300 });
  }

  private ramasserGouter(regionId: string, n: number): void {
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
    const t = this.texte(c.x, c.y - 30, TEXTES.animations.gouter(n), 30, '#ffe066', {
      fontStyle: 'bold',
      stroke: COULEURS.texteSombre,
      strokeThickness: 7,
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: c.y - 110, alpha: 0, duration: 1300, ease: 'Quad.easeOut' });
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
        y: HAUTEUR + 30,
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
    const fond = this.add.rectangle(0, 0, LARGEUR, HAUTEUR, COULEURS.fondSombre, 0.55);
    fond.setOrigin(0, 0).setInteractive();
    const bandeau = this.add.graphics();
    const COULEURS_PANNEAU: Record<CinematiqueId, number> = {
      cpe: 0x7d2fa0,
      infirmerie: 0xc0392b,
      sonnerie: 0xe0b84a,
      grandsFreres: 0x3b6fd9,
      gouter: 0xd9822b,
      toboggan: 0x2a9d8f,
      delegue: 0x5b6abf,
    };
    const couleur = COULEURS_PANNEAU[id];
    bandeau.fillStyle(couleur, 1);
    bandeau.fillRect(-40, 470, LARGEUR + 80, 340);
    bandeau.lineStyle(8, COULEURS.craie, 1);
    bandeau.lineBetween(-40, 470, LARGEUR + 40, 470);
    bandeau.lineBetween(-40, 810, LARGEUR + 40, 810);
    const picto = this.add.graphics();
    this.dessinerPictogramme(picto, id, 150, 640, cin);
    const style = { fontFamily: POLICE, color: COULEURS.texteClair, stroke: COULEURS.texteSombre };
    const titre = this.add
      .text(270, 610, C.titre, {
        ...style,
        fontSize: '42px',
        fontStyle: 'bold',
        strokeThickness: 8,
        wordWrap: { width: LARGEUR - 290 },
      })
      .setOrigin(0, 0.5);
    const sous = this.add
      .text(270, 700, C.sous, {
        ...style,
        fontSize: '24px',
        strokeThickness: 5,
        wordWrap: { width: LARGEUR - 300 },
      })
      .setOrigin(0, 0.5);
    const passer = this.add
      .text(LARGEUR / 2, 850, TEXTES.cinematiques.passer, { ...style, fontSize: '18px' })
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

  /** Emplacement de l'animation de chaque cinématique : pictogramme provisoire. */
  private dessinerPictogramme(
    g: Phaser.GameObjects.Graphics,
    id: CinematiqueId,
    x: number,
    y: number,
    cin?: Cinematique,
  ): void {
    g.setPosition(x, y);
    g.lineStyle(5, COULEURS.fondSombre, 1);
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
    this.voile(0.93);
    const cx = LARGEUR / 2;
    this.texte(cx, 260, TEXTES.fin.titre, 72, '#ffe066', {
      fontFamily: 'Impact, sans-serif',
      stroke: COULEURS.texteSombre,
      strokeThickness: 10,
    }).setOrigin(0.5);
    const badge = creerBadge(this, fin.gagnant, 'grand', 160);
    (badge.list[1] as Texte).setText('');
    badge.setPosition(cx, 470);
    this.ajouter(badge);
    this.tweens.add({ targets: badge, angle: 8, duration: 300, yoyo: true, repeat: -1 });
    this.texte(cx, 610, TEXTES.fin.gagnant(fin.gagnant), 48, COULEURS.texteClair, {
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.texte(cx, 670, TEXTES.fin.raison(fin.raison), 30, COULEURS.texteClair).setOrigin(0.5);
    const e = this.etat;
    this.texte(
      cx,
      740,
      TEXTES.fin.score(e.joueurs.rouge.bonsPoints, e.joueurs.bleu.bonsPoints),
      24,
    ).setOrigin(0.5);
    this.texte(cx, 778, TEXTES.fin.tours(e.tour), 22, '#c8d6c0').setOrigin(0.5);
    this.ajouter(
      creerBouton(
        this,
        cx,
        900,
        TEXTES.boutons.rejouer,
        () => this.scene.restart({ ...this.donnees, graine: Date.now() }),
        { largeur: 360, hauteur: 84, taille: 32, couleur: COULEURS.allume },
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
