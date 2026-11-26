import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { choisirSkin, preparerSkin, skinActif, skinSuivant } from '../skins/index';
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

    const rouge = skinActif().eleve(this, 'rouge', 'grand', 100);
    rouge.setPosition(cx - 110, 560);
    const bleu = skinActif().eleve(this, 'bleu', 'petit', 100);
    bleu.setPosition(cx + 110, 560);
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
        885,
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
        960,
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
        cx - 108,
        1035,
        TEXTES.sons(lireSons()),
        () => {
          ecrireSons(!lireSons());
          activerSons(lireSons());
          boutonSons.destroy();
          boutonSons = creerBoutonSons();
        },
        { largeur: 204, hauteur: 64, taille: 23 },
      );
    let boutonSons = creerBoutonSons();

    // Style des élèves : chaque appui passe au skin suivant et redessine l'accueil.
    let changement = false;
    creerBouton(
      this,
      cx + 108,
      1035,
      TEXTES.style(TEXTES.skins[skinActif().id]),
      () => {
        if (changement) return;
        changement = true;
        const id = skinSuivant(skinActif().id);
        preparerSkin(this, id)
          .then(() => choisirSkin(id))
          .catch(() => undefined)
          .finally(() => this.scene.restart());
      },
      { largeur: 204, hauteur: 64, taille: 23 },
    );

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
