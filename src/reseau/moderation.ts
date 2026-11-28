/**
 * Filtre des pseudos (jeu en ligne) : le jeu est fait pour des enfants, et un pseudo est vu par
 * ses amis. On refuse les gros mots et insultes courants, en français et en anglais, même
 * déguisés (majuscules, accents, chiffres à la place des lettres, lettres répétées, séparateurs).
 *
 * Deux listes : les racines assez longues pour être cherchées n'importe où dans le pseudo, et les
 * mots courts qui ne comptent que seuls (« con » oui, « Constance » non ; « pute » oui,
 * « député » non). Ce n'est pas une modération parfaite : un pseudo qui passe le filtre peut
 * toujours être signalé plus tard.
 */

/** Racines cherchées partout. */
const RACINES = [
  'connard',
  'connasse',
  'salope',
  'salaud',
  'encul',
  'putain',
  'merde',
  'batard',
  'couill',
  'enfoir',
  'bougnoul',
  'youpin',
  'pedophil',
  'nazi',
  'hitler',
  'porno',
  'branleu',
  'niktamer',
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nigg',
  'negro',
  'whore',
  'slut',
  'asshole',
  'penis',
  'vagin',
  'pussy',
];

/** Mots qui ne comptent que seuls. */
const MOTS = [
  'con',
  'cons',
  'conne',
  'cul',
  'bite',
  'pute',
  'putes',
  'pd',
  'tg',
  'fdp',
  'ntm',
  'viol',
  'violeur',
  'suce',
  'suceur',
  'chatte',
  'tapette',
  'nique',
  'niquer',
  'zob',
  'teub',
  'sex',
  'sexe',
  'negre',
  'dick',
  'cock',
  'porn',
];

const CHIFFRES: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '€': 'e',
  '!': 'i',
};

/** Minuscules sans accents, chiffres-lettres remplacés, lettres répétées ramenées à une. */
function aplatir(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[0134578@$€!]/g, (c) => CHIFFRES[c] ?? c)
    .replace(/(.)\1+/g, '$1');
}

const RACINES_PLATES = RACINES.map(aplatir);
const MOTS_PLATS = new Set(MOTS.map(aplatir));

/** Vrai si le pseudo contient un mot interdit. */
export function pseudoInterdit(pseudo: string): boolean {
  const plat = aplatir(pseudo);
  const colle = plat.replace(/[^a-z]/g, '');
  if (RACINES_PLATES.some((r) => colle.includes(r))) return true;
  const mots = plat.split(/[^a-z]+/).filter(Boolean);
  if (mots.some((m) => MOTS_PLATS.has(m))) return true;
  // « C.O.N » ou « c o n » : des lettres isolées qui, recollées, forment un mot interdit.
  if (mots.length > 1 && mots.every((m) => m.length === 1) && MOTS_PLATS.has(colle)) return true;
  return MOTS_PLATS.has(colle);
}
