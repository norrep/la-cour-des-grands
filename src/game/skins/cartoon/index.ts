/**
 * Skin « Cartoon » : les élèves dessinés d'après les références validées par Clément (trait noir
 * fin, membres en nouilles, débardeur numéroté). Ce sont des images détourées
 * (`public/skins/dessin/`), une par rôle et par bande.
 *
 * Les élèves sont des « gelées » (voir `ui/gelee.ts`) : l'image découpée en tranches respire, se
 * dandine et sautille. Le pantin est attrapé par le col et ballotte en se pliant.
 */
import Phaser from 'phaser';
import { ROLES, type Bande, type RoleId } from '../../../engine/index';
import { creerBadge } from '../../ui/badge';
import { Gelee, rendreVivant } from '../../ui/gelee';
import type { P, RenduPantin, Skin, TextureSkin } from '../types';
import { MESURES, type MesureDessin } from './mesures';

/** Hauteur de l'élève le plus grand, en multiples de `taille`. */
const HAUTEUR_REF = 2.5;
/** Hauteur de l'image la plus grande, en pixels : les autres élèves sont plus petits d'autant. */
const PIXELS_REF = 440;
/** Hauteur du numéro sur le débardeur, en fraction de l'image (l'élève est centré dessus). */
const NUMERO = 0.4;
/** L'élève est remonté d'une fraction de sa taille : ses pieds ne cachent pas le nom de l'îlot. */
const REMONTE = 0.4;
/** Pastille de valeur à côté de l'élève, en fraction de `taille`. */
const PASTILLE = 0.42;
/** Hauteur du pantin à l'écran, en pixels de jeu. */
const HAUTEUR_PANTIN = 170;
const NOIR = 0x1d1d1b;
const BANDES: Bande[] = ['rouge', 'bleu'];

const nom = (bande: Bande, role: RoleId) => `${bande}-${role}`;
const cle = (bande: Bande, role: RoleId) => `cartoon-${nom(bande, role)}`;

function mesure(bande: Bande, role: RoleId): MesureDessin {
  const m = MESURES[nom(bande, role)];
  if (!m) throw new Error(`Élève sans mesures : ${nom(bande, role)}`);
  return m;
}

function textures(): TextureSkin[] {
  return ROLES.flatMap(({ id }) =>
    BANDES.map((b) => ({ cle: cle(b, id), url: `skins/dessin/${nom(b, id)}.png` })),
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
    const corps = new Gelee(scene, { cle: cle(bande, role), echelle, pivot: m.hauteur });
    const boite = scene.add.container(0, pieds, corps.objets);
    // Pastille de valeur au niveau de la taille : le numéro du débardeur est trop petit sur l'îlot.
    const pastille = creerBadge(scene, bande, role, taille * PASTILLE);
    pastille.setPosition(
      (m.largeur / 2) * echelle + taille * 0.08,
      pieds - m.hauteur * echelle * 0.4,
    );
    const eleve = scene.add.container(0, 0, [boite, pastille]);
    rendreVivant(scene, corps, eleve, { hauteur: m.hauteur * echelle });
    return eleve;
  },
  buste(scene, bande, role, largeur, hauteur) {
    const m = mesure(bande, role);
    const bas = Math.min(m.hauteur, m.basMaillot + 6);
    const echelle = Math.min(hauteur / bas, largeur / m.largeur);
    const corps = new Gelee(scene, {
      cle: cle(bande, role),
      echelle,
      a: bas,
      pivot: bas,
      tranches: 10,
    });
    const boite = scene.add.container(0, hauteur / 2, corps.objets);
    const pastille = creerBadge(scene, bande, role, 24);
    pastille.setPosition(largeur / 2 - 10, hauteur / 2 - 14);
    const buste = scene.add.container(0, 0, [boite, pastille]);
    rendreVivant(scene, corps, buste, { hauteur: bas * echelle, calme: true });
    return buste;
  },
  pantin(scene, eleve): RenduPantin {
    const m = mesure(eleve.bande, eleve.role);
    const echelle = HAUTEUR_PANTIN / PIXELS_REF;
    const peau = Phaser.Display.Color.HexStringToColor(m.peau).color;
    // On l'attrape par le col du débardeur, comme un chaton : le corps pend sous le doigt.
    const corps = new Gelee(scene, {
      cle: cle(eleve.bande, eleve.role),
      echelle,
      pivot: m.col,
      tranches: 18,
    });
    const boite = scene.add.container(0, 0, corps.objets);
    const hanches = (m.basMaillot - m.col) * echelle;
    const pince = scene.add.graphics();
    return {
      objets: [boite, pince],
      dessiner(s) {
        // Tout le corps suit le balancier « bras tenu » ; le tronc et les jambes, plus lents,
        // traînent derrière et plient le dessin.
        const aCorps = angleDe(s.main, s.epaule) * 0.8;
        const [j1, j2] = s.jambes;
        const aJambes = (angleDe(j1[0], j1[1]) + angleDe(j2[0], j2[1])) / 2;
        const pliTronc = Math.sin(s.angle - aCorps) * 0.55;
        const pliJambes = Math.sin(aJambes - s.angle) * 0.7;
        boite.setPosition(s.main.x, s.main.y).setRotation(-aCorps);
        corps.plier((d) => {
          if (d <= 0) return 0;
          return pliTronc * Math.min(d, hanches) + pliJambes * Math.max(0, d - hanches);
        });
        // Le pouce et l'index qui pincent le col.
        pince.clear();
        pince.lineStyle(2, 0xffe066, 0.9);
        pince.strokeCircle(s.main.x, s.main.y - 4, 12);
        for (const [dx, dy, r] of [
          [-4, -5, 5],
          [4, -7, 6],
        ] as const) {
          pince.fillStyle(NOIR, 1);
          pince.fillCircle(s.main.x + dx, s.main.y + dy, r + 2);
          pince.fillStyle(peau, 1);
          pince.fillCircle(s.main.x + dx, s.main.y + dy, r);
        }
        pince.fillStyle(0xffffff, 0.7);
        pince.fillCircle(s.main.x + 5, s.main.y - 10, 2);
      },
    };
  },
};
