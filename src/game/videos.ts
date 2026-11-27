/**
 * Vidéos de pouvoir et de goûter gardées en mémoire (DV.6).
 *
 * Sur un téléphone, la balise vidéo retélécharge le fichier au moment de le jouer, même s'il a
 * déjà été récupéré en fond : sur le réseau mobile, la vidéo ne démarrait pas dans les temps et
 * le panneau prenait sa place. On télécharge donc chaque vidéo une fois, en entier, et on la joue
 * depuis la mémoire du téléphone : elle démarre tout de suite, sans réseau.
 *
 * Les téléchargements passent deux par deux, dans l'ordre demandé (les vidéos de l'équipe du
 * joueur d'abord), pour que les premières soient prêtes au plus vite.
 */

const pretes = new Map<string, string>();
const demandees = new Set<string>();
const file: string[] = [];
let enCours = 0;
const EN_PARALLELE = 2;

function suivante(): void {
  while (enCours < EN_PARALLELE && file.length > 0) {
    const url = file.shift() as string;
    enCours++;
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        pretes.set(url, URL.createObjectURL(blob));
      })
      .catch(() => {
        // Réseau coupé : on pourra redemander la vidéo plus tard.
        demandees.delete(url);
      })
      .finally(() => {
        enCours--;
        suivante();
      });
  }
}

/** Télécharge ces vidéos en fond (celles déjà demandées sont ignorées), dans cet ordre. */
export function prechargerVideos(urls: Iterable<string | undefined>): void {
  if (typeof fetch !== 'function' || typeof URL.createObjectURL !== 'function') return;
  const nouvelles: string[] = [];
  for (const url of urls) {
    if (!url || demandees.has(url)) continue;
    demandees.add(url);
    nouvelles.push(url);
  }
  // Les dernières demandées passent devant : c'est la partie qui commence.
  file.unshift(...nouvelles);
  suivante();
}

/** L'adresse en mémoire de cette vidéo, si elle est déjà téléchargée. */
export function videoEnMemoire(url: string): string | undefined {
  return pretes.get(url);
}
