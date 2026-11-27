/**
 * Attaches des marionnettes du skin cartoon, relevées au découpage des images en T-pose
 * (`public/skins/dodu/`). Pixels de texture ; positions depuis le milieu des pieds.
 * Fichier produit par le script de découpe : ne pas modifier à la main.
 */
import type { Rig } from '../../ui/marionnette';

export const RIGS: Record<string, Rig> = {
  'bleu-chouchou': {
    hauteur: 748,
    bras: 56.9,
    main: [-166.0, 7.5],
    pieces: {
      jambeG: { cadre: [0, 0, 132, 254], pivot: [89.2, 17.7], pos: [-43.1, -235.9] },
      jambeD: { cadre: [148, 0, 132, 254], pivot: [42.6, 17.7], pos: [42.6, -235.9] },
      brasG: { cadre: [296, 0, 197, 82], pivot: [166.0, 36.6], pos: [-94.0, -449.2] },
      brasD: { cadre: [509, 0, 193, 81], pivot: [31.1, 36.2], pos: [89.9, -451.1] },
      tronc: { cadre: [718, 0, 177, 295], pivot: [87.6, 294.7], pos: [-2.7, -224.1] },
      tete: { cadre: [911, 0, 264, 259], pivot: [134.6, 259.1], pos: [-2.7, -488.9] },
    },
  },
  'bleu-contagieux': {
    hauteur: 748,
    bras: 62.0,
    main: [-164.5, 8.0],
    pieces: {
      jambeG: { cadre: [0, 0, 151, 296], pivot: [107.3, 17.8], pos: [-43.5, -277.6] },
      jambeD: { cadre: [167, 0, 147, 296], pivot: [42.4, 17.8], pos: [42.4, -277.6] },
      brasG: { cadre: [330, 0, 199, 80], pivot: [164.5, 31.3], pos: [-90.3, -494.2] },
      brasD: { cadre: [545, 0, 199, 79], pivot: [33.9, 31.1], pos: [83.0, -496.5] },
      tronc: { cadre: [760, 0, 190, 297], pivot: [103.6, 297.0], pos: [0.9, -265.7] },
      tete: { cadre: [966, 0, 238, 215], pivot: [121.7, 215.0], pos: [0.9, -533.0] },
    },
  },
  'bleu-delegue': {
    hauteur: 766,
    bras: 58.6,
    main: [-167.2, 8.2],
    pieces: {
      jambeG: { cadre: [0, 0, 151, 292], pivot: [106.9, 18.3], pos: [-44.0, -273.9] },
      jambeD: { cadre: [167, 0, 149, 292], pivot: [42.1, 18.3], pos: [42.3, -273.9] },
      brasG: { cadre: [332, 0, 200, 80], pivot: [167.2, 30.4], pos: [-93.1, -499.7] },
      brasD: { cadre: [548, 0, 199, 79], pivot: [32.2, 30.3], pos: [85.6, -502.4] },
      tronc: { cadre: [763, 0, 176, 306], pivot: [85.9, 305.8], pos: [-3.6, -261.7] },
      tete: { cadre: [955, 0, 192, 228], pivot: [98.2, 228.5], pos: [-3.6, -537.1] },
    },
  },
  'bleu-fouine': {
    hauteur: 722,
    bras: 64.8,
    main: [-156.0, 7.7],
    pieces: {
      jambeG: { cadre: [0, 0, 148, 285], pivot: [107.4, 16.0], pos: [-40.1, -268.2] },
      jambeD: { cadre: [164, 0, 145, 285], pivot: [39.3, 16.0], pos: [39.4, -268.2] },
      brasG: { cadre: [325, 0, 192, 80], pivot: [156.0, 32.4], pos: [-93.7, -484.2] },
      brasD: { cadre: [533, 0, 190, 79], pivot: [35.6, 33.5], pos: [88.8, -485.0] },
      tronc: { cadre: [739, 0, 179, 296], pivot: [90.2, 295.6], pos: [-1.1, -257.5] },
      tete: { cadre: [934, 0, 199, 197], pivot: [89.0, 197.4], pos: [-1.1, -524.2] },
    },
  },
  'bleu-grand': {
    hauteur: 880,
    bras: 55.5,
    main: [-215.1, 7.6],
    pieces: {
      jambeG: { cadre: [0, 0, 139, 350], pivot: [100.9, 15.7], pos: [-38.1, -334.1] },
      jambeD: { cadre: [155, 0, 134, 350], pivot: [36.1, 15.7], pos: [36.1, -334.1] },
      brasG: { cadre: [305, 0, 246, 78], pivot: [215.1, 28.5], pos: [-79.2, -558.3] },
      brasD: { cadre: [567, 0, 245, 78], pivot: [30.2, 28.5], pos: [73.4, -558.3] },
      tronc: { cadre: [828, 0, 147, 316], pivot: [72.8, 315.7], pos: [-2.7, -323.7] },
      tete: { cadre: [991, 0, 307, 276], pivot: [170.7, 275.8], pos: [-2.7, -604.2] },
    },
  },
  'bleu-petit': {
    hauteur: 581,
    bras: 39.8,
    main: [-101.0, 3.2],
    pieces: {
      jambeG: { cadre: [0, 0, 83, 130], pivot: [49.1, 14.1], pos: [-34.0, -115.8] },
      jambeD: { cadre: [99, 0, 83, 129], pivot: [33.9, 14.1], pos: [33.9, -115.8] },
      brasG: { cadre: [198, 0, 123, 64], pivot: [101.0, 30.2], pos: [-95.5, -251.7] },
      brasD: { cadre: [337, 0, 122, 64], pivot: [21.7, 30.4], pos: [92.6, -253.4] },
      tronc: { cadre: [475, 0, 256, 201], pivot: [128.4, 200.6], pos: [-3.5, -106.4] },
      tete: { cadre: [747, 0, 317, 297], pivot: [159.3, 296.8], pos: [-3.5, -284.0] },
    },
  },
  'bleu-populaire': {
    hauteur: 757,
    bras: 60.7,
    main: [-165.0, 8.0],
    pieces: {
      jambeG: { cadre: [0, 0, 149, 271], pivot: [109.3, 14.3], pos: [-39.9, -256.4] },
      jambeD: { cadre: [165, 0, 150, 271], pivot: [39.9, 14.3], pos: [39.9, -256.4] },
      brasG: { cadre: [331, 0, 199, 78], pivot: [165.0, 30.5], pos: [-88.4, -450.4] },
      brasD: { cadre: [546, 0, 198, 78], pivot: [33.3, 30.7], pos: [84.9, -452.4] },
      tronc: { cadre: [760, 0, 181, 271], pivot: [89.5, 270.6], pos: [-1.6, -246.8] },
      tete: { cadre: [957, 0, 192, 269], pivot: [97.6, 269.4], pos: [-1.6, -487.4] },
    },
  },
  'bleu-rapporteuse': {
    hauteur: 730,
    bras: 58.4,
    main: [-174.3, 5.6],
    pieces: {
      jambeG: { cadre: [0, 0, 104, 277], pivot: [64.9, 13.1], pos: [-38.9, -263.8] },
      jambeD: { cadre: [120, 0, 104, 277], pivot: [38.5, 13.1], pos: [38.7, -263.8] },
      brasG: { cadre: [240, 0, 207, 79], pivot: [174.3, 31.2], pos: [-78.7, -488.8] },
      brasD: { cadre: [463, 0, 203, 79], pivot: [32.1, 31.2], pos: [78.4, -491.0] },
      tronc: { cadre: [682, 0, 259, 309], pivot: [130.5, 309.3], pos: [-0.2, -255.0] },
      tete: { cadre: [957, 0, 259, 195], pivot: [130.5, 195.1], pos: [-0.2, -535.3] },
    },
  },
  'rouge-chouchou': {
    hauteur: 748,
    bras: 57.0,
    main: [-166.5, 7.3],
    pieces: {
      jambeG: { cadre: [0, 0, 133, 253], pivot: [89.6, 17.8], pos: [-43.0, -235.3] },
      jambeD: { cadre: [149, 0, 132, 253], pivot: [42.5, 17.8], pos: [42.7, -235.3] },
      brasG: { cadre: [297, 0, 198, 82], pivot: [166.5, 36.4], pos: [-94.0, -449.0] },
      brasD: { cadre: [511, 0, 193, 82], pivot: [31.1, 36.4], pos: [90.2, -450.9] },
      tronc: { cadre: [720, 0, 178, 295], pivot: [88.0, 295.1], pos: [-2.2, -223.4] },
      tete: { cadre: [914, 0, 265, 259], pivot: [135.1, 259.4], pos: [-2.2, -488.6] },
    },
  },
  'rouge-contagieux': {
    hauteur: 748,
    bras: 62.0,
    main: [-164.7, 8.1],
    pieces: {
      jambeG: { cadre: [0, 0, 151, 296], pivot: [107.3, 18.0], pos: [-43.7, -277.5] },
      jambeD: { cadre: [167, 0, 148, 296], pivot: [42.5, 18.0], pos: [42.5, -277.5] },
      brasG: { cadre: [331, 0, 199, 80], pivot: [164.7, 31.0], pos: [-90.4, -494.2] },
      brasD: { cadre: [546, 0, 199, 80], pivot: [34.0, 31.3], pos: [83.5, -496.4] },
      tronc: { cadre: [761, 0, 190, 297], pivot: [103.7, 297.1], pos: [0.9, -265.4] },
      tete: { cadre: [967, 0, 238, 215], pivot: [121.9, 215.3], pos: [0.9, -532.7] },
    },
  },
  'rouge-delegue': {
    hauteur: 766,
    bras: 59.0,
    main: [-167.8, 8.1],
    pieces: {
      jambeG: { cadre: [0, 0, 151, 292], pivot: [107.0, 18.3], pos: [-44.3, -273.4] },
      jambeD: { cadre: [167, 0, 150, 292], pivot: [42.2, 18.3], pos: [42.4, -273.4] },
      brasG: { cadre: [333, 0, 200, 79], pivot: [167.8, 30.5], pos: [-93.3, -499.6] },
      brasD: { cadre: [549, 0, 199, 79], pivot: [32.2, 30.5], pos: [85.7, -502.5] },
      tronc: { cadre: [764, 0, 176, 307], pivot: [86.2, 306.6], pos: [-3.5, -261.2] },
      tete: { cadre: [956, 0, 193, 228], pivot: [98.6, 228.2], pos: [-3.5, -537.4] },
    },
  },
  'rouge-fouine': {
    hauteur: 722,
    bras: 64.8,
    main: [-156.2, 7.8],
    pieces: {
      jambeG: { cadre: [0, 0, 148, 284], pivot: [107.6, 16.0], pos: [-40.1, -267.9] },
      jambeD: { cadre: [164, 0, 145, 284], pivot: [39.3, 16.0], pos: [39.5, -267.9] },
      brasG: { cadre: [325, 0, 192, 80], pivot: [156.2, 32.3], pos: [-93.8, -484.0] },
      brasD: { cadre: [533, 0, 190, 79], pivot: [35.6, 33.3], pos: [89.2, -484.8] },
      tronc: { cadre: [739, 0, 179, 296], pivot: [90.4, 295.6], pos: [-1.1, -257.2] },
      tete: { cadre: [934, 0, 199, 197], pivot: [89.1, 197.3], pos: [-1.1, -524.3] },
    },
  },
  'rouge-grand': {
    hauteur: 880,
    bras: 55.2,
    main: [-215.1, 7.3],
    pieces: {
      jambeG: { cadre: [0, 0, 140, 350], pivot: [101.2, 15.7], pos: [-38.3, -333.8] },
      jambeD: { cadre: [156, 0, 134, 350], pivot: [36.2, 15.7], pos: [36.2, -333.8] },
      brasG: { cadre: [306, 0, 246, 78], pivot: [215.1, 28.9], pos: [-79.2, -557.9] },
      brasD: { cadre: [568, 0, 246, 78], pivot: [30.2, 28.9], pos: [73.4, -557.9] },
      tronc: { cadre: [830, 0, 147, 315], pivot: [72.8, 315.4], pos: [-2.7, -323.4] },
      tete: { cadre: [993, 0, 308, 276], pivot: [171.3, 276.1], pos: [-2.7, -603.9] },
    },
  },
  'rouge-petit': {
    hauteur: 581,
    bras: 39.9,
    main: [-101.4, 3.2],
    pieces: {
      jambeG: { cadre: [0, 0, 83, 130], pivot: [49.2, 14.1], pos: [-34.1, -115.8] },
      jambeD: { cadre: [99, 0, 84, 129], pivot: [34.0, 14.1], pos: [34.0, -115.8] },
      brasG: { cadre: [199, 0, 123, 64], pivot: [101.4, 30.3], pos: [-95.7, -251.6] },
      brasD: { cadre: [338, 0, 123, 64], pivot: [21.7, 30.4], pos: [92.8, -253.4] },
      tronc: { cadre: [477, 0, 256, 201], pivot: [128.6, 200.7], pos: [-3.5, -106.4] },
      tete: { cadre: [749, 0, 317, 297], pivot: [159.5, 296.8], pos: [-3.5, -284.0] },
    },
  },
  'rouge-populaire': {
    hauteur: 757,
    bras: 60.8,
    main: [-165.3, 7.8],
    pieces: {
      jambeG: { cadre: [0, 0, 150, 271], pivot: [109.5, 14.3], pos: [-40.1, -256.2] },
      jambeD: { cadre: [166, 0, 149, 271], pivot: [40.0, 14.3], pos: [40.1, -256.2] },
      brasG: { cadre: [331, 0, 199, 78], pivot: [165.3, 30.7], pos: [-88.7, -450.3] },
      brasD: { cadre: [546, 0, 198, 77], pivot: [33.4, 30.7], pos: [85.2, -452.2] },
      tronc: { cadre: [760, 0, 181, 271], pivot: [89.8, 271.4], pos: [-1.6, -246.6] },
      tete: { cadre: [957, 0, 192, 269], pivot: [97.9, 268.9], pos: [-1.6, -487.9] },
    },
  },
  'rouge-rapporteuse': {
    hauteur: 730,
    bras: 58.5,
    main: [-174.9, 5.6],
    pieces: {
      jambeG: { cadre: [0, 0, 104, 277], pivot: [65.0, 13.1], pos: [-38.9, -263.9] },
      jambeD: { cadre: [120, 0, 104, 277], pivot: [38.8, 13.1], pos: [38.9, -263.9] },
      brasG: { cadre: [240, 0, 207, 78], pivot: [174.9, 31.1], pos: [-78.9, -488.9] },
      brasD: { cadre: [463, 0, 204, 78], pivot: [32.1, 31.0], pos: [78.6, -491.2] },
      tronc: { cadre: [683, 0, 260, 310], pivot: [130.7, 309.5], pos: [-0.2, -255.1] },
      tete: { cadre: [959, 0, 260, 195], pivot: [130.7, 194.8], pos: [-0.2, -535.6] },
    },
  },
};

/** Mme Josiane, la surveillante (texture `public/skins/dodu/josiane.png`), avec coudes et cahier. */
export const RIG_JOSIANE: Rig = {
  hauteur: 770,
  bras: 62.4,
  main: [-141.5, 14.5],
  pieces: {
    jambeG: { cadre: [0, 0, 91, 140], pivot: [28.1, 9.1], pos: [-46.2, -130.6] },
    jambeD: { cadre: [107, 0, 95, 135], pivot: [29.4, 9.1], pos: [46.5, -130.6] },
    brasG: { cadre: [218, 0, 105, 76], pivot: [70.5, 35.5], pos: [-118.5, -490.7] },
    brasD: { cadre: [339, 0, 105, 76], pivot: [34.3, 35.5], pos: [119.5, -490.7] },
    tronc: { cadre: [460, 0, 241, 436], pivot: [120.3, 436.4], pos: [0.3, -124.6] },
    tete: { cadre: [717, 0, 177, 295], pivot: [83.5, 239.6], pos: [0.3, -530.4] },
  },
  extras: {
    avantBrasG: { cadre: [910, 0, 104, 68], pivot: [70.7, 31.9], pos: [-189.2, -480.5] },
    avantBrasD: { cadre: [1030, 0, 104, 68], pivot: [33.1, 31.9], pos: [190.2, -480.5] },
    cahier: { cadre: [1150, 0, 142, 146], pivot: [71.6, 68.4], pos: [0.0, -385.8] },
  },
};
