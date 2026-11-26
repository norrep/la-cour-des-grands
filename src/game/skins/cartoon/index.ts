/**
 * Skin « Cartoon » : les élèves dessinés d'après les références validées par Clément (trait noir
 * fin, membres en nouilles, débardeur numéroté). Ce sont des images détourées
 * (`public/skins/dessin/`), une par rôle et par bande.
 *
 * Les élèves sont des « gelées » (voir `ui/gelee.ts`) : l'image découpée en tranches respire, se
 * dandine et fait des gestes selon son caractère. Le pantin est tenu par la main : son bras gauche
 * est remplacé par un bras-nouille dessiné qui monte jusqu'au doigt, et le corps ballotte en dessous.
 */
import Phaser from 'phaser';
import { ROLES, type Bande, type RoleId } from '../../../engine/index';
import { COULEURS } from '../../config';
import { creerBadge } from '../../ui/badge';
import { Gelee, rendreVivant } from '../../ui/gelee';
import type { P, RenduPantin, Skin, TextureSkin } from '../types';
import { MESURES, type MesureDessin } from './mesures';

/** Hauteur de l'élève le plus grand, en multiples de `taille`. */
const HAUTEUR_REF = 2.5;
/** Hauteur de l'image la plus grande, en pixels : les autres élèves sont plus petits d'autant. */
const PIXELS_REF = 880;
/** Hauteur du numéro sur le débardeur, en fraction de l'image (l'élève est centré dessus). */
const NUMERO = 0.4;
/** L'élève est remonté d'une fraction de sa taille : ses pieds ne cachent pas le nom de l'îlot. */
const REMONTE = 0.4;
/** Pastille de valeur à côté de l'élève, en fraction de `taille`. */
const PASTILLE = 0.42;
/** Hauteur du pantin à l'écran, en pixels de jeu. */
const HAUTEUR_PANTIN = 170;
const BANDES: Bande[] = ['rouge', 'bleu'];

const nom = (bande: Bande, role: RoleId) => `${bande}-${role}`;
const cle = (bande: Bande, role: RoleId) => `cartoon-${nom(bande, role)}`;

function mesure(bande: Bande, role: RoleId): MesureDessin {
  const m = MESURES[nom(bande, role)];
  if (!m) throw new Error(`Élève sans mesures : ${nom(bande, role)}`);
  return m;
}

/**
 * Pour chaque élève : l'image entière, le corps sans bras gauche (pantin) et son buste
 * pour la pastille du plateau.
 */
const PIECES = ['', '-corps', '-pastille'] as const;

function textures(): TextureSkin[] {
  return ROLES.flatMap(({ id }) =>
    BANDES.flatMap((b) =>
      PIECES.map((piece) => ({
        cle: cle(b, id) + piece,
        url: `skins/dessin/${nom(b, id)}${piece}.png`,
      })),
    ),
  );
}

/** Angle d'un segment depuis la verticale (même convention que le squelette). */
const angleDe = (a: P, b: P): number => Math.atan2(b.x - a.x, b.y - a.y);

export const SKIN_CARTOON: Skin = {
  id: 'cartoon',
  textures,
  eleve(scene, bande, role, taille) {
    const m = mesure(bande, role);
    const echelle = (HAUTEUR_REF * taille) / PIXELS_REF;
    // Tous les élèves ont les pieds au même niveau : le Grand dépasse, le Petit est plus bas.
    const pieds = (1 - NUMERO) * PIXELS_REF * echelle - taille * REMONTE;
    const corps = new Gelee(scene, {
      cle: cle(bande, role),
      echelle,
      pivot: m.hauteur,
      centreX: m.largeur / 2,
    });
    const boite = scene.add.container(0, pieds, corps.objets);
    // Pastille de valeur au niveau de la taille : le numéro du débardeur est trop petit sur l'îlot.
    const pastille = creerBadge(scene, bande, role, taille * PASTILLE);
    pastille.setPosition(
      (m.largeur / 2) * echelle + taille * 0.08,
      pieds - m.hauteur * echelle * 0.4,
    );
    const eleve = scene.add.container(0, 0, [boite, pastille]);
    rendreVivant(scene, corps, eleve, { hauteur: m.hauteur * echelle, caractere: role });
    return eleve;
  },
  buste(scene, bande, role, largeur, hauteur) {
    const m = mesure(bande, role);
    const bas = Math.min(m.hauteur, m.basMaillot + 12);
    const echelle = Math.min(hauteur / bas, largeur / m.largeur);
    const corps = new Gelee(scene, {
      cle: cle(bande, role),
      echelle,
      a: bas,
      pivot: bas,
      centreX: m.largeur / 2,
      tranches: 16,
    });
    const boite = scene.add.container(0, hauteur / 2, corps.objets);
    const pastille = creerBadge(scene, bande, role, 24);
    pastille.setPosition(largeur / 2 - 10, hauteur / 2 - 14);
    const buste = scene.add.container(0, 0, [boite, pastille]);
    rendreVivant(scene, corps, buste, { hauteur: bas * echelle, caractere: role, calme: true });
    return buste;
  },
  pastille(scene, bande, role, diametre) {
    const r = diametre / 2;
    // Le buste est dessiné pour un cercle de 160 pixels de rayon, centré à 160 pixels du bas.
    const echelle = r / 160;
    const fond = scene.add.graphics();
    const couleur = bande === 'rouge' ? COULEURS.rouge : COULEURS.bleu;
    const clair = bande === 'rouge' ? 0xffd2c8 : 0xd5dcff;
    // Ombre, fond clair, liseré de la couleur de la bande : rond pour les rouges, carré arrondi pour
    // les bleus (lisible sans distinguer les couleurs).
    const dessiner = (g: Phaser.GameObjects.Graphics, dx: number, dy: number, rr: number): void => {
      if (bande === 'rouge') g.fillCircle(dx, dy, rr);
      else g.fillRoundedRect(dx - rr, dy - rr, rr * 2, rr * 2, rr * 0.3);
    };
    fond.fillStyle(COULEURS.encre, 0.9);
    dessiner(fond, 2, 5, r + 3);
    fond.fillStyle(COULEURS.encre, 1);
    dessiner(fond, 0, 0, r + 3);
    fond.fillStyle(couleur, 1);
    dessiner(fond, 0, 0, r);
    fond.fillStyle(clair, 1);
    dessiner(fond, 0, 0, r - 5);
    const corps = new Gelee(scene, {
      cle: `${cle(bande, role)}-pastille`,
      echelle,
      pivot: 512,
      centreX: 256,
      tranches: 16,
    });
    const boite = scene.add.container(0, r - 2, corps.objets);
    // Le bas du buste est rentré dans la pastille : un liseré repasse dessus.
    const bord = scene.add.graphics();
    bord.lineStyle(5, couleur, 1);
    bord.beginPath();
    bord.arc(0, 0, r - 2.5, 0.15, Math.PI - 0.15);
    bord.strokePath();
    bord.lineStyle(3, COULEURS.encre, 1);
    bord.beginPath();
    bord.arc(0, 0, r + 1.5, 0.1, Math.PI - 0.1);
    bord.strokePath();
    const valeur = creerBadge(scene, bande, role, diametre * 0.36);
    valeur.setPosition(r * 0.78, r * 0.72);
    const pastille = scene.add.container(0, 0, [fond, boite, bord, valeur]);
    rendreVivant(scene, corps, pastille, { hauteur: r * 2, caractere: role, calme: true });
    return pastille;
  },
  pantin(scene, eleve): RenduPantin {
    const m = mesure(eleve.bande, eleve.role);
    const echelle = HAUTEUR_PANTIN / PIXELS_REF;
    const base = cle(eleve.bande, eleve.role);
    // Le corps sans son bras gauche pend sous l'épaule ; le bras découpé se lève jusqu'au doigt.
    const corps = new Gelee(scene, {
      cle: `${base}-corps`,
      echelle,
      pivot: m.aisselle.y,
      centreX: m.aisselle.x,
      tranches: 28,
    });
    const boite = scene.add.container(0, 0, corps.objets);
    /** Longueur du bras au repos, en pixels de jeu ; il s'étire un peu quand on tire dessus. */
    const longueurBras = (m.basBras - m.aisselle.y) * echelle;
    // Il s'étire comme un spaghetti pour que la main passe au-dessus de la tête.
    const etire = Math.max(1.12, (m.aisselle.y * echelle + 14) / longueurBras);
    const hanches = (m.basMaillot - m.aisselle.y) * echelle;
    const peau = Phaser.Display.Color.HexStringToColor(m.peau).color;
    /** Épaisseur du bras, et du trait d'encre autour (le même que sur le dessin). */
    const largeur = Math.max(5, m.largeurBras * echelle);
    const trait = 2.6;
    // Le bras tenu est une nouille dessinée, devant le corps : elle part de l'épaule (et cache la
    // découpe du dessin) et finit par une main ronde au bout du doigt du joueur.
    const bras = scene.add.graphics();
    const prise = scene.add.graphics();
    return {
      objets: [boite, bras, prise],
      dessiner(s) {
        // L'épaule est sous la main, dans la direction du balancier « bras tenu ».
        const aBras = angleDe(s.main, s.epaule);
        const epaule = {
          x: s.main.x + Math.sin(aBras) * longueurBras * etire,
          y: s.main.y + Math.cos(aBras) * longueurBras * etire,
        };
        // Le corps pend dans le prolongement du bras (il ne reste plus droit pendant que le bras
        // balance), avec un peu de retard du tronc ; les jambes, plus lentes, traînent derrière.
        const aCorps = aBras * 0.7 + s.angle * 0.3;
        const [j1, j2] = s.jambes;
        const aJambes = (angleDe(j1[0], j1[1]) + angleDe(j2[0], j2[1])) / 2;
        const pliJambes = Math.sin(Phaser.Math.Clamp(aJambes - aCorps, -0.6, 0.6)) * 0.8;
        boite.setPosition(epaule.x, epaule.y).setRotation(-aCorps);
        corps.plier((d) => (d <= hanches ? 0 : pliJambes * (d - hanches)));
        // Haut de l'épaule, un peu au-dessus de l'aisselle, dans le repère du corps qui penche.
        const h = largeur * 0.7;
        const depart = {
          x: epaule.x - Math.sin(aCorps) * h,
          y: epaule.y - Math.cos(aCorps) * h,
        };
        const dx = s.main.x - depart.x;
        const dy = s.main.y - depart.y;
        const courbe = new Phaser.Curves.QuadraticBezier(
          new Phaser.Math.Vector2(depart.x, depart.y),
          // Le bras s'arrondit vers l'extérieur, pour ne pas passer devant la tête.
          new Phaser.Math.Vector2(depart.x + dx / 2 + dy * 0.18, depart.y + dy / 2 - dx * 0.18),
          new Phaser.Math.Vector2(s.main.x, s.main.y),
        );
        const points = courbe.getPoints(14);
        bras.clear();
        for (const [ep, couleur] of [
          [largeur + trait * 2, COULEURS.encre],
          [largeur, peau],
        ] as const) {
          bras.lineStyle(ep, couleur, 1);
          bras.strokePoints(points, false, false);
          bras.fillStyle(couleur, 1);
          bras.fillCircle(depart.x, depart.y, ep / 2);
          // La main : une moufle ronde.
          bras.fillCircle(s.main.x, s.main.y, ep / 2 + largeur * 0.35);
        }
        // Le doigt du joueur qui tient la main.
        prise.clear();
        prise.lineStyle(3, 0xffe066, 0.9);
        prise.strokeCircle(s.main.x, s.main.y, 14);
      },
    };
  },
};
