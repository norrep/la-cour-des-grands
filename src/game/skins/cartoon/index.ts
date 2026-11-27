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
import type { Acteur, P, RenduPantin, Skin, TextureSkin } from '../types';
import { RIGS } from './rig';
import { RIGS_EQUIPES } from './rigEquipes';
import { EQUIPES, type EquipeId } from '../../../data/equipes';

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

function rig(bande: Bande, role: RoleId): Rig {
  const r = RIGS[nom(bande, role)] ?? RIGS_EQUIPES[nom(bande, role)];
  if (!r) throw new Error(`Élève sans marionnette : ${nom(bande, role)}`);
  return r;
}

/** Les images des élèves d'une équipe. */
export function texturesEquipe(equipe: EquipeId): TextureSkin[] {
  const prefixe = EQUIPES[equipe].prefixe;
  return ROLES.map(({ id }) => ({
    cle: `dodu-${prefixe}-${id}`,
    url: `skins/dodu/${prefixe}-${id}.png`,
  }));
}

/** Au chargement, les Rouges et les Bleus ; les autres équipes sont chargées une fois choisies. */
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

export const SKIN_CARTOON: Skin = {
  id: 'cartoon',
  textures,
  texturesEquipe,
  eleve(scene, bande, role, taille) {
    const r = rig(bande, role);
    const echelle = (HAUTEUR_REF * taille) / PIXELS_REF;
    // Tous les élèves ont les pieds au même niveau : le Grand dépasse, le Petit est plus bas.
    const pieds = (1 - NUMERO) * PIXELS_REF * echelle - taille * REMONTE;
    const m = new Marionnette(scene, cle(bande, role), r, echelle);
    m.racine.setY(pieds);
    const pastille = creerBadge(scene, bande, role, taille * PASTILLE);
    pastille.setPosition(
      (r.pieces.tronc.cadre[2] / 2) * echelle + taille * 0.12,
      pieds + basBuste(r) * echelle * 0.85,
    );
    const eleve = scene.add.container(0, 0, [m.racine, pastille]);
    animerMarionnette(scene, m, eleve, { caractere: role });
    return eleve;
  },
  acteur(scene, bande, role, taille): Acteur {
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
    const m = new Marionnette(scene, cle(bande, role), r, echelle);
    // Le bas du débardeur au bas de la carte.
    m.racine.setY(hauteur / 2 - bas * echelle);
    const pastille = creerBadge(scene, bande, role, 24);
    pastille.setPosition(largeur / 2 - 10, hauteur / 2 - 14);
    const buste = scene.add.container(0, 0, [m.racine, pastille]);
    const masque = masqueQuiSuit(scene, buste, (g) =>
      g.fillRect(-largeur / 2, -hauteur / 2 - hauteur, largeur, hauteur * 2),
    );
    m.racine.setMask(masque);
    animerMarionnette(scene, m, buste, { caractere: role, calme: true });
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
    const m = new Marionnette(scene, cle(bande, role), rg, echelle);
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
    for (const p of ['jambeG', 'jambeD', 'tronc', 'tete'] as const) m.pieces[p].setMask(masque);
    animerMarionnette(scene, m, pastille, { caractere: role, calme: true });
    return pastille;
  },
  pantin(scene, eleve): RenduPantin {
    const r = rig(eleve.bande, eleve.role);
    const echelle = HAUTEUR_PANTIN / PIXELS_REF;
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
