/**
 * Skin « Cartoon » : les élèves « dodus » validés par Clément (trait épais et uniforme, T-pose),
 * découpés en marionnettes articulées (voir `ui/marionnette.ts` et le guide de création des
 * personnages). Une texture par élève (`public/skins/dodu/<bande>-<rôle>.png`) contient ses six
 * pièces ; leurs attaches sont dans `rig.ts`.
 *
 * Sur la cour et dans le rang, l'élève est en buste ; on ne le voit en entier que quand on le
 * tient par la main pour le transporter, et sur les grands écrans (accueil, passage du téléphone).
 */
import { equipeDe } from '../../../data/equipes';
import Phaser from 'phaser';
import { ROLES, type Bande, type RoleId } from '../../../engine/index';
import { COULEURS } from '../../config';
import { creerBadge } from '../../ui/badge';
import { animerMarionnette, Marionnette, type Rig } from '../../ui/marionnette';
import { animerVer, Ver } from '../../ui/ver';
import type { Acteur, P, RenduPantin, Skin, TextureSkin } from '../types';
import { RIGS } from './rig';
import { RIGS_EQUIPES } from './rigEquipes';
import { TENUES, type TenueId } from '../../../data/equipes';

/** Hauteur de l'élève le plus grand, en multiples de `taille`. */
const HAUTEUR_REF = 2.5;
/** Hauteur du Grand dans sa texture, en pixels : les autres élèves sont plus petits d'autant. */
const PIXELS_REF = 880;
/** Hauteur du numéro sur le débardeur, en fraction de la hauteur du Grand (l'élève est centré dessus). */
const NUMERO = 0.4;
/** L'élève est remonté d'une fraction de sa taille : ses pieds ne cachent pas le nom de l'îlot. */
const REMONTE = 0.4;
/** Pastille de valeur à côté de l'élève, en fraction de `taille`. */
const PASTILLE = 0.42;
/** Hauteur du Grand tenu par la main, en pixels de jeu. */
const HAUTEUR_PANTIN = 170;
/** Rayon du buste dans la pastille, en pixels de texture (le même pour tous : le Petit y a sa grosse tête). */
const RAYON_BUSTE = 150;
/** Tenu par la main gauche, le corps penche vers la droite : la grosse tête ne cache pas le bras. */
const PENCHE = 0.45;
/** Nom de l'image d'un élève : préfixe de l'équipe qui joue ce camp (DB.1), puis le rôle. */
const nom = (bande: Bande, role: RoleId) => `${equipeDe(bande).prefixe}-${role}`;
const cle = (bande: Bande, role: RoleId) => `dodu-${nom(bande, role)}`;
/** Les vers de terre n'ont pas de membres : un seul dessin, déformé d'un bloc (DB.8). */
const estVer = (bande: Bande) => equipeDe(bande).sansBras === true;
const cleCorps = (bande: Bande, role: RoleId) => `${cle(bande, role)}-corps`;

function rig(bande: Bande, role: RoleId): Rig {
  // Une tenue miroir reprend les attaches de la tenue dont elle est recolorée (DE.1).
  const t = equipeDe(bande);
  const n = `${t.rig ?? t.prefixe}-${role}`;
  const r = RIGS[n] ?? RIGS_EQUIPES[n];
  if (!r) throw new Error(`Élève sans marionnette : ${n}`);
  return r;
}

/** Les images des élèves d'une équipe. */
export function texturesEquipe(tenue: TenueId): TextureSkin[] {
  const prefixe = TENUES[tenue].prefixe;
  // Un ver n'a que son corps entier ; les autres, leur planche de pièces.
  const suffixe = TENUES[tenue].sansBras ? '-corps' : '';
  return ROLES.map(({ id }) => ({
    cle: `dodu-${prefixe}-${id}${suffixe}`,
    url: `skins/dodu/${prefixe}-${id}${suffixe}.png`,
  }));
}

/** Au chargement, les Écoliers (rouges, et bleus pour le miroir) ; les autres équipes sont chargées une fois choisies. */
function textures(): TextureSkin[] {
  return [...texturesEquipe('rouges'), ...texturesEquipe('bleus')];
}

/** Haut de la tête, en pixels de texture depuis les pieds (négatif). */
const hautTete = (r: Rig) => r.pieces.tete.pos[1] - r.pieces.tete.pivot[1];
/** Bas du débardeur (un peu au-dessus des hanches), en pixels de texture depuis les pieds. */
const basBuste = (r: Rig) => r.pieces.tronc.pos[1] - r.hauteur * 0.03;

/**
 * Masque qui suit `porteur` à l'écran : la forme est dessinée une fois dans le repère du porteur,
 * puis replacée à chaque image (un masque Phaser vit dans le repère du monde).
 * Le recalage se fait juste avant le rendu, une fois toutes les positions de l'image connues : un
 * élève créé pendant l'image (à chaque redessin de l'écran) n'a sa place qu'après sa création, et
 * un masque recalé trop tôt restait une image à l'origine, ce qui faisait clignoter le corps.
 */
function masqueQuiSuit(
  scene: Phaser.Scene,
  porteur: Phaser.GameObjects.Container,
  forme: (g: Phaser.GameObjects.Graphics) => void,
): Phaser.Display.Masks.GeometryMask {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff, 1);
  forme(g);
  const masque = g.createGeometryMask();
  const suivre = (): void => {
    const m = porteur.getWorldTransformMatrix();
    g.setPosition(m.tx, m.ty).setRotation(m.rotation).setScale(m.scaleX, m.scaleY);
  };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, suivre);
  porteur.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, suivre);
    masque.destroy();
    g.destroy();
  });
  suivre();
  return masque;
}

/**
 * Vidéos de pouvoir en 2D, dans le style du plateau (DV.8) : `public/videos/cartoon/<tenue>-<rôle>.mp4`.
 * Une vidéo par espèce (Écoliers, Aliens, Vers) et par rôle, tournée avec une chasuble bleu roi
 * puis recolorée à la couleur de chaque tenue, la tenue miroir comprise.
 */
const ROLES_VIDEO: readonly RoleId[] = [
  'chouchou',
  'rapporteuse',
  'fouine',
  'contagieux',
  'delegue',
  'petit',
  'populaire',
];
const TENUES_VIDEO: readonly TenueId[] = ['rouges', 'bleus', 'vers', 'vers2', 'aliens', 'aliens2'];
const VIDEOS: Partial<Record<TenueId, Partial<Record<RoleId, string>>>> = Object.fromEntries(
  TENUES_VIDEO.map((t) => [
    t,
    Object.fromEntries(ROLES_VIDEO.map((r) => [r, `videos/cartoon/${t}-${r}.mp4`])),
  ]),
);
/** Goûters, dans l'ordre des régions de la cour (comme GOUTERS du chargement), avec la couleur
 * mesurée du fond crème en haut et en bas de chaque vidéo. */
const VIDEOS_GOUTERS = (
  [
    ['chocolat', 0xdfccb6, 0xe3d6c0],
    ['biscuits', 0xeadecd, 0xe9dcc9],
    ['bonbon', 0xdaccb5, 0xdfd3c0],
    ['sucette', 0xe6d7c0, 0xeadcc9],
  ] as const
).map(([nom, haut, bas]) => ({ url: `videos/cartoon/gouter-${nom}.mp4`, haut, bas }));

export const SKIN_CARTOON: Skin = {
  id: 'cartoon',
  textures,
  texturesEquipe,
  videoPouvoir: (bande, role) => VIDEOS[equipeDe(bande).id]?.[role],
  videoGouter: (index) => (index >= 0 ? VIDEOS_GOUTERS[index % VIDEOS_GOUTERS.length] : undefined),
  eleve(scene, bande, role, taille) {
    const r = rig(bande, role);
    const echelle = (HAUTEUR_REF * taille) / PIXELS_REF;
    // Tous les élèves ont les pieds au même niveau : le Grand dépasse, le Petit est plus bas.
    const pieds = (1 - NUMERO) * PIXELS_REF * echelle - taille * REMONTE;
    const ver = estVer(bande) ? new Ver(scene, cleCorps(bande, role), echelle) : null;
    const m = ver ?? new Marionnette(scene, cle(bande, role), r, echelle);
    m.racine.setY(pieds);
    const pastille = creerBadge(scene, bande, role, taille * PASTILLE);
    pastille.setPosition(
      (r.pieces.tronc.cadre[2] / 2) * echelle + taille * 0.12,
      pieds + basBuste(r) * echelle * 0.85,
    );
    const eleve = scene.add.container(0, 0, [m.racine, pastille]);
    if (ver) animerVer(scene, ver, eleve, { caractere: role });
    else animerMarionnette(scene, m as Marionnette, eleve, { caractere: role });
    return eleve;
  },
  acteur(scene, bande, role, taille): Acteur {
    if (estVer(bande)) {
      const v = new Ver(scene, cleCorps(bande, role), (HAUTEUR_REF * taille) / PIXELS_REF);
      const objet = scene.add.container(0, 0, [v.racine]);
      return { objet, hauteur: v.hauteur, poser: (p) => v.poser(p) };
    }
    const m = new Marionnette(
      scene,
      cle(bande, role),
      rig(bande, role),
      (HAUTEUR_REF * taille) / PIXELS_REF,
    );
    const objet = scene.add.container(0, 0, [m.racine]);
    return { objet, hauteur: m.hauteur, poser: (p) => m.poser(p) };
  },
  buste(scene, bande, role, largeur, hauteur) {
    const r = rig(bande, role);
    const haut = hautTete(r);
    const bas = basBuste(r);
    const echelle = Math.min(hauteur / (bas - haut), (largeur * 0.95) / r.pieces.tronc.cadre[2]);
    const ver = estVer(bande) ? new Ver(scene, cleCorps(bande, role), echelle) : null;
    const m = ver ?? new Marionnette(scene, cle(bande, role), r, echelle);
    // Le bas du débardeur au bas de la carte.
    m.racine.setY(hauteur / 2 - bas * echelle);
    const pastille = creerBadge(scene, bande, role, 24);
    pastille.setPosition(largeur / 2 - 10, hauteur / 2 - 14);
    const buste = scene.add.container(0, 0, [m.racine, pastille]);
    const masque = masqueQuiSuit(scene, buste, (g) =>
      g.fillRect(-largeur / 2, -hauteur / 2 - hauteur, largeur, hauteur * 2),
    );
    m.racine.setMask(masque);
    if (ver) animerVer(scene, ver, buste, { caractere: role, calme: true });
    else animerMarionnette(scene, m as Marionnette, buste, { caractere: role, calme: true });
    return buste;
  },
  pastille(scene, bande, role, diametre) {
    const r = diametre / 2;
    const rg = rig(bande, role);
    const echelle = r / RAYON_BUSTE;
    const fond = scene.add.graphics();
    const couleur = equipeDe(bande).couleur;
    const clair = equipeDe(bande).clair;
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
    const ver = estVer(bande) ? new Ver(scene, cleCorps(bande, role), echelle) : null;
    const m = ver ?? new Marionnette(scene, cle(bande, role), rg, echelle);
    // Le bas du débardeur au bas de la pastille ; la tête dépasse en haut.
    m.racine.setY(r - 4 - basBuste(rg) * echelle);
    const valeur = creerBadge(scene, bande, role, diametre * 0.36);
    valeur.setPosition(r * 0.78, r * 0.72);
    const pastille = scene.add.container(0, 0, [fond, m.racine, valeur]);
    // Le corps est coupé au bord intérieur du liseré (rond ou carré selon la bande), libre au-dessus :
    // la tête sort de la pastille. Les bras ne sont pas coupés : ils passent par-dessus la pastille.
    const masque = masqueQuiSuit(scene, pastille, (g) => {
      dessiner(g, 0, 0, r - 5);
      g.fillRect(-r * 1.8, -r * 4, r * 3.6, r * 4);
    });
    if (ver) {
      ver.corps.setMask(masque);
      animerVer(scene, ver, pastille, { caractere: role, calme: true });
    } else {
      const mm = m as Marionnette;
      for (const p of ['jambeG', 'jambeD', 'tronc', 'tete'] as const) mm.pieces[p].setMask(masque);
      animerMarionnette(scene, mm, pastille, { caractere: role, calme: true });
    }
    return pastille;
  },
  pantin(scene, eleve): RenduPantin {
    const r = rig(eleve.bande, eleve.role);
    const echelle = HAUTEUR_PANTIN / PIXELS_REF;
    if (estVer(eleve.bande)) return pantinVer(scene, cleCorps(eleve.bande, eleve.role), echelle);
    const m = new Marionnette(scene, cle(eleve.bande, eleve.role), r, echelle);
    const prise = scene.add.graphics();
    // Le bras tenu passe devant la tête.
    m.corps.bringToTop(m.pieces.brasG);
    const angle = (a: P, b: P) => Math.atan2(b.y - a.y, b.x - a.x);
    return {
      objets: [m.racine, prise],
      dessiner(s) {
        // Le bras tenu va de l'épaule à la main ; le corps pend dessous, dans son prolongement,
        // avec un peu de retard du tronc.
        const versMain = angle(s.epaule, s.main);
        const depuisVerticale = Math.atan2(s.epaule.x - s.main.x, s.epaule.y - s.main.y);
        const rot = PENCHE - (depuisVerticale * 0.7 + s.angle * 0.3);
        m.corps.setRotation(rot);
        const l = m.longueurBras;
        const epaule = {
          x: s.main.x - Math.cos(versMain) * l,
          y: s.main.y - Math.sin(versMain) * l,
        };
        const [ex, ey] = m.epauleG;
        const c = Math.cos(rot);
        const sn = Math.sin(rot);
        const hanches = { x: epaule.x - (ex * c - ey * sn), y: epaule.y - (ex * sn + ey * c) };
        m.racine.setPosition(0, 0);
        m.corps.setPosition(hanches.x / echelle, hanches.y / echelle);
        m.pieces.brasG.setRotation(m.angleBrasVers('brasG', versMain));
        const [b0, b1] = s.brasLibre;
        m.pieces.brasD.setRotation(m.angleBrasVers('brasD', angle(b0, b1)));
        // Les jambes ballottent : leur angle du monde, ramené au corps (au repos, elles pendent).
        const [j1, j2] = s.jambes;
        m.pieces.jambeG.setRotation(angle(j1[0], j1[1]) - Math.PI / 2 - rot);
        m.pieces.jambeD.setRotation(angle(j2[0], j2[1]) - Math.PI / 2 - rot);
        m.pieces.tete.setRotation(-s.angle * 0.3);
        // Le doigt du joueur qui tient la main.
        prise.clear();
        prise.lineStyle(3, 0xffe066, 0.9);
        prise.strokeCircle(s.main.x, s.main.y, 14);
      },
    };
  },
};

/**
 * Ver tenu par la tête : il pend sous le doigt, dans le prolongement du mouvement, et sa queue
 * traîne derrière (l'angle des jambes du pantin) en se tortillant.
 */
function pantinVer(scene: Phaser.Scene, cleTexture: string, echelle: number): RenduPantin {
  const v = new Ver(scene, cleTexture, echelle);
  const prise = scene.add.graphics();
  return {
    objets: [v.racine, prise],
    dessiner(s) {
      const depuisVerticale = Math.atan2(s.epaule.x - s.main.x, s.epaule.y - s.main.y);
      const angle = depuisVerticale * 0.7 + s.angle * 0.3;
      const [j1] = s.jambes;
      const queue = Math.PI / 2 - Math.atan2(j1[1].y - j1[0].y, j1[1].x - j1[0].x);
      v.pendre(s.main, angle, (queue - angle) * 1.2, scene.time.now / 1000);
      prise.clear();
      prise.lineStyle(3, 0xffe066, 0.9);
      prise.strokeCircle(s.main.x, s.main.y, 14);
    },
  };
}
