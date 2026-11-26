import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { COULEURS, HAUTEUR, LARGEUR } from '../config';

/** Écran d'accueil provisoire de l'étape 0 : il prouve que Phaser, le tactile et l'échelle marchent. */
export class AccueilScene extends Phaser.Scene {
  constructor() {
    super('accueil');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    const cx = LARGEUR / 2;

    // Cadre à la craie, pour voir les bords de la zone 720×1280.
    const cadre = this.add.graphics();
    cadre.lineStyle(6, COULEURS.craie, 0.8);
    cadre.strokeRoundedRect(24, 24, LARGEUR - 48, HAUTEUR - 48, 32);

    this.add
      .text(cx, 300, TEXTES.titre, {
        fontFamily: 'Georgia, serif',
        fontSize: '72px',
        color: COULEURS.texteClair,
        align: 'center',
        wordWrap: { width: LARGEUR - 120 },
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 440, TEXTES.sousTitre, {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: COULEURS.texteClair,
      })
      .setOrigin(0.5);

    // Les deux badges : rond pour la bande rouge, carré pour la bleue.
    this.add.circle(cx - 110, 640, 70, COULEURS.rouge).setStrokeStyle(6, COULEURS.craie);
    this.add.rectangle(cx + 110, 640, 130, 130, COULEURS.bleu).setStrokeStyle(6, COULEURS.craie);

    this.add
      .text(cx, 860, TEXTES.socle.enConstruction, {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: COULEURS.texteClair,
        align: 'center',
        wordWrap: { width: LARGEUR - 120 },
      })
      .setOrigin(0.5);
    const consigne = this.add
      .text(cx, 1040, TEXTES.socle.toucher, {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: COULEURS.texteClair,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: consigne, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const bulle = this.add
        .text(p.worldX, p.worldY, TEXTES.socle.sonnerie, {
          fontFamily: 'Impact, sans-serif',
          fontSize: '48px',
          color: '#ffe066',
          stroke: COULEURS.texteSombre,
          strokeThickness: 8,
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: bulle,
        y: p.worldY - 120,
        alpha: 0,
        scale: 1.4,
        duration: 700,
        onComplete: () => bulle.destroy(),
      });
      this.cameras.main.shake(120, 0.004);
    });
  }
}
