import Phaser from 'phaser';
import { COURS } from '../../data/boards/index';
import { TEXTES } from '../../data/textes';
import {
  actionsLegales,
  adversaire,
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
  type Option,
} from '../../engine/index';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { alleesDuChemin } from '../chemins';
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
import { dernieresLignes } from '../journal';
import { creerBadge } from '../ui/badge';
import { creerBouton } from '../ui/bouton';
import { ecrireConseils } from '../preferences';
import type { DonneesPartie } from './AccueilScene';

const RAYON_ILOT = 48;
const TAILLE_BADGE = 62;
const RAYON_DEPOT = 75;
const Y_JOURNAL = 935;
const Y_ACTIONS = 1040;

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
    this.tweens.killAll();
    this.dyn.removeAll(true);
    this.badges.clear();
    this.surbrillances = [];

    this.dessinerCour();
    this.dessinerHud();
    this.dessinerJournal();
    if (this.ctrl.phase === 'jeu' || this.ctrl.phase === 'aConfirmer') {
      this.dessinerActions();
    }
    if (this.ctrl.phase === 'jeu' && !this.attenteHorsRang()) this.dessinerRang();
    if (this.ctrl.phase === 'aConfirmer') this.dessinerRangCache();
    if (this.ctrl.phase === 'passe') this.dessinerPasse();
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

  /** La bande dont c'est le coup (celle qui vient de jouer pendant la confirmation). */
  private get bandeActive(): Bande {
    return this.ctrl.phase === 'aConfirmer' ? adversaire(this.etat.courant) : this.etat.courant;
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
      if (i === suivante) this.tracesDePas(pa, pb);
    });

    // Régions : jeton de bons points au centre, coloré quand la région est prise.
    for (const r of this.cour.regions) {
      const c = centreRegion(this.cour, r.ilots);
      const prise = e.regionsPrises[r.id];
      const jeton = this.ajouter(this.add.graphics());
      const couleur =
        prise === 'rouge' ? COULEURS.rouge : prise === 'bleu' ? COULEURS.bleu : COULEURS.papier;
      jeton.fillStyle(couleur, prise ? 1 : 0.9);
      jeton.lineStyle(3, COULEURS.fondSombre, 0.8);
      const decalage = r.id === 'haut' ? -18 : r.id === 'bas' ? 18 : 0;
      jeton.fillCircle(c.x, c.y + decalage, 20);
      jeton.strokeCircle(c.x, c.y + decalage, 20);
      this.texte(c.x, c.y + decalage, `+${r.bonsPoints}`, 18, prise ? '#ffffff' : '#1d2b22', {
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

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
        const badge = creerBadge(this, dessus.bande, dessus.role, TAILLE_BADGE);
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

    this.dessinerSurveillante(bloquee);
    if (!this.zonesTactiles()) this.zonesInformation();
    this.bulleEffet();
  }

  /** En dehors des choix, toucher un îlot ou une cabane ouvre sa fiche. */
  private zonesInformation(): void {
    if (this.ctrl.phase !== 'jeu' && this.ctrl.phase !== 'aConfirmer') return;
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
    // Jetons de bons points : toucher montre les îlots de la zone.
    for (const r of this.cour.regions) {
      const c = centreRegion(this.cour, r.ilots);
      const decalage = r.id === 'haut' ? -18 : r.id === 'bas' ? 18 : 0;
      const zone = this.ajouter(this.add.circle(c.x, c.y + decalage, 30, 0xffffff, 0.001));
      zone.setInteractive();
      zone.on('pointerup', () => {
        const prise = this.etat.regionsPrises[r.id];
        const noms = r.ilots.map((id) => this.cour.noeuds[id]?.nom ?? id);
        this.montrerFiche(
          TEXTES.regionTitre(r.bonsPoints),
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

  private tracesDePas(a: Point, b: Point): void {
    const g = this.ajouter(this.add.graphics());
    g.fillStyle(COULEURS.surveillante, 0.85);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (let k = 0; k < 4; k++) {
      const t = 0.28 + k * 0.15;
      const cote = k % 2 === 0 ? 7 : -7;
      const x = a.x + (b.x - a.x) * t + nx * cote;
      const y = a.y + (b.y - a.y) * t + ny * cote;
      const pas = this.add.ellipse(x, y, 14, 8, COULEURS.surveillante, 0.85);
      pas.setRotation(angle);
      this.ajouter(pas);
    }
    g.destroy();
  }

  private dessinerSurveillante(allee: number): void {
    const [a, b] = this.cour.allees[allee] as [string, string];
    const pa = this.pos(a);
    const pb = this.pos(b);
    const x = (pa.x + pb.x) / 2;
    const y = (pa.y + pb.y) / 2;
    const g = this.ajouter(this.add.graphics());
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
    this.ctrl.choisir(option);
    this.rafraichir();
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
    if (this.ctrl.phase === 'jeu' || this.ctrl.phase === 'aConfirmer') {
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
    const annuler = {
      texte: TEXTES.boutons.annuler,
      action: () => {
        this.departToboggan = null;
        ctrl.annuler();
        this.rafraichir();
      },
    };

    if (ctrl.phase === 'aConfirmer') {
      this.rangeeBoutons(Y_ACTIONS, [
        annuler,
        {
          texte: TEXTES.boutons.valider,
          couleur: COULEURS.allume,
          action: () => {
            ctrl.valider();
            this.rafraichir();
          },
        },
      ]);
      return;
    }

    const attente = this.etat.attente;
    if (!attente) {
      const boutons: { texte: string; action: () => void; couleur?: number }[] = [];
      const n = ctrl.nombreAppel;
      if (n > 0) {
        boutons.push({
          texte: TEXTES.boutons.appeler(n),
          couleur: COULEURS.allume,
          action: () => {
            ctrl.appeler();
            this.rafraichir();
          },
        });
      }
      if (ctrl.peutAnnuler) boutons.push(annuler);
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

    // Choix d'un pouvoir ou d'un équipement : options à boutons, puis « Passer » et « Annuler ».
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
          ctrl.passer();
          this.rafraichir();
        },
      },
      annuler,
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
    const badge = creerBadge(this, el.bande, el.role, 56);
    badge.setPosition(0, -26);
    const nom = this.add
      .text(0, 36, TEXTES.rolesCourts[el.role], {
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

    carte.on('dragstart', () => {
      ficheGlisse = this.dessinerFiche(
        TEXTES.fiche.eleve(el.role, valeur(el.role)),
        this.texteFicheEleve(el, false, true),
      );
      this.dyn.bringToTop(carte);
      carte.setScale(1.15);
      this.montrerCibles(el, cibles);
    });
    carte.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      carte.setPosition(x, y - 30);
    });
    carte.on('dragend', (p: Phaser.Input.Pointer) => {
      this.cacherCibles();
      ficheGlisse?.destroy();
      ficheGlisse = null;
      const cible = noeudSous(this.cour, cibles, { x: p.worldX, y: p.worldY - 30 }, RAYON_DEPOT);
      let ok = false;
      if (cible) {
        ok = chouchou
          ? this.ctrl.choisir({ type: 'poser', eleveId: el.id, cible })
          : this.ctrl.envoyer(el.id, cible);
      }
      if (ok) {
        this.rafraichir();
      } else {
        this.tweens.add({
          targets: carte,
          x: depart.x,
          y: depart.y,
          scale: 1,
          duration: 220,
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

  /** Pendant la confirmation, on cache le rang : le téléphone va changer de mains. */
  private dessinerRangCache(): void {
    this.texte(LARGEUR / 2, RANG.y, TEXTES.confirmation, 22, COULEURS.texteClair, {
      align: 'center',
    }).setOrigin(0.5);
  }

  // -------------------------------------------------------------------------
  // Écrans « Passe le téléphone » et fin de partie
  // -------------------------------------------------------------------------

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
      const badge = creerBadge(this, 'rouge', r.id, 40);
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
    const tour = this.ctrl.phase === 'aConfirmer' ? this.etat.tour - 1 : this.etat.tour;
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
      if (id !== 'pouvoir' && id !== 'valider') this.tourDernierConseil[bande] = tour;
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
