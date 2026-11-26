# La Cour des Grands

Duel tactique mobile en 2D, de 4 à 6 minutes, à deux joueurs : deux bandes d'élèves (rouge contre bleue) se disputent la cour de récré.

- **Jouer :** https://norrep.github.io/la-cour-des-grands/ (mis à jour à chaque push sur `main`)
- **Stack :** TypeScript strict, Vite, Phaser 3, Vitest, ESLint, Prettier
- **Format :** portrait 9:16, base 720×1280, mise à l'échelle FIT, tactile

## Jouer

Ouvre le lien sur ton téléphone, touche « Jouer à deux », puis passez-vous le téléphone :

1. Glisse un élève de ton rang (en bas) vers un îlot qui s'allume, ou touche « Appeler des copains ».
2. Si l'élève a un pouvoir, choisis sa cible (îlot qui s'allume ou bouton), ou « Passer ».
3. Le coup est joué aussitôt : donne le téléphone à l'autre bande.

Badge **rond** = bande rouge, badge **carré** = bande bleue. Les traces de pas violettes mènent à la silhouette pâle de la surveillante, sur sa prochaine allée ; l'allée violette pleine est bloquée et les îlots entourés de violet sont sous surveillance. Les friandises +1/+2 sont les goûters à ramasser.

## Commandes

| Commande             | Rôle                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm install`        | installe les dépendances                                                                                   |
| `npm run dev`        | serveur de développement (ouvert sur le réseau local : teste depuis ton téléphone avec l'adresse affichée) |
| `npm run build`      | vérifie les types puis construit le site dans `dist/`                                                      |
| `npm run preview`    | sert le build de `dist/`                                                                                   |
| `npm test`           | lance tous les tests unitaires                                                                             |
| `npm run test:watch` | tests en continu                                                                                           |
| `npm run coverage`   | couverture de tests du moteur                                                                              |
| `npm run lint`       | ESLint                                                                                                     |
| `npm run format`     | formate le code avec Prettier                                                                              |
| `npm run check`      | types + lint + format + tests (à lancer avant chaque push)                                                 |
| `npm run simulate`   | fait jouer des parties aléatoires (`-- --parties 10000 --graine 1`)                                        |

## Organisation

```
src/
  engine/        moteur de règles en TypeScript pur, déterministe, sans Phaser
  game/          rendu Phaser : lit l'état et envoie des actions
    skins/       visuels interchangeables des élèves (Cartoon, Jetons)
  data/
    boards/      cours décrites en JSON (îlots, allées, régions, ronde)
    textes.ts    tous les textes affichés, en français
tests/           tests Vitest
scripts/         outils (simulation de parties)
docs/            décisions de règles (docs/decisions.md)
```

## Déploiement

Le workflow `.github/workflows/ci.yml` vérifie les types, le lint, le format, les tests et le build à chaque push et pull request. Sur `main`, si tout passe, il publie `dist/` sur GitHub Pages.

Si le premier déploiement échoue avec « Pages not enabled », active Pages une fois dans **Settings → Pages → Source : GitHub Actions**.
