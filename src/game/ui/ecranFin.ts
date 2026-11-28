import Phaser from 'phaser';
import type { Bande, RoleId } from '../../engine/index';
import { equipeDe } from '../../data/equipes';
import { BAS, COULEURS, DROITE, GAUCHE, HAUT, LARGEUR, POLICE } from '../config';
import { skinActif } from '../skins';
import type { Acteur } from '../skins/types';
import { poseRepos } from './marionnette';
import { fondManga } from './fondManga';
import { contourRect, forme } from './style';

/** Comment la partie s'est jouée : tout ce que l'écran de fin raconte. */
export interface BilanFin {
  gagnant: Bande;
  raison: 'cabane' | 'bonsPoints' | 'sonnerie' | 'abandon' | 'temps';
  /** Point de vue du téléphone : on a gagné, on a perdu, ou deux joueurs sur le même écran. */
  vue: 'gagne' | 'perdu' | 'neutre';
  gouters: Record<Bande, number>;
  objectif: number;
  tours: number;
  /** Phrase sous l'étiquette : « Ta bande a pris la cabane adverse ! ». */
  phrase: string;
  /** Textures de la cabane de la carte (image et murs à teinter). */
  cabane: { image: string; murs: string };
}

export interface ActionsFin {
  rejouer: () => void;
  accueil: () => void;
  /** Libellé du bouton principal (« Rejouer », ou « Nouvelle partie » en ligne). */
  libelleRejouer: string;
  libelleAccueil: string;
  bouton: (
    x: number,
    y: number,
    texte: string,
    action: () => void,
    style: { largeur?: number; hauteur?: number; taille?: number; couleur?: number },
  ) => Phaser.GameObjects.Container;
}

const autre = (b: Bande): Bande => (b === 'rouge' ? 'bleu' : 'rouge');

/** Mélange une couleur avec du blanc (`t` = part de blanc). */
function eclaircir(couleur: number, t: number): number {
  const c = Phaser.Display.Color.IntegerToColor(couleur);
  const m = (v: number): number => Math.round(v + (255 - v) * t);
  return Phaser.Display.Color.GetColor(m(c.red), m(c.green), m(c.blue));
}

function foncer(couleur: number, t: number): number {
  const c = Phaser.Display.Color.IntegerToColor(couleur);
  const m = (v: number): number => Math.round(v * (1 - t));
  return Phaser.Display.Color.GetColor(m(c.red), m(c.green), m(c.blue));
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Le grand titre de l'écran, selon le point de vue. */
export function titreFin(b: BilanFin): string {
  if (b.vue === 'perdu') return 'PERDU…';
  if (b.vue === 'gagne') return 'GAGNÉ !';
  return `${equipeDe(b.gagnant).nom.replace(/^Les /, '').toUpperCase()} !`;
}

/** Ce qui a fait gagner, en deux ou trois mots (le pictogramme dit le reste). */
export function commentFin(raison: BilanFin['raison']): string {
  switch (raison) {
    case 'cabane':
      return 'Cabane prise !';
    case 'bonsPoints':
      return 'Goûters dévalisés !';
    case 'sonnerie':
      return 'Sauvés par la sonnerie !';
    case 'abandon':
      return 'Abandon !';
    default:
      return 'Temps écoulé !';
  }
}

function texte(
  scene: Phaser.Scene,
  x: number,
  y: number,
  contenu: string,
  taille: number,
  couleur: string,
  options: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, contenu, {
      fontFamily: POLICE,
      fontSize: `${taille}px`,
      color: couleur,
      fontStyle: '700',
      align: 'center',
      ...options,
    })
    .setOrigin(0.5);
}

/** Réduit un texte d'une ligne pour qu'il tienne dans `largeur`. */
function ajuster(t: Phaser.GameObjects.Text, largeur: number): Phaser.GameObjects.Text {
  if (t.width > largeur) t.setScale(largeur / t.width);
  return t;
}

/**
 * Un élève qui fête (bras en l'air, sauts) ou qui boude (tête basse, épaules tombées). La pose
 * est recalculée à chaque image ; tout s'arrête quand l'objet est détruit.
 */
export function animerHumeur(
  scene: Phaser.Scene,
  acteur: Acteur,
  humeur: 'fete' | 'boude',
  phase = 0,
): void {
  const sans = (window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
  const maj = (): void => {
    if (!acteur.objet.active) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, maj);
      return;
    }
    const t = (sans ? 0.18 : scene.time.now / 1000) + phase;
    const p = poseRepos();
    if (humeur === 'fete') {
      const s = Math.abs(Math.sin(t * 5.2));
      p.saut = -s * 0.16;
      p.brasG = 2.3 + Math.sin(t * 10.4) * 0.35;
      p.brasD = -2.3 - Math.sin(t * 10.4 + 1) * 0.35;
      p.jambeG = s * 0.25;
      p.jambeD = -s * 0.25;
      p.tete = Math.sin(t * 5.2) * 0.12;
      p.tronc = Math.sin(t * 2.6) * 0.06;
    } else {
      p.tete = 0.32 + Math.sin(t * 1.3) * 0.04;
      p.tronc = 0.08;
      p.brasG = -0.12;
      p.brasD = 0.1;
      p.rebond = 0.02 + Math.sin(t * 1.3) * 0.01;
      p.regard = -1;
    }
    acteur.poser(p);
  };
  maj();
  scene.events.on(Phaser.Scenes.Events.UPDATE, maj);
}

/** Pictogramme de la façon de gagner : la cabane prise, des goûters, ou le réveil. */
function pictogramme(
  scene: Phaser.Scene,
  b: BilanFin,
  taille: number,
): Phaser.GameObjects.GameObject[] {
  if (b.raison === 'cabane') {
    const perdant = autre(b.gagnant);
    const k = (taille / 512) * 1.25;
    const objets: Phaser.GameObjects.GameObject[] = [];
    if (scene.textures.exists(b.cabane.image))
      objets.push(scene.add.image(0, 0, b.cabane.image).setScale(k));
    if (scene.textures.exists(b.cabane.murs))
      objets.push(
        scene.add.image(0, 0, b.cabane.murs).setScale(k).setTint(equipeDe(perdant).couleur),
      );
    // Le drapeau du gagnant planté sur le toit.
    const g = scene.add.graphics();
    const mx = taille * 0.05;
    const my = -taille * 0.52;
    g.lineStyle(5, COULEURS.encre, 1);
    g.lineBetween(mx, my + taille * 0.22, mx, my - taille * 0.2);
    forme(
      g,
      [
        { x: mx, y: my - taille * 0.2 },
        { x: mx + taille * 0.34, y: my - taille * 0.12 },
        { x: mx, y: my - taille * 0.02 },
      ],
      { remplissage: equipeDe(b.gagnant).couleur, trait: 4 },
    );
    objets.push(g);
    return objets;
  }
  if (b.raison === 'bonsPoints') {
    const cles = ['gouter-chocolat', 'gouter-biscuits', 'gouter-sucette'];
    return cles
      .filter((c) => scene.textures.exists(c))
      .map((c, i) =>
        scene.add
          .image((i - 1) * taille * 0.32, i === 1 ? -taille * 0.12 : taille * 0.04, c)
          .setDisplaySize(taille * 0.62, taille * 0.62)
          .setAngle((i - 1) * 14),
      );
  }
  if (b.raison === 'sonnerie' && scene.textures.exists('incrust-sonnerie'))
    return [scene.add.image(0, 0, 'incrust-sonnerie').setDisplaySize(taille, taille)];
  // Abandon, temps : un drapeau blanc.
  const g = scene.add.graphics();
  g.lineStyle(5, COULEURS.encre, 1);
  g.lineBetween(-taille * 0.2, taille * 0.4, -taille * 0.2, -taille * 0.4);
  forme(g, contourRect(-taille * 0.2, -taille * 0.4, taille * 0.5, taille * 0.34, 6, 9, 0.4), {
    remplissage: 0xffffff,
    trait: 4,
  });
  return [g];
}

/** Une rangée de goûters : un biscuit par goûter ramassé, un rond vide pour ceux qui manquent. */
function rangeeGouters(
  scene: Phaser.Scene,
  x: number,
  y: number,
  n: number,
  objectif: number,
  couleur: number,
  cote = 34,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  const total = Math.max(n, objectif);
  const pas = Math.min(cote + 8, 240 / total);
  for (let i = 0; i < total; i++) {
    const cx = (i - (total - 1) / 2) * pas;
    if (i < n) {
      g.fillStyle(COULEURS.encre, 0.85);
      g.fillCircle(cx + 1, 3, cote / 2);
      g.fillStyle(0xd59a55, 1);
      g.fillCircle(cx, 0, cote / 2);
      g.lineStyle(3, COULEURS.encre, 1);
      g.strokeCircle(cx, 0, cote / 2);
      g.fillStyle(0x6b3f22, 1);
      for (const [dx, dy] of [
        [-0.2, -0.15],
        [0.18, -0.05],
        [-0.02, 0.22],
      ] as const)
        g.fillCircle(cx + dx * cote, dy * cote, cote * 0.08);
    } else {
      g.lineStyle(3, couleur, 0.7);
      g.strokeCircle(cx, 0, cote / 2 - 2);
    }
  }
  return g;
}

function acteurs(
  scene: Phaser.Scene,
  bande: Bande,
  roles: { role: RoleId; x: number; y: number; taille: number }[],
  humeur: 'fete' | 'boude',
): Phaser.GameObjects.Container[] {
  const skin = skinActif();
  return roles.map((r, i) => {
    const a = skin.acteur(scene, bande, r.role, r.taille);
    const ombre = scene.add.ellipse(0, 0, a.hauteur * 0.5, a.hauteur * 0.09, COULEURS.encre, 0.25);
    const c = scene.add.container(r.x, r.y, [ombre, a.objet]);
    animerHumeur(scene, a, humeur, i * 0.37);
    return c;
  });
}

/**
 * L'écran de fin (DW.2) : une affiche de manga à la couleur de la bande gagnante. Le titre dit
 * qui a gagné (de notre point de vue), une étiquette dit comment, et les deux boîtes à goûter
 * donnent le score. Quand on a perdu, c'est notre bande qui boude, sur un fond gris.
 */
export function ecranFin(
  scene: Phaser.Scene,
  b: BilanFin,
  a: ActionsFin,
  entree = true,
): Phaser.GameObjects.Container {
  const cx = LARGEUR / 2;
  const perdu = b.vue === 'perdu';
  const perdant = autre(b.gagnant);
  // La bande montrée en grand : la gagnante, ou la nôtre quand on a perdu.
  const vedette = perdu ? perdant : b.gagnant;
  const objets: Phaser.GameObjects.GameObject[] = [];
  objets.push(
    fondManga(
      scene,
      { x: GAUCHE, y: HAUT, w: DROITE - GAUCHE, h: BAS - HAUT },
      { x: cx, y: 470 },
      perdu ? 0x9a93ad : equipeDe(b.gagnant).couleur,
    ),
  );
  // Le ruban du titre, penché, comme un autocollant.
  const ruban = scene.add.graphics();
  forme(
    ruban,
    [
      { x: -300, y: -62 },
      { x: 300, y: -74 },
      { x: 286, y: 58 },
      { x: -290, y: 66 },
    ],
    { remplissage: perdu ? 0xd8d2c4 : COULEURS.jaune, trait: 6, ombre: 10 },
  );
  const titre = ajuster(texte(scene, 0, -4, titreFin(b), 92, COULEURS.texteSombre), 540);
  objets.push(scene.add.container(cx, 120, [ruban, titre]).setAngle(-4));

  // Le Grand et le Petit, en grand.
  objets.push(
    ...acteurs(
      scene,
      vedette,
      [
        { role: 'petit', x: cx - 150, y: 680, taille: 160 },
        { role: 'grand', x: cx + 90, y: 700, taille: 180 },
      ],
      perdu ? 'boude' : 'fete',
    ),
  );

  // L'étiquette « comment » : pictogramme + trois mots.
  const et = scene.add.graphics();
  forme(et, contourRect(-300, -64, 600, 128, 26, 17), {
    remplissage: COULEURS.papier,
    trait: 5,
    ombre: 8,
  });
  const picto = scene.add.container(-225, -6, pictogramme(scene, b, 118));
  const comment = ajuster(
    texte(scene, 50, -20, commentFin(b.raison), 44, COULEURS.texteSombre),
    420,
  );
  const phrase = texte(scene, 50, 28, b.phrase, 22, '#6b6152', {
    fontStyle: '600',
    wordWrap: { width: 420 },
  });
  objets.push(scene.add.container(cx, 800, [et, picto, comment, phrase]).setAngle(1.5));

  // Le score : les deux boîtes à goûter côte à côte, la gagnante à gauche.
  const sc = scene.add.graphics();
  const larg = 280;
  const score: Phaser.GameObjects.GameObject[] = [sc];
  for (const [k, bande] of [
    [-1, b.gagnant],
    [1, perdant],
  ] as const) {
    const e = equipeDe(bande);
    const x = k * (larg / 2 + 8);
    forme(sc, contourRect(x - larg / 2, -54, larg, 108, 22, 30 + k), {
      remplissage: eclaircir(e.couleur, 0.55),
      trait: 4,
      ombre: 6,
    });
    score.push(
      ajuster(
        texte(scene, x, -26, e.nom.replace(/^Les /, ''), 24, hex(foncer(e.couleur, 0.35))),
        larg - 30,
      ),
      rangeeGouters(scene, x, 18, b.gouters[bande], b.objectif, foncer(e.couleur, 0.2), 30),
    );
  }
  objets.push(scene.add.container(cx, 960, score));
  objets.push(
    texte(scene, cx, 1036, `Partie en ${b.tours} tours`, 20, COULEURS.texteSombre, {
      fontStyle: '600',
    }),
  );
  objets.push(
    a.bouton(250, 1130, a.libelleRejouer, a.rejouer, {
      largeur: 360,
      hauteur: 96,
      taille: 38,
      couleur: COULEURS.jaune,
    }),
    a.bouton(550, 1130, a.libelleAccueil, a.accueil, { largeur: 200, hauteur: 80, taille: 28 }),
  );

  // Entrée : le fond est déjà là (le rond de la transition s'est refermé dessus), le reste
  // arrive d'un bond, de haut en bas.
  const sans = (window as unknown as { __sansAnimations?: boolean }).__sansAnimations;
  if (entree && !sans) {
    objets.slice(1).forEach((o, i) => {
      const t = o as unknown as Phaser.GameObjects.Components.Transform &
        Phaser.GameObjects.Components.Alpha;
      const sx = t.scaleX;
      const sy = t.scaleY;
      t.setScale(sx * 0.4, sy * 0.4).setAlpha(0);
      scene.tweens.add({
        targets: t,
        scaleX: sx,
        scaleY: sy,
        alpha: 1,
        duration: 320,
        delay: 80 + i * 70,
        ease: 'Back.easeOut',
      });
    });
  }
  const bloqueur = scene.add
    .rectangle(GAUCHE, HAUT, DROITE - GAUCHE, BAS - HAUT, 0x000000, 0.001)
    .setOrigin(0, 0)
    .setInteractive();
  return scene.add.container(0, 0, [bloqueur, ...objets]).setDepth(900);
}
