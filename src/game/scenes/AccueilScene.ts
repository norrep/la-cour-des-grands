import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { creerBadge } from '../ui/badge';
import { creerBouton } from '../ui/bouton';

export interface DonneesPartie {
  equipements: boolean;
  graine: number;
}

/** Écran d'accueil : lancer une partie à deux, avec ou sans équipements spéciaux. */
export class AccueilScene extends Phaser.Scene {
  private equipements = true;

  constructor() {
    super('accueil');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COULEURS.fond);
    const cx = LARGEUR / 2;

    const cadre = this.add.graphics();
    cadre.lineStyle(6, COULEURS.craie, 0.8);
    cadre.strokeRoundedRect(24, 24, LARGEUR - 48, HAUTEUR - 48, 32);

    this.add
      .text(cx, 260, TEXTES.titre, {
        fontFamily: POLICE_TITRE,
        fontSize: '76px',
        color: COULEURS.texteClair,
        align: 'center',
        wordWrap: { width: LARGEUR - 120 },
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 400, TEXTES.sousTitre, {
        fontFamily: POLICE_TITRE,
        fontSize: '30px',
        color: COULEURS.texteClair,
      })
      .setOrigin(0.5);

    const rouge = creerBadge(this, 'rouge', 'grand', 130);
    rouge.setPosition(cx - 110, 580);
    const bleu = creerBadge(this, 'bleu', 'petit', 130);
    bleu.setPosition(cx + 110, 580);
    this.tweens.add({ targets: [rouge, bleu], angle: 6, duration: 600, yoyo: true, repeat: -1 });

    creerBouton(
      this,
      cx,
      800,
      `${TEXTES.accueil.jouerADeux}\n${TEXTES.accueil.sousJouerADeux}`,
      () => {
        const donnees: DonneesPartie = { equipements: this.equipements, graine: Date.now() };
        this.scene.start('partie', donnees);
      },
      { largeur: 420, hauteur: 120, taille: 34, couleur: COULEURS.allume },
    );

    const bascule = (): void => {
      boutonEquip.destroy();
      boutonEquip = creerBoutonEquip();
    };
    const creerBoutonEquip = () =>
      creerBouton(
        this,
        cx,
        950,
        TEXTES.accueil.equipements(this.equipements),
        () => {
          this.equipements = !this.equipements;
          bascule();
        },
        { largeur: 420, hauteur: 70, taille: 26 },
      );
    let boutonEquip = creerBoutonEquip();

    this.add
      .text(cx, 1100, TEXTES.accueil.regle, {
        fontFamily: POLICE,
        fontSize: '24px',
        color: COULEURS.texteClair,
        align: 'center',
        wordWrap: { width: LARGEUR - 140 },
      })
      .setOrigin(0.5);
  }
}
