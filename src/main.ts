import Phaser from 'phaser';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { HAUTEUR_ECRAN, LARGEUR_ECRAN, RESOLUTION } from './game/config';
import { AccueilScene } from './game/scenes/AccueilScene';
import { ChargementScene } from './game/scenes/ChargementScene';
import { PartieScene } from './game/scenes/PartieScene';
import { textesNets } from './game/ui/ecran';
import { verifierMiseAJour } from './version';

void verifierMiseAJour();

textesNets();

// Réglages d'affichage, modifiables par l'adresse pour tester un téléphone : `?textures=16`
// rend plusieurs textures par lot, `?rendu=canvas` se passe de WebGL.
const reglages = new URLSearchParams(location.search);
const textures = Number(reglages.get('textures')) || 1;

new Phaser.Game({
  type: reglages.get('rendu') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'jeu',
  // Toute la hauteur de l'écran, à la résolution du téléphone (voir `ui/ecran.ts`).
  width: Math.round(LARGEUR_ECRAN * RESOLUTION),
  height: Math.round(HAUTEUR_ECRAN * RESOLUTION),
  backgroundColor: '#2b2340',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  // Mipmaps : les dessins réduits gardent un trait net, sans scintiller quand ils bougent.
  // Une seule texture par lot de dessin : sur certains téléphones Android, le choix de la texture
  // dans le shader « multi-textures » de Phaser se trompe d'une image à l'autre, et les élèves
  // (une texture par élève) clignotaient (DF.29).
  render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', maxTextures: textures },
  fps: { target: 60 },
  scene: [ChargementScene, AccueilScene, PartieScene],
});
