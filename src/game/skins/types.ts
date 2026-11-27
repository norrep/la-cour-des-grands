/**
 * Un skin est un jeu de visuels interchangeable pour les élèves. Il ne touche jamais aux règles :
 * le moteur ignore tout des skins, et le rendu passe toujours par le skin actif.
 * Pour ajouter un skin (par exemple vendu en boutique), il suffit d'écrire un objet `Skin`
 * et de l'inscrire dans `skins/index.ts`.
 */
import type Phaser from 'phaser';
import type { Bande, Eleve, RoleId } from '../../engine/index';
import type { EquipeId } from '../../data/equipes';

export type SkinId = 'cartoon' | 'classique';

export interface P {
  x: number;
  y: number;
}

/** Image à préparer au chargement : un SVG (dessiné par le code) ou un fichier. */
export interface TextureSkin {
  cle: string;
  svg?: string;
  url?: string;
}

/** Position des articulations du pantin à un instant donné (voir `ui/pantin.ts`). */
export interface Squelette {
  /** La main tenue par le joueur. */
  main: P;
  /** L'épaule du bras tenu. */
  epaule: P;
  /** Le cou (haut du tronc). */
  cou: P;
  /** Angle du tronc depuis la verticale (positif : le bas part vers la droite). */
  angle: number;
  /** Longueur du tronc, du cou aux hanches. */
  tronc: number;
  /** Point du corps : `d` le long du tronc depuis le cou, `cote` sur le côté. */
  le(d: number, cote: number): P;
  /** Bras libre : de l'épaule à la main. */
  brasLibre: [P, P];
  /** Jambes : de la hanche au pied. */
  jambes: [[P, P], [P, P]];
}

/** Dessin du pantin propre à un skin. */
export interface RenduPantin {
  /** Objets à mettre dans le conteneur du pantin, dans l'ordre d'affichage. */
  readonly objets: Phaser.GameObjects.GameObject[];
  dessiner(s: Squelette): void;
}

export interface Skin {
  id: SkinId;
  /** Images à préparer avant d'afficher quoi que ce soit. */
  textures(): TextureSkin[];
  /** Images des élèves d'une équipe, à charger quand elle est choisie (DB.1). Facultatif. */
  texturesEquipe?(equipe: EquipeId): TextureSkin[];
  /**
   * L'élève debout, centré sur son numéro. `taille` est la largeur de référence : celle d'un
   * jeton rond du skin classique.
   */
  eleve(
    scene: Phaser.Scene,
    bande: Bande,
    role: RoleId,
    taille: number,
  ): Phaser.GameObjects.Container;
  /**
   * Portrait pour les cartes du rang : tête et débardeur, tenant dans `largeur` × `hauteur`,
   * centré. Facultatif : sans lui, la carte montre l'élève entier.
   */
  buste?(
    scene: Phaser.Scene,
    bande: Bande,
    role: RoleId,
    largeur: number,
    hauteur: number,
  ): Phaser.GameObjects.Container;
  /**
   * L'élève posé sur la cour : son buste dans une pastille aux couleurs de sa bande, avec sa
   * valeur. Facultatif : sans elle, la cour montre l'élève entier.
   */
  pastille?(
    scene: Phaser.Scene,
    bande: Bande,
    role: RoleId,
    diametre: number,
  ): Phaser.GameObjects.Container;
  /** Le dessin de l'élève qu'on tient pendant qu'on le glisse (le seul où il est entier). */
  pantin(scene: Phaser.Scene, eleve: Eleve): RenduPantin;
}
