import Phaser from 'phaser';
import { TEXTES } from '../../data/textes';
import { COULEURS, HAUTEUR, LARGEUR, POLICE, POLICE_TITRE } from '../config';
import { choisirSkin, preparerSkin, skinActif, skinSuivant } from '../skins/index';
import { ecrireConseils, ecrireSons, lireConseils, lireSons } from '../preferences';
import { activerSons } from '../sons';
import { creerBouton } from '../ui/bouton';
import { contourRect, forme } from '../ui/style';
import { DECOR } from './ChargementScene';

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

    if (this.textures.exists(DECOR)) {
      this.add.image(cx, HAUTEUR / 2, DECOR).setDisplaySize(LARGEUR, HAUTEUR);
    }

    // Le titre sur une grande pancarte jaune, un peu de travers.
    const pancarte = this.add.graphics();
    forme(pancarte, contourRect(-300, -120, 600, 240, 40, 5, 3), {
      remplissage: COULEURS.jaune,
      ombre: 12,
      trait: 6,
    });
    const titre = this.add
      .text(0, -10, TEXTES.titre, {
        fontFamily: POLICE_TITRE,
        fontSize: '74px',
        color: COULEURS.texteSombre,
        fontStyle: '700',
        align: 'center',
        lineSpacing: -10,
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
    const blocTitre = this.add.container(cx, 230, [pancarte, titre]).setAngle(-3);
    this.tweens.add({
      targets: blocTitre,
      angle: 2,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const sous = this.add
      .text(cx, 396, TEXTES.sousTitre, {
        fontFamily: POLICE,
        fontSize: '26px',
        color: COULEURS.texteSombre,
        fontStyle: '600',
      })
      .setOrigin(0.5);
    const fondSous = this.add.graphics();
    forme(fondSous, contourRect(cx - sous.width / 2 - 20, 372, sous.width + 40, 50, 20, 9), {
      remplissage: COULEURS.papier,
      ombre: 5,
    });
    sous.setDepth(1);

    const rouge = skinActif().eleve(this, 'rouge', 'grand', 100);
    rouge.setPosition(cx - 110, 590);
    const bleu = skinActif().eleve(this, 'bleu', 'petit', 100);
    bleu.setPosition(cx + 110, 590);
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
      { largeur: 420, hauteur: 120, taille: 34, couleur: COULEURS.jaune },
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

    const regle = this.add
      .text(cx, 1170, TEXTES.accueil.regle, {
        fontFamily: POLICE,
        fontSize: '22px',
        color: COULEURS.texteSombre,
        fontStyle: '500',
        align: 'center',
        wordWrap: { width: LARGEUR - 150 },
      })
      .setOrigin(0.5)
      .setDepth(1);
    const fondRegle = this.add.graphics();
    forme(
      fondRegle,
      contourRect(50, 1170 - regle.height / 2 - 18, LARGEUR - 100, regle.height + 36, 22, 13),
      { remplissage: COULEURS.papier, ombre: 6 },
    );
  }
}
