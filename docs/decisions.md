# Décisions et interprétations

Quand une règle est ambiguë, on choisit l'interprétation la plus simple et on la note ici.
Le prompt de Clément fait foi ; le document de conception sert de complément.

## Étape 0 — Socle

- **D0.1 — Phaser 3.** `npm i phaser` installe aujourd'hui Phaser 4. Le cahier des charges demande Phaser 3 : la version est fixée à `^3.90`.
- **D0.2 — Chemins relatifs.** Vite construit avec `base: './'`, pour que le même build marche en local et sous `/la-cour-des-grands/` sur GitHub Pages.
- **D0.3 — Une seule CI.** Un seul workflow vérifie (types, lint, format, tests, build) puis déploie sur Pages, uniquement pour un push sur `main` et seulement si tout passe.
