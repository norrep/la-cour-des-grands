/**
 * Skin « Cartoon » : les élèves dessinés d'après les références validées par Clément (trait noir
 * fin, membres en nouilles, débardeur numéroté). Ce sont des images détourées
 * (`public/skins/dessin/`), une par rôle et par bande.
 *
 * Le pantin garde l'image entière : l'élève pend à sa propre main, et son bras s'étire comme un
 * spaghetti jusqu'au doigt du joueur.
 */
import Phaser from 'phaser';
import { ROLES, type Bande, type RoleId } from '../../../engine/index';
import { creerBadge } from '../../ui/badge';
import type { P, RenduPantin, Skin, TextureSkin } from '../types';
import { MESURES, type MesureDessin } from './mesures';

/** Hauteur de l'élève le plus grand, en multiples de `taille`. */
const HAUTEUR_REF = 2.5;
/** Hauteur de l'image la plus grande, en pixels : les autres élèves sont plus petits d'autant. */
const PIXELS_REF = 440;
/** Hauteur du numéro sur le débardeur, en fraction de l'image (l'élève est centré dessus). */
const NUMERO = 0.4;
/** L'élève est remonté d'une fraction de sa taille : ses pieds ne cachent pas le nom de l'îlot. */
const REMONTE = 0.38;
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

/** Bras en spaghetti : un trait noir, la couleur de la peau par-dessus, un peu courbé. */
function nouille(g: Phaser.GameObjects.Graphics, de: P, vers: P, c: number, ep: number): void {
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const courbe = new Phaser.Curves.QuadraticBezier(
    new Phaser.Math.Vector2(de.x, de.y),
    new Phaser.Math.Vector2((de.x + vers.x) / 2 + dy * 0.12, (de.y + vers.y) / 2 - dx * 0.12),
    new Phaser.Math.Vector2(vers.x, vers.y),
  );
  const points = courbe.getPoints(12);
  for (const [largeur, teinte] of [
    [ep + 4, NOIR],
    [ep, c],
  ] as const) {
    g.lineStyle(largeur, teinte, 1);
    g.strokePoints(points, false, false);
    g.fillStyle(teinte, 1);
    for (const p of [points[0], points[points.length - 1]]) {
      if (p) g.fillCircle(p.x, p.y, largeur / 2);
    }
  }
}

export const SKIN_CARTOON: Skin = {
  id: 'cartoon',
  textures,
  eleve(scene, bande, role, taille) {
    const m = mesure(bande, role);
    const echelle = (HAUTEUR_REF * taille) / PIXELS_REF;
    // Tous les élèves ont les pieds au même niveau : le Grand dépasse, le Petit est plus bas.
    const pieds = (1 - NUMERO) * PIXELS_REF * echelle - taille * REMONTE;
    const img = scene.add.image(0, pieds, cle(bande, role)).setOrigin(0.5, 1).setScale(echelle);
    // Pastille de valeur au niveau de la taille : le numéro du débardeur est trop petit sur l'îlot.
    const pastille = creerBadge(scene, bande, role, taille * PASTILLE);
    pastille.setPosition(
      (m.largeur / 2) * echelle + taille * 0.08,
      pieds - m.hauteur * echelle * 0.4,
    );
    return scene.add.container(0, 0, [img, pastille]);
  },
  pantin(scene, eleve): RenduPantin {
    const m = mesure(eleve.bande, eleve.role);
    const echelle = HAUTEUR_PANTIN / PIXELS_REF;
    const bras = scene.add.graphics();
    const img = scene.add.image(0, 0, cle(eleve.bande, eleve.role));
    // L'image tourne autour de la main gauche de l'élève.
    img.setOrigin(m.main.x / m.largeur, m.main.y / m.hauteur).setScale(echelle);
    const devant = scene.add.graphics();
    const peau = Phaser.Display.Color.HexStringToColor(m.peau).color;
    return {
      objets: [bras, img, devant],
      dessiner(s) {
        // La main de l'image est sous l'épaule du squelette, assez bas pour que la tête passe
        // sous la main tenue ; le corps se balance avec le tronc.
        const bas = m.main.y * echelle * 0.75;
        const main = { x: s.epaule.x, y: s.epaule.y + bas };
        img.setPosition(main.x, main.y);
        img.setRotation(-s.angle * 0.6);
        bras.clear();
        devant.clear();
        nouille(bras, s.main, main, peau, 7);
        devant.lineStyle(3, 0xffe066, 0.9);
        devant.strokeCircle(s.main.x, s.main.y, 14);
        devant.fillStyle(NOIR, 1);
        devant.fillCircle(s.main.x, s.main.y, 8);
        devant.fillStyle(peau, 1);
        devant.fillCircle(s.main.x, s.main.y, 6);
      },
    };
  },
};
