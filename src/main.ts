import Phaser from 'phaser';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import { HAUTEUR, LARGEUR } from './game/config';
import { AccueilScene } from './game/scenes/AccueilScene';
import { ChargementScene } from './game/scenes/ChargementScene';
import { PartieScene } from './game/scenes/PartieScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jeu',
  width: LARGEUR,
  height: HAUTEUR,
  backgroundColor: '#2b2340',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  // Mipmaps : les dessins réduits gardent un trait net, sans scintiller quand ils bougent.
  render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
  fps: { target: 60 },
  scene: [ChargementScene, AccueilScene, PartieScene],
});
