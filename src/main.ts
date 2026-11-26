import Phaser from 'phaser';
import { HAUTEUR, LARGEUR } from './game/config';
import { AccueilScene } from './game/scenes/AccueilScene';
import { ChargementScene } from './game/scenes/ChargementScene';
import { PartieScene } from './game/scenes/PartieScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jeu',
  width: LARGEUR,
  height: HAUTEUR,
  backgroundColor: '#1d2b22',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  render: { antialias: true },
  fps: { target: 60 },
  scene: [ChargementScene, AccueilScene, PartieScene],
});
