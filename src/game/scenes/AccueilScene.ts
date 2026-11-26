import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { creerBadge } from '../ui/badge';
import { ecrireConseils, ecrireSons, lireConseils, lireSons } from '../preferences';
import { activerSons } from '../sons';
import { creerBouton } from '../ui/bouton';

export interface DonneesPartie {
  equipements: boolean;
  /** Conseils pour débuter pendant les premiers tours. */
  conseils: boolean;
  graine: number;
}

/** Écran d'accueil : lancer une partie à deux, avec ou sans équipements spéciaux. */
export class AccueilScene extends Phaser.Scene {
  private equipements = true;

  constructor() {
    super('accueil');
  }

  create(): void {
    activerSons(lireSons());
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
      780,
      `${TEXTES.accueil.jouerADeux}\n${TEXTES.accueil.sousJouerADeux}`,
      () => {
        const donnees: DonneesPartie = {
          equipements: this.equipements,
          conseils: lireConseils(),
          graine: Date.now(),
        };
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
        895,
        TEXTES.accueil.equipements(this.equipements),
        () => {
          this.equipements = !this.equipements;
          bascule();
        },
        { largeur: 420, hauteur: 64, taille: 25 },
      );
    let boutonEquip = creerBoutonEquip();

    const creerBoutonConseils = () =>
      creerBouton(
        this,
        cx,
        975,
        TEXTES.conseils.accueil(lireConseils()),
        () => {
          ecrireConseils(!lireConseils());
          boutonConseils.destroy();
          boutonConseils = creerBoutonConseils();
        },
        { largeur: 420, hauteur: 64, taille: 25 },
      );
    let boutonConseils = creerBoutonConseils();

    const creerBoutonSons = () =>
      creerBouton(
        this,
        cx,
        1055,
        TEXTES.sons(lireSons()),
        () => {
          ecrireSons(!lireSons());
          activerSons(lireSons());
          boutonSons.destroy();
          boutonSons = creerBoutonSons();
        },
        { largeur: 420, hauteur: 64, taille: 25 },
      );
    let boutonSons = creerBoutonSons();

    this.add
      .text(cx, 1175, TEXTES.accueil.regle, {
        fontFamily: POLICE,
        fontSize: '24px',
        color: COULEURS.texteClair,
        align: 'center',
        wordWrap: { width: LARGEUR - 140 },
      })
      .setOrigin(0.5);
  }
}
