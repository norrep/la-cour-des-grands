/**
 * Textes du tutoriel jouable (DJ.1), pour un public de 13 ans et plus : courts, directs, sans
 * bêtifier. Le surveillant est celui de la carte en cours (la cour : Mme Josiane).
 */
import { surv } from './cartes';

export const TEXTES_TUTO = {
  accueil: 'Apprendre à jouer',
  passer: 'Passer le tuto',
  /** Petit titre au-dessus de la bulle du guide. */
  etiquette: (n: number, total: number) => `Leçon ${n}/${total}`,
  lecons: [
    {
      titre: 'Fonce à la cabane',
      intro:
        'Pour gagner, fais entrer un de tes élèves dans la cabane d’en face. Mais on avance d’îlot en îlot, en partant de chez soi.',
      premiere: 'Glisse un élève de ta main sur un îlot qui s’allume, collé à ta cabane.',
      chemin: 'Ton chemin part de ta cabane. Pose sur un îlot qui le touche pour avancer.',
      appeler:
        'Plus personne en main ! Touche « +2 copains » : deux élèves arrivent, et ton tour s’arrête là.',
      cabane: 'La cabane d’en face touche ton chemin. Glisse un élève dedans !',
      ordi: 'L’ordi joue. Ici, il se contente d’appeler des copains.',
      bravo: 'Cabane prise ! Un chemin d’élèves, de ta cabane à la sienne : c’est gagné.',
    },
    {
      titre: 'Plaque !',
      intro:
        'Un élève d’en face te barre la route. Si le tien a un plus gros chiffre, il lui saute dessus et prend sa place.',
      plaquer:
        'Sa Fouine (4) bloque le toboggan. Ton Grand (7) est plus fort : lâche-le sur elle !',
      plaque: 'Plaquée ! Elle reste coincée dessous et l’îlot est à toi.',
      cabane: 'La route est libre. Même ton 1 peut entrer dans la cabane : vas-y !',
      bravo:
        'Plus fort que lui ? Plaque-le. Et son Grand (7), personne ne le plaque… sauf le Petit (J).',
    },
    {
      titre: 'Le goûter',
      intro:
        'Autre façon de gagner : ramasser 3 goûters. Pour en prendre un, occupe tous les îlots autour de lui.',
      entourer:
        'Tu as déjà 2 goûters. Autour de la sucette (+1), il te manque un îlot : pose sur les jeux à ressort !',
      garde: () =>
        `Raté ? ${surv.nom} garde ce goûter : personne n’y touche tant qu’${surv.il} est là. Mais ${surv.il} change de goûter à chaque tour…`,
      bravo: () =>
        `${surv.Il} est parti${surv.il === 'elle' ? 'e' : ''} : le goûter entouré est à toi ! Regarde toujours où ${surv.il} va (ses traces de pas).`,
    },
  ],
  reussie: 'Leçon réussie !',
  suivante: 'Leçon suivante',
  fini: 'Tu sais jouer !',
  finTexte:
    'Les élèves ont aussi des pouvoirs : touche une carte pour lire le sien. Le reste, tu l’apprendras en jouant.',
  premierePartie: 'Ma première partie',
  accueilRetour: 'Accueil',
  commencer: 'C’est parti !',
} as const;
