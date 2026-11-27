/**
 * Skin « Classique » : les jetons d'origine (rond rouge, carré bleu, valeur au centre) et le
 * pantin en bâtons. Il sert aussi de modèle simple pour écrire un nouveau skin.
 */
import { equipeDe } from '../../data/equipes';
import type Phaser from 'phaser';
import { COULEURS } from '../config';
import { creerBadge } from '../ui/badge';
import type { P, RenduPantin, Skin } from './types';

const PEAU = 0xf2c9a0;
const CHEVEUX = 0x5a3a22;
const MEMBRES = 0x1d2b22;

export const SKIN_CLASSIQUE: Skin = {
  id: 'classique',
  textures: () => [],
  eleve: (scene, bande, role, taille) => creerBadge(scene, bande, role, taille),
  // Un jeton n'a pas de membres : il saute et penche, c'est tout.
  acteur(scene, bande, role, taille) {
    const jeton = creerBadge(scene, bande, role, taille).setY(-taille / 2);
    const objet = scene.add.container(0, 0, [jeton]);
    return {
      objet,
      hauteur: taille,
      poser: (p) => jeton.setY(-taille / 2 + p.saut * taille).setRotation(p.tronc),
    };
  },
  pantin(scene, eleve): RenduPantin {
    const g = scene.add.graphics();
    const maillot = creerBadge(scene, eleve.bande, eleve.role, 40);
    const couleur = equipeDe(eleve.bande).couleur;
    const trait = (de: P, vers: P) => {
      g.lineStyle(10, COULEURS.craie, 1);
      g.lineBetween(de.x, de.y, vers.x, vers.y);
      g.lineStyle(6, MEMBRES, 1);
      g.lineBetween(de.x, de.y, vers.x, vers.y);
    };
    const bout = (p: P, c: number) => {
      g.fillStyle(c, 1);
      g.lineStyle(2, COULEURS.craie, 1);
      g.fillCircle(p.x, p.y, 6);
      g.strokeCircle(p.x, p.y, 6);
    };
    return {
      objets: [g, maillot as Phaser.GameObjects.GameObject],
      dessiner(s) {
        g.clear();
        for (const [de, vers] of s.jambes) {
          trait(de, vers);
          bout(vers, MEMBRES);
        }
        const bas = s.le(s.tronc, 0);
        g.lineStyle(36, COULEURS.craie, 1);
        g.lineBetween(s.cou.x, s.cou.y, bas.x, bas.y);
        g.lineStyle(30, couleur, 1);
        g.lineBetween(s.cou.x, s.cou.y, bas.x, bas.y);
        trait(s.brasLibre[0], s.brasLibre[1]);
        bout(s.brasLibre[1], PEAU);
        const tete = s.le(-20, 0);
        g.fillStyle(PEAU, 1);
        g.lineStyle(3, COULEURS.craie, 1);
        g.fillCircle(tete.x, tete.y, 20);
        g.strokeCircle(tete.x, tete.y, 20);
        const meche = s.le(-34, 0);
        g.fillStyle(CHEVEUX, 1);
        g.fillCircle(meche.x, meche.y, 12);
        // Yeux en croix : il n'en mène pas large.
        g.lineStyle(2, MEMBRES, 1);
        for (const cote of [-6, 6]) {
          const o = s.le(-20, cote);
          g.lineBetween(o.x - 3, o.y - 3, o.x + 3, o.y + 3);
          g.lineBetween(o.x - 3, o.y + 3, o.x + 3, o.y - 3);
        }
        trait(s.main, s.epaule);
        g.lineStyle(3, COULEURS.allume, 0.9);
        g.strokeCircle(s.main.x, s.main.y, 14);
        bout(s.main, PEAU);
        const milieu = s.le(s.tronc / 2, 0);
        maillot.setPosition(milieu.x, milieu.y);
        maillot.setRotation(-s.angle);
      },
    };
  },
};
