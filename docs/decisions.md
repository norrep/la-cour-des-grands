# Décisions et interprétations

Quand une règle est ambiguë, on choisit l'interprétation la plus simple et on la note ici.
Le prompt de Clément fait foi ; le document de conception sert de complément.

## Étape 0 — Socle

- **D0.1 — Phaser 3.** `npm i phaser` installe aujourd'hui Phaser 4. Le cahier des charges demande Phaser 3 : la version est fixée à `^3.90`.
- **D0.2 — Chemins relatifs.** Vite construit avec `base: './'`, pour que le même build marche en local et sous `/la-cour-des-grands/` sur GitHub Pages.
- **D0.3 — Une seule CI.** Un seul workflow vérifie (types, lint, format, tests, build) puis déploie sur Pages, uniquement pour un push sur `main` et seulement si tout passe.

## Étape 1 — Moteur de règles

### Architecture

- **D1.1 — État immuable.** `jouer(etat, action)` renvoie un nouvel état sans modifier l'ancien. Le rendu pourra annuler un coup non confirmé en gardant l'état précédent.
- **D1.2 — Choix pas à pas.** Une pose qui déclenche un pouvoir ou un équipement avec au moins une cible valide met la partie « en attente » d'un choix (`choisir` une option ou `passer`). Sans cible valide, l'effet ne fait rien et on n'attend rien.
- **D1.3 — Pile d'effets.** Après une pose, on résout le pouvoir de l'élève puis l'effet de l'îlot. Le 2e élève du Chouchou est une pose complète : son pouvoir, puis l'effet de son îlot, sont résolus avant l'effet de l'îlot du Chouchou.
- **D1.4 — Hasard.** Tout le hasard (mélange, premier joueur, Contagieux) passe par un générateur à graine stocké dans l'état : une même graine rejoue la même partie.

### Interprétations de règles

- **D1.5 — Équipements facultatifs.** Comme les pouvoirs, les effets des équipements sont facultatifs (on peut passer).
- **D1.6 — Victoire sur la cabane.** Elle est immédiate : le pouvoir de l'élève posé sur la cabane n'est pas appliqué.
- **D1.7 — Régions.** Elles sont vérifiées après chaque changement dans la cour (pose, retrait, déplacement), pour les deux bandes, la bande qui joue d'abord. Un retrait peut donc faire marquer l'adversaire si l'élève révélé dessous complète sa région.
- **D1.8 — Seuil atteint par les deux bandes au même moment.** La bande qui joue gagne. (Cas presque impossible, mais il fallait trancher.)
- **D1.9 — Sonnerie.** Elle n'est vérifiée qu'au début du tour d'un joueur. Un élève à l'infirmerie compte comme injouable : le Contagieux peut donc provoquer la sonnerie.
- **D1.10 — « Voisin » et « distance ».** Ils se comptent en allées, sans tenir compte de la surveillante (elle ne coupe que les connexions). Pour les buts, la distance est le plus court chemin en allées, cabanes comprises.
- **D1.11 — Surveillance.** « Aucun effet ne peut y retirer ni y déplacer un élève » vaut pour tous les élèves, les siens compris : le banc ne peut pas reprendre un élève sous surveillance. Pour le toboggan, ni l'îlot de départ ni l'îlot d'arrivée ne peuvent être surveillés.
- **D1.12 — Toboggan.** L'îlot d'arrivée peut être n'importe quel îlot voisin de l'îlot de départ, y compris celui du toboggan, et quel que soit son occupant (on pose par-dessus).
- **D1.13 — Contagieux.** Le tirage se fait parmi les élèves du rang adverse qui ne sont pas déjà à l'infirmerie. Sans élève éligible, le pouvoir ne fait rien.
- **D1.14 — Délégué.** Son déplacement de la surveillante s'ajoute à l'avance normale de fin de tour complet.
- **D1.15 — Marelle.** Les valeurs autorisées (îlots de marelle et cabanes) ne s'appliquent que si les équipements spéciaux sont actifs.
- **D1.16 — Banc des maîtresses.** Il annule le pouvoir de tout élève posé dessus, y compris le 2e élève du Chouchou. Il n'a pas d'autre effet.
- **D1.17 — Banc.** Il ne reprend pas l'élève qui vient d'être posé sur le banc ; il reprend l'élève visible d'un autre îlot, et celui de dessous redevient visible.
- **D1.18 — Seuil de la cour n°1.** Le document de conception cite un seuil de 5 en exemple ; le prompt (3 bons points) fait foi.

## Étape 2 — Jouable à deux sur téléphone

- **D2.1 — Cour fixe.** La cour ne pivote pas entre les tours : la cabane bleue reste en haut, la rouge en bas. Le rang affiché en bas est toujours celui de la bande qui joue.
- **D2.2 — Premier écran.** La partie commence par « Passe le téléphone », pour que le premier joueur découvre son rang seul.
- **D2.3 — Annulation.** « Annuler » ramène au début du tour en cours, y compris au milieu d'un choix de pouvoir, tant que le coup n'est pas validé. Le hasard étant à graine, rejouer le même coup donne le même tirage (pas de « re-tirage » du Contagieux en annulant).
- **D2.4 — Validation.** Un coup terminé n'est définitif qu'après « Valider le coup » ; le rang est caché pendant ce temps. Une victoire, elle, s'affiche tout de suite.
- **D2.5 — Équipements.** Ils se désactivent depuis l'écran d'accueil (« Équipements spéciaux : non »).
- **D2.6 — Pouvoirs à cible.** Rapporteuse, banc, buts et toboggan se jouent en touchant l'îlot qui s'allume ; Populaire, Contagieux, Délégué, cabane perchée et porte de la vie scolaire par des boutons ; le 2e élève du Chouchou se glisse depuis le rang.
- **D2.7 — Débogage.** `window.__partie` expose le contrôleur, pour vérifier l'écran avec des tests automatisés.

### Lisibilité (retour de Clément sur l'étape 2)

- **D2.8 — Fiches.** Toucher un élève du rang ouvre sa fiche (valeur et pouvoir) ; elle s'affiche aussi pendant qu'on le glisse. Toucher un îlot ou une cabane montre son effet, sa surveillance et sa pile complète, du dessus au dessous.
- **D2.9 — Piles visibles.** Les élèves plaqués apparaissent en petits badges à gauche de l'îlot (jusqu'à 4), en plus du compteur « ×n ».
- **D2.10 — Consignes.** Chaque choix dit d'où il vient (« Pouvoir du… », « Tu as posé sur le banc… ») et une bulle s'affiche au-dessus de l'îlot qui le déclenche. L'îlot spécial porte des étoiles ★.
- **D2.11 — Aide.** Le bouton « ? » ouvre « Comment jouer » : le but, le tour, les 8 élèves, l'îlot spécial et la légende.

### Deuxième passe de clarté (« c'est mou, pas hyper clair »)

- **D2.12 — Conseils pour débuter.** Activés par défaut, réglables sur l'accueil (choix gardé sur le téléphone). Chaque joueur voit chaque conseil une fois par partie, dans l'ordre : but, glisser, chemin, plaquer, appeler, surveillante (dès le tour 3), zones (dès le tour 6). Un seul conseil de ce type par tour ; ceux sur le pouvoir et la validation s'affichent au moment où ils servent. « Plus de conseils » les coupe pour la partie et les suivantes.
- **D2.13 — Chemin à la craie.** Les allées qui relient la cabane d'une bande à ses îlots (élève de la bande au sommet, sans l'allée bloquée) sont tracées en épais à sa couleur : la bande peut poser sur tout îlot qui touche ce chemin (la Fouine exceptée).
- **D2.14 — Allée bloquée en violet.** L'allée de la surveillante passe du rouge au violet (sa couleur), pour ne pas la confondre avec le chemin de la bande rouge.
- **D2.15 — Jetons de zones.** Toucher un jeton +1/+2 montre les îlots à occuper, ou qui a déjà gagné la zone.
- **D2.16 — Goûters (idée de Clément).** À l'écran, les bons points deviennent des goûters à ramasser : une friandise par zone, dans l'ordre de la cour (tablette de chocolat, paquet de biscuits, bonbon, sucette), avec sa valeur +1/+2. Seul le vocabulaire affiché change ; le moteur garde `bonsPoints`.
- **D2.17 — Direction de la surveillante.** Ses traces de pas partent d'elle, passent par le coin commun aux deux allées et finissent par une flèche vers sa silhouette pâle, posée sur sa prochaine allée. La toucher ouvre sa fiche : l'allée bloquée, la suivante, et le moment où elle bouge (après le tour des deux bandes).

## Étape 4 — Sensations de jeu

- **D4.1 — Pantin.** Pendant le glisser, la carte s'efface et l'élève pend par le col au-dessus du doigt (pour rester visible) : tronc, bras et jambes sont des pendules amortis qui réagissent à l'accélération du doigt (`src/game/pantin.ts`). On vise avec le corps de l'élève ; une pastille jaune montre l'îlot où il tombera.
- **D4.2 — Atterrissage et plaquage.** L'élève posé tombe sur l'îlot et rebondit. S'il plaque un adversaire, il tombe plus sec, l'écran tremble, un nuage de poussière et « Plaqué ! » apparaissent.
- **D4.3 — Secousses.** Fortes pour une victoire par la cabane, moyennes pour un plaquage et la sonnerie, légères pour un goûter ramassé.
- **D4.4 — Cinématiques.** CPE, infirmerie, grands frères (2e élève du Chouchou) et sonnerie ont un emplacement (`cinematiques.ts` et `dessinerPictogramme`) : pour l'instant un bandeau provisoire d'1,5 s avec un pictogramme, qu'on passe d'un toucher. Les animations définitives se brancheront là avec les visuels.
- **D4.5 — Sons.** Chaque événement a son emplacement (`sons.ts`, `FICHIERS_SONS`) ; en attendant des fichiers, de petits bruitages synthétisés provisoires. Réglage « Sons : oui/non » sur l'accueil, gardé sur le téléphone.
