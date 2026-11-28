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
- **D2.3 — Annulation** (remplacée par D4.6). « Annuler » ramène au début du tour en cours, y compris au milieu d'un choix de pouvoir, tant que le coup n'est pas validé. Le hasard étant à graine, rejouer le même coup donne le même tirage (pas de « re-tirage » du Contagieux en annulant).
- **D2.4 — Validation** (remplacée par D4.6). Un coup terminé n'est définitif qu'après « Valider le coup » ; le rang est caché pendant ce temps. Une victoire, elle, s'affiche tout de suite.
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
- **D2.17 — Direction de la surveillante** (remplacée par D2.18 pour la règle, l'idée des traces reste). Ses traces de pas partent d'elle, passent par le coin commun aux deux allées et finissent par une flèche vers sa silhouette pâle, posée sur sa prochaine allée. La toucher ouvre sa fiche : l'allée bloquée, la suivante, et le moment où elle bouge (après le tour des deux bandes).
- **D2.18 — La surveillante garde un goûter (choix de Clément, règle A).** Elle ne bloque plus d'allée et ne protège plus d'îlot : elle se tient à côté d'un goûter, et tant qu'elle y est, personne ne peut le ramasser. Sa ronde passe d'un goûter à l'autre dans un ordre fixé par la cour (cour n°1 : gauche → haut → droite → bas, départ à gauche), un pas après chaque tour complet. Le Délégué la fait avancer ou reculer d'1 ou 2 goûters. Quand elle part, un goûter déjà entouré par une bande est ramassé aussitôt (la bande qui vient de jouer est servie d'abord). Une cour sans goûter n'a pas de surveillante. À l'écran : un rond lilas en pointillés autour du goûter gardé, ses traces de pas vers le suivant et sa silhouette pâle.
- **D2.19 — Le Délégué l'envoie au hasard, sans annonce (demande de Clément : « pas besoin d'anticiper, ça allège l'UI »).** Plus de traces de pas ni de silhouette pâle vers le prochain goûter. Le Délégué propose un seul bouton « Mot d'excuse ! » : la surveillante avance alors de 1 ou 2 goûters dans sa ronde, tiré au hasard (avec le générateur de la partie, donc rejouable). Il ne la fait plus reculer. Le pas automatique après chaque tour complet ne change pas.
- **D2.20 — Seuls les îlots spéciaux ont un nom (demande de Clément).** Les îlots ordinaires n'ont plus d'étiquette (bac à sable, marelle…) : leur fiche s'appelle « Un îlot » et le journal dit « un îlot ». Les îlots à équipement gardent leur nom avec une étoile et reçoivent une illustration ; seul le Banc en a une pour l'instant (`public/decor/banc.png`), les autres suivront si Clément les valide.

## Étape 3 — Adversaire IA

- **D3.1 — Une IA générique (approche convenue avec Clément).** L'IA (`src/ia/`, pure comme le moteur, sans Phaser) ne connaît aucune règle par cœur : elle demande au moteur tous les tours complets possibles (pose, puis chaque choix de pouvoir ou d'îlot, jusqu'au tour adverse), les joue sur des copies de l'état et note la position obtenue. Une règle changée, un nouvel élève ou une nouvelle cour sont donc pris en compte sans toucher à l'IA. Deux élèves du même rôle posés au même endroit comptent pour un seul coup.
- **D3.2 — Évaluation paramétrable.** La note d'une position additionne, pour chaque bande : goûters ramassés, goûters en cours (part des îlots tenus, moins si Mme Josiane le garde ou le gardera au prochain tour, rien si un adversaire est planqué dedans), îlots tenus et leur solidité (valeur de l'élève visible), élèves planqués, nombre de poses qui manquent pour atteindre la cabane adverse, menace de cabane (au trait ou non), élèves jouables et force du rang, couloir restant et risque de sonnerie. Tous les poids sont dans `POIDS_DEFAUT` (`src/ia/evaluation.ts`).
- **D3.3 — L'IA ne triche pas.** Avant de réfléchir, elle remplace tout ce qu'elle ne peut pas voir par un tirage au hasard (« monde possible ») : ordre de son couloir, absents de l'appel, rang et couloir adverses, et le hasard du moteur (Contagieux, mot d'excuse). Seuls restent connus les élèves adverses arrivés dans le rang de façon visible (repêchés, rappelés) ou révélés par l'infirmerie, tant qu'ils n'ont pas été rejoués. Elle moyenne ses notes sur plusieurs mondes. Un test vérifie qu'échanger les cartes cachées ne change pas sa décision.
- **D3.4 — Mêmes boutons qu'un joueur.** L'écran ne propose « Passer » que pour le mot d'excuse du Délégué (DF.8, DF.9) : l'IA s'y tient, même si le moteur permet de passer partout.
- **D3.5 — Trois niveaux** (`NIVEAUX` dans `src/ia/joueur.ts`), plus « hasard » pour les essais :
  - **facile** : regarde seulement son tour, sur un seul monde, avec beaucoup de bruit, un coup au hasard une fois sur cinq, et ne voit pas venir les attaques de cabane ;
  - **moyen** : regarde son tour sur 3 mondes, peu de bruit ;
  - **difficile** : examine ses 6 meilleurs coups en regardant aussi la meilleure réponse adverse, sur 4 mondes.
    Sur 400 parties (couleurs alternées) : facile bat le hasard 95 %, moyen bat facile 79 %, difficile bat moyen 75 %. Temps de réflexion du niveau difficile sur un ordinateur : 11 ms en médiane, 0,1 s au pire, donc jouable sur téléphone.
- **D3.6 — Réglage des poids par l'arène.** Le poids des élèves jouables et de la force du rang a été multiplié par 10 après des séries de matchs : garder des élèves en main fait passer le niveau difficile de 57 % à 88 % contre le niveau moyen d'avant. Les autres essais (régions, distance à la cabane, îlots) ne changeaient presque rien.
- **D3.7 — Arène IA contre IA.** `npm run arene -- --a difficile --b moyen --parties 200` fait jouer deux niveaux en alternant les couleurs et donne : victoires, avantage du premier joueur, façons de gagner, durée, plaquages, élèves chez la CPE, élèves posés par rôle (et par le gagnant), pouvoirs utilisés. 400 parties de niveau difficile prennent environ une minute et demie. C'est l'outil pour tester l'équilibre d'une règle ou d'une cour avant de la faire valider.
- **D3.8 — Pas encore à l'écran** (remplacée par D3.10). L'IA n'est pas branchée sur la partie : d'autres travaux modifient l'écran de jeu en ce moment. `choisirAction(etat, niveau, rng)` donne la prochaine action ; l'écran n'aura qu'à l'appeler quand c'est le tour de l'ordinateur (et sauter « Passe le téléphone »).

- **D3.9 — Premier bilan d'équilibre (cour n°1, 400 parties difficile contre difficile).** Le premier joueur gagne 51,5 % des parties : pas d'avantage net. Les parties durent 22,6 tours de joueur (9 à 53). On gagne surtout par la cabane (65 %), puis par les goûters (35 %) ; la sonnerie n'arrive presque jamais (0,5 %). Environ 9 plaquages et 3 élèves chez la CPE par partie. La Rapporteuse et le Chouchou sont les plus posés ; le Petit et la Fouine les moins. Le mot d'excuse du Délégué n'est utilisé qu'une fois sur deux (l'IA préfère souvent garder Mme Josiane où elle est). Ce sont des pistes à regarder, rien n'a été changé dans les règles.

- **D3.10 — Jouer contre l'ordi (Clément : « C'est parti »).** L'accueil a un bouton « Jouer contre l'ordi » et, dessous, « Niveau de l'ordi » qui passe de facile à moyen puis difficile (moyen par défaut, choix gardé sur le téléphone). En solo, le joueur a toujours la bande rouge (en bas) et l'ordi la bleue ; le premier joueur reste tiré au sort. Il n'y a plus d'écran « Passe le téléphone ». Pendant le tour de l'ordi, le rang du joueur reste affiché sans pouvoir être touché, « L'ordi réfléchit… » remplace les boutons, et chaque action de l'ordi (pose, puis pouvoir) est jouée comme un toucher, avec les mêmes animations, après le temps de voir la précédente (0,75 s au moins). Les conseils ne s'affichent qu'au tour du joueur. En fin de partie : « L'ordi a envahi la cabane d'en face ! » ou « Ta bande a… ».

## Étape 4 — Sensations de jeu

- **D4.1 — Pantin.** Pendant le glisser, la carte s'efface et l'élève pend par la main (demande de Clément), au-dessus du doigt pour rester visible : bras tenu, tronc, autre bras et jambes sont des pendules amortis qui réagissent à l'accélération du doigt (`src/game/pantin.ts`). On vise avec le corps de l'élève ; une pastille jaune montre l'îlot où il tombera.
- **D4.2 — Atterrissage et plaquage.** L'élève posé tombe sur l'îlot et rebondit. S'il plaque un adversaire, il tombe plus sec, l'écran tremble, un nuage de poussière et « Plaqué ! » apparaissent.
- **D4.3 — Secousses.** Fortes pour une victoire par la cabane, moyennes pour un plaquage et la sonnerie, légères pour un goûter ramassé.
- **D4.4 — Cinématiques.** CPE, infirmerie, grands frères (2e élève du Chouchou) et sonnerie ont un emplacement (`cinematiques.ts` et `dessinerPictogramme`) : pour l'instant un bandeau provisoire d'1,5 s avec un pictogramme, qu'on passe d'un toucher. Les animations définitives se brancheront là avec les visuels.
- **D4.5 — Sons.** Chaque événement a son emplacement (`sons.ts`, `FICHIERS_SONS`) ; en attendant des fichiers, de petits bruitages synthétisés provisoires. Réglage « Sons : oui/non » sur l'accueil, gardé sur le téléphone.
- **D4.6 — Coups définitifs (demande de Clément : « on ne peut pas refuser une action de joueur »).** Lu comme : plus d'« Annuler » ni de « Valider le coup ». Un coup est joué dès qu'il est fait ; après 0,9 s pour voir l'atterrissage (rang caché, écran bloqué), l'écran « Passe le téléphone » arrive tout seul. Les pouvoirs et équipements restent facultatifs (« Passer »), comme le prévoit la règle.
- **D4.7 — Rythme.** Les bandeaux de cinématique durent 1,1 s (au lieu de 1,5 s) et se passent toujours d'un toucher.
- **D4.8 — Panneaux animés.** En plus de CPE, infirmerie, grands frères et sonnerie : goûter ramassé (sauf s'il fait gagner), glissade du toboggan et mot d'excuse du Délégué. Les poses, pioches et plaquages ordinaires n'en ont pas, pour garder des tours rapides.

## Étape graphique — Visuels des élèves

- **DG.1 — Direction artistique.** Après deux séries refusées (images générées « qui sentent l'IA », puis formes vectorielles « trop simples »), Clément a choisi la piste cartoon : gros trait noir un peu tremblé, aplats pastel vifs sans dégradé, corps mous et bras en spaghetti, petits yeux expressifs. Les références servent pour la manière seulement : aucun personnage ni titre n'en est repris.
- **DG.2 — Élèves dessinés d'après les références validées.** Les élèves dessinés par le code ont été refusés (« à mille lieues des refs »). Chaque rôle est maintenant une image générée à partir des trois références validées par Clément (trait noir fin, membres en nouilles, débardeur numéroté), une par bande, puis détourée (`public/skins/dessin/`). Leurs mesures (taille, main attrapée, couleur de peau) sont dans `skins/cartoon/mesures.ts`. Tous les élèves ont les pieds au même niveau : le Grand dépasse, le Petit est plus bas. Numéros : J Petit, 1 Populaire, 2 Chouchou, 3 Rapporteuse, 4 Fouine, 5 Contagieux, 6 Délégué, 7 Grand.
- **DG.3 — Valeur lisible sans les couleurs.** Le numéro du débardeur devient trop petit sur un îlot : une pastille de valeur est posée à côté de chaque élève, ronde pour la bande rouge et carrée pour la bande bleue, comme les anciens jetons.
- **DG.4 — Skins interchangeables (demande de Clément : une boutique de skins à terme).** Un skin est un jeu de visuels décrit par l'interface `Skin` (`src/game/skins/types.ts`) : l'élève debout, le dessin du pantin et les images à préparer. Le moteur de règles n'en sait rien. Deux skins existent : « Cartoon » (par défaut) et « Jetons » (l'ancien style). Le bouton « Style » de l'accueil passe de l'un à l'autre ; le choix est gardé sur le téléphone. Ajouter un skin = écrire un objet `Skin` et l'inscrire dans `skins/index.ts`. Un skin peut aussi fournir des fichiers image (`url`) au lieu de SVG. La boutique elle-même (achat, déblocage) n'est pas faite.
- **DG.5 — Pantin** (remplacé par DG.9). Le calcul du pantin (`ui/pantin.ts`) ne produit qu'un squelette ; chaque skin le dessine. En cartoon, l'image entière de l'élève pend à sa propre main gauche et se balance avec le tronc, et son bras s'étire en spaghetti jusqu'au doigt du joueur : l'élève est bien tenu par la main, jamais par le corps.
- **DG.6 — Ce qui reste au skin classique.** Les petits repères d'interface (pastilles des élèves plaqués, scores, écran « Passe le téléphone ») restent des jetons dans tous les skins : ils doivent rester lisibles en tout petit.
- **DG.7 — Décor et interface cartoon (demande de Clément : « une grosse passe UI pour la cohérence »).** Le décor de la cour est une image générée d'après les références validées (`public/decor/cour.jpg`), avec un centre dégagé pour le plateau. Toute l'interface suit le style des élèves : police ronde Fredoka (libre, embarquée), trait noir un peu tremblé, aplats pastel, ombre pleine comme un autocollant (`src/game/ui/style.ts`). Boutons, panneaux, îlots, étiquettes, cabanes, pupitre en papier de cahier, écrans de passage et de fin, cinématiques : tout passe par ces formes. Les bandes prennent les couleurs des débardeurs (corail et pervenche).
- **DG.8 — Aides pour rire après le tuto (demande de Clément).** Pendant le tuto, les aides restent didactiques. Ensuite, consignes, fiches, journal et écran de passage prennent un ton de cour de récré, avec plusieurs variantes tirées selon le tour (`src/data/textesFun.ts`). Le tuto est passé quand les conseils sont coupés, quand les deux joueurs les ont tous lus, ou après une première partie terminée ; c'est gardé sur le téléphone. Les règles (fiches des pouvoirs, page « Comment jouer ») restent sérieuses : elles servent de référence.
- **DG.9 — Élèves vivants, pantin et rang en buste (demande de Clément : « ragdolls bugués, vrai travail d'idle, tête + buste sur le banc des persos »).** Chaque élève est une « gelée » : son image découpée en tranches que l'on décale (`src/game/ui/gelee.ts`). Au repos il respire, se dandine (le haut du corps plie plus que les pieds) et, de temps en temps, fait un petit saut ou un frisson ; chacun à son rythme. Le pantin n'est plus tenu par la main (l'image montrait encore son bras pendant) : on l'attrape par le col du débardeur, comme un chaton, et le corps ballotte en pliant, le tronc et les jambes traînant derrière le doigt. Les cartes du rang montrent la tête et le débardeur seulement, qui respirent doucement. Mme Josiane est maintenant une illustration générée (`public/decor/josiane.png`), elle aussi vivante. Les zones blanches coincées entre les bras et le corps ont été enlevées des images des élèves.
- **DG.10 — Retour à la prise par la main, idle par caractère, trait net (demande de Clément).** Le pantin est de nouveau tenu par la main : le bras gauche de chaque élève est découpé à part (`<nom>-bras.png`, le reste dans `<nom>-corps.png`) et se lève jusqu'au doigt, en s'étirant comme un spaghetti pour passer au-dessus de la tête ; il passe derrière la tête. Chaque rôle a son animation d'attente (`PROFILS` dans `ui/gelee.ts`) : le Grand se balance mollement et bâille, le Petit rebondit sans arrêt, la Populaire danse et fait des pirouettes, le Chouchou se tient droit et sautille « moi ! moi ! », la Rapporteuse se penche pour cafarder et tape du pied, le Contagieux est voûté et éternue, le Délégué reste digne, hoche la tête et bombe le torse, la Fouine est tassée et regarde derrière elle ; Mme Josiane tape du pied et surveille. Sur les cartes du rang, le même caractère en plus doux. Contre le trait qui scintillait une fois réduit : les images sont des textures en puissances de 2 avec mipmaps, et les élèves sont découpés en 28 tranches (plus de marches visibles quand ils se plient).
- **DG.11 — Lisibilité mobile et écran adaptatif (demande de Clément : « lisible et responsive », référence de lisibilité d'un jeu mobile à succès ; rien n'en est repris).** Lu comme : silhouettes fortes, plateau clair, net sur tous les téléphones. (1) Le jeu est dessiné à la résolution réelle du téléphone (jusqu'à 2×, `RESOLUTION`), textes compris : plus d'image agrandie et floue. (2) Sur un écran plus allongé que 9:16, on remplit tout l'écran : le décor couvre sans être déformé, le bandeau du haut et le pupitre vont jusqu'aux bords, et la place gagnée va surtout à la cour (`DESCENTE`). Sur un écran plus large (tablette, ordinateur), bandes sur les côtés comme avant. (3) Élèves, Mme Josiane et le Banc ont un gros contour d'encre et des traits intérieurs épaissis ; les élèves sont un peu plus grands sur la cour. (4) Sous le plateau, le goudron est éclairci et uni (les traçages du terrain ne se confondent plus avec les allées) ; allées plus épaisses ; îlots au trait plus gras avec un liseré, comme de gros boutons.
- **DG.12 — Retours sur le téléphone de Clément.** (1) Plus de voile clair sur le décor de la cour (DG.11 annulé sur ce point). (2) Traits intérieurs des persos épaissis eux aussi (traits sombres élargis de 2 pixels de chaque côté, en plus du contour). (3) Écran plus court que 9:16 (navigateur intégré d'une appli, tablette) : on voit plus large sur les côtés et le décor remplit, au lieu de bandes sombres (`LARGEUR_ECRAN`, `GAUCHE`, `DROITE`). (4) Pantin : le corps pend dans le prolongement du bras et balance avec lui ; avant, il restait presque droit pendant que seul le bras bougeait. Le pli des jambes est borné.
- **DG.13 — Persos en buste sur la cour, entiers seulement en main (proposition de Clément).** Sur la cour, chaque élève posé est son buste (tête et débardeur) dans une pastille aux couleurs de sa bande (ronde pour les rouges, carrée pour les bleus), la tête dépasse en haut, sa valeur en coin (`Skin.pastille`, images `<nom>-pastille.png`). On ne le voit entier que pendant qu'on le glisse. Trait : même épaisseur partout, contour compris (plus de gros contour autocollant ; Clément : « uniforme sur l'ensemble du perso »). Pantin : le bras découpé (mal raccordé) est remplacé par un bras-nouille dessiné, au trait de la même épaisseur, qui part de l'épaule, s'arrondit vers l'extérieur et finit par une main ronde au bout du doigt.
- **DG.14 — Persos nets en grand (retour de Clément : « le perso paraît pixelisé », écran « Passe le téléphone » sur son pliant ouvert).** Trois causes corrigées : (1) les images des élèves passent en double définition (élève d'environ 900 pixels de haut au lieu de 450, détourées depuis les originaux) et le trait est épaissi en rond (flou puis seuil doux) au lieu d'un carré de pixels, d'où des bords lisses ; toutes les mesures sont doublées. (2) L'élève ne bouge plus en tranches d'image décalées (qui faisaient des escaliers sur les bras et les jambes) mais sur une bande souple (« corde » Phaser) que la texture suit sans marches. (3) Le jeu est dessiné jusqu'à 3× la résolution de base (au lieu de 2×) : sur les écrans très fins, plus d'agrandissement flou par le navigateur.
- **DG.15 — Élèves « dodus » en marionnettes articulées (validés par Clément ; « des idles sans déformations, en lien avec la personnalité »).** Les 16 élèves sont redessinés en T-pose dans le style dodu, trait uniforme épaissi ×2 (`docs` : guide de création des personnages). Chacun est découpé en 6 pièces rigides (deux jambes, deux bras avec une rotule encrée à l'épaule, tronc, tête) rangées dans une seule texture (`public/skins/dodu/<bande>-<rôle>.png`) ; leurs attaches sont dans `skins/cartoon/rig.ts`. La marionnette (`ui/marionnette.ts`) ne déforme plus l'image : elle tourne et déplace les pièces. Les idles par caractère (DG.10) sont refaits ainsi : le Grand bâille bras levés, le Petit sautille, la Populaire danse, le Chouchou lève le bras, la Rapporteuse cafarde et tape du pied, le Contagieux frissonne et éternue, le Délégué hoche la tête et bombe le torse, la Fouine regarde derrière elle. Dans le rang et les pastilles, seul le buste est visible (masque) et bouge plus doucement ; quand on l'attrape, l'élève entier pend par la main gauche, le corps penché pour que le bras tenu passe devant la tête, et retombe dans sa pastille quand on le lâche. Mme Josiane garde la gelée (DG.14). Les anciennes images (`public/skins/dessin/`, `mesures.ts`) sont supprimées.
- **DG.16 — Bras par-dessus la pastille (demande de Clément).** Sur la cour, seuls la tête, le tronc et les jambes sont coupés par la pastille ; les bras passent par-dessus son bord, on voit mieux les gestes. La découpe suit la forme de la bande : ronde pour les rouges, carrée arrondie pour les bleus (avant, le buste était coupé en rond même dans une pastille carrée).
- **DG.17 — Mme Josiane en marionnette (demande de Clément).** Elle est régénérée en T-pose dans le style dodu (une seule version, 2 crédits). L'image sortie avait un troisième bras qui tenait le bloc-notes : il est effacé et le buste refait par symétrie. Elle est découpée comme les élèves (`public/skins/dodu/josiane.png`, `RIG_JOSIANE`) ; pour elle qui n'a pas de cou, la tête emporte le menton et un cou couleur peau est peint dessous. Son idle reste celui de la surveillante (tape du pied, hoche la tête, regarde autour). L'ancienne animation « gelée » n'a plus d'utilisateur : `ui/gelee.ts` et l'ancienne image sont supprimés.
- **DG.18 — Même trait pour tous, coudes pour Josiane (retours de Clément).** Le trait est ramené à la même épaisseur dans toutes les textures (8,6 pixels) : le Grand, qui paraissait plus épais, est affiné d'un pixel de chaque côté sur l'original, le Petit épaissi de deux. Mme Josiane a des coudes : chaque bras a un avant-bras à part (`extras` du rig), replié devant elle, et elle serre contre sa poitrine un cahier (une planchette dessinée au même trait).
- **DG.19 — Images toujours à jour et Banc net (retours de Clément).** Les images du jeu sont chargées avec le numéro de version dans leur adresse : un téléphone ne peut plus garder une ancienne texture en cache alors que ses attaches ont changé (c'est ce qui cassait Josiane et cachait le nouveau trait). L'illustration du Banc est refaite en double définition depuis l'original, détourée proprement (les carrés du vieil épaississement disparaissent).
- **DG.20 — Une vraie routine de surveillante pour Josiane (Clément : idle « trop basique »).** Elle balaie la cour du regard en continu et enchaîne, toutes les 1 à 4 secondes, des gestes qui utilisent ses coudes : noter dans son cahier (elle le lève, baisse la tête, griffonne), scruter la cour penchée d'un côté puis de l'autre, gronder de l'index levé en secouant la tête, pointer un coupable bras tendu, s'indigner (se redresse, tête en arrière) et taper du pied.

## Phase 1 de la v1 — Le feedback (audit du 26/11)

- **DF.1 — Aperçu au survol.** Pendant le glisser, l'îlot visé montre ce que ferait le coup, calculé en le jouant sur une copie de l'état (`src/game/apercu.ts`) : « Populaire plaquée ! » au-dessus de l'adversaire, le chemin à la craie qui s'allongerait en pointillés de la couleur de la bande, les goûters qui seraient ramassés (anneau jaune et « +2 »), « Victoire ! » si le coup fait gagner.
- **DF.2 — Trois temps pour chaque arrivée.** Annonce (l'élève apparaît au-dessus de l'îlot et se ramasse), action (chute sèche), conséquence (écrasement élastique). Un plaquage ajoute un arrêt sur image de 70 ms, « BOUM ! », un nuage de poussière, des étoiles, et le badge de l'adversaire qui s'aplatit puis glisse dans la pile.
- **DF.3 — Les conséquences se suivent sur la cour** (`src/game/sequence.ts`) : après l'arrivée, chaque effet se joue à son tour, à 320 ms d'écart. L'adversaire dénoncé vole jusqu'au bureau de la CPE, le goûter vole jusqu'au cartable, Mme Josiane marche à petits pas jusqu'à son nouveau goûter (« Tuuut ! »), l'éternuement part en nuage vert vers le portail adverse, les copains appelés sortent du portail et courent au rang. Les panneaux des moments marquants (D4.8) attendent la fin de cette mise en scène, et l'écran « Passe le téléphone » arrive ensuite.
- **DF.4 — Des lieux à la place des compteurs.** Chaque bande a, de part et d'autre de sa cabane, son **portail** (le couloir : grille, têtes des copains, « ×17 ») et son **bureau de la CPE** (porte vitrée, badges des punis). Les enrhumés sont un mouchoir à croix rouge au coin du portail. Toucher un lieu ouvre sa fiche. La ligne « Couloir : 16 · CPE : 0 » disparaît.
- **DF.5 — Bandeau du haut.** Les scores deviennent deux **cartables** dont les cases (une par goûter à ramasser, 3 sur la cour n°1) se remplissent de biscuits ; « Objectif : 3 goûters » disparaît. Au centre, une **pendule d'école** (choix de Clément : horloge seule, règle de la sonnerie inchangée) : 10 h au départ, 5 minutes de plus à chaque tour, l'aiguille avance d'un coup sec. Le bouton « ? » passe à côté d'elle. Le journal ne garde que les 2 dernières lignes.
- **DF.6 — Correctif.** Une animation d'élève dont l'image avait été effacée faisait planter la boucle du jeu (`Cannot read properties of null`), ce qui pouvait figer l'écran. La « gelée » s'arrête maintenant d'elle-même quand son image disparaît.
- **DF.7 — Les pouvoirs se jouent sur la cour.** Plus de boutons « Piocher », « Éternuer », « Mot d'excuse » ou de noms de rôles : une flèche en pointillés jaunes part de l'élève vers sa cible, qui clignote avec un verbe sur une étiquette. Populaire et cabane perchée : son propre portail (« Appeler ! ») ; Contagieux : le portail d'en face (« Atchoum ! ») ; Délégué : Mme Josiane (« Mot d'excuse ! ») ; porte de la vie scolaire : les punis sortent du bureau de la CPE en badges à toucher (« Récupérer qui ? »). Les consignes disent quoi toucher.
- **DF.8 — « Passer » presque partout supprimé (demande de Clément : « très peu de cas où le bouton Passer est pertinent, à part pour rappeler un joueur de son propre camp »).** Le bouton ne reste que pour le banc. Ailleurs, le pouvoir se joue forcément en touchant une de ses cibles : il y en a toujours au moins une, sinon le moteur ne demande rien (D1.2). Filet de sécurité : sans surveillante à toucher, le mot d'excuse garde « Passer ». Le moteur ne change pas (D1.5 reste vrai en règle, l'écran ne le propose plus).
- **DF.9 — Le mot d'excuse se passe aussi (demande de Clément).** Le Délégué garde le bouton « Passer », comme le banc : éloigner Mme Josiane n'arrange pas toujours.
- **DF.10 — Plus de zone de notes en bas de l'écran (demande de Clément : « laisser en permanence les joueurs dispos et faire poser une info-bulle »).** Le journal sous la cour disparaît. Le rang reste toujours affiché, y compris pendant un choix de pouvoir (il ne se glisse pas alors) et pendant la fin de tour. Les fiches (élève, îlot, goûter, portail, CPE, Mme Josiane) s'ouvrent en bulle pointée sur ce qu'elles décrivent ; toucher ailleurs les ferme. La consigne d'un pouvoir est une bulle jaune au-dessus de l'îlot qui le déclenche.
- **DF.11 — Résumé du tour d'avant.** Ce que racontait le journal passe sur l'écran « Passe le téléphone » : « Au tour d'avant : » suivi des trois dernières phrases du coup adverse.
- **DF.12 — Les arrivées dans le rang se voient (demande de Clément : « voir les cartes des deux copains sortir de la prison et se rajouter aux nôtres »).** Chaque nouvelle carte du rang vole jusqu'à sa place : depuis le portail pour les copains appelés (Appeler, Populaire), depuis l'îlot pour un élève rappelé (banc), depuis le bureau de la CPE pour un élève repêché. Elles partent après l'arrivée de l'élève qui les a déclenchées. Les petites têtes qui volaient vers le rang sont supprimées.
- **DF.13 — Le banc devient une planque, un de chaque côté (choix de Clément : « la planque », « un banc de chaque côté »).** Reprendre un de ses élèves était presque inutile sur une petite cour. Désormais, un élève assis sur un banc ne peut pas être recouvert par un adversaire (Petit de maternelle compris), ni envoyé à la CPE (Rapporteuse, buts), ni déplacé (toboggan) ; personne ne peut non plus glisser un élève par-dessus. On peut toujours se poser sur son propre élève planqué. Le banc ne déclenche plus aucun choix. Cour n°1 : les bancs sont sur les îlots de gauche et de droite (M1, M3), à égale distance des deux cabanes ; le centre (M2) redevient un îlot ordinaire. Un banc occupé affiche « ★ Planqué ! ».
- **DF.14 — Plus de feuille de cahier en bas (demande de Clément).** Le rang et le bouton « Appeler » sont posés directement sur le décor ; les petits textes ont un liseré clair pour rester lisibles. La phrase « Un volontaire pour la cour ? » disparaît, et la cour descend un peu.
- **DF.15 — « Le grand frère » au singulier (remarque de Clément : « on dit les grands frères arrivent alors qu'on ne peut appeler qu'un personnage supplémentaire »).** Le Chouchou appelle un seul renfort : la fiche, la consigne et le panneau disent « son grand frère », « Le grand frère arrive ! », et le panneau ne montre plus qu'une silhouette.
- **DF.16 — La cour rééquilibrée vers le bas (remarque de Clément : « beaucoup de choses en haut et presque rien en bas »).** Le plan de la cour n°1 est étiré vers le bas : cabane rouge de 0,82 à 0,88 ; rangées d'îlots à 0,25, 0,475 et 0,69 (au lieu de 0,22, 0,44 et 0,66) ; cabane bleue de 0,06 à 0,05. Le bouton d'appel descend de 12 px. La cour occupe maintenant l'espace libre au-dessus du bouton au lieu de laisser un vide sous la cabane rouge. Les allées et les règles ne changent pas.
- **DF.17 — Fiche de la cour au lancement (demande de Clément : « une petite fiche qui donne le contexte, la règle spéciale et explique la map ; plus tard, l'occasion d'attendre l'arrivée d'un concurrent » ; puis « l'UX/UI est à revoir » sur la première version, une carte réduite avec une liste de texte).** Avant le premier « Passe le téléphone », la vraie cour reste affichée et se légende elle-même : quatre bulles apparaissent l'une après l'autre, sur la cabane d'en face, un goûter, un banc et Mme Josiane. Un bandeau en haut donne le nom de la cour et une phrase de contexte. Un volet jaune en bas porte la règle spéciale et le bouton « C'est parti ! ». Les textes de chaque cour sont dans `TEXTES.presentation.cours`, rangés par identifiant de cour, et les bulles se placent d'après les données de la cour. Pour le jeu en ligne, le drapeau `attenteAdversaire` remplace déjà le bouton par « On attend un adversaire… », mais il n'est pas encore branché. Retouches demandées par Clément (« la cabane du haut est coupée », « la tête de Mme Josiane est cachée ») : pendant la fiche, la cour est centrée, et réduite si besoin, entre le bandeau et le volet. Le bandeau du jeu est masqué. Aucune bulle ne cache plus ce qu'elle montre : celle de la cabane se place dessous, et celle de Mme Josiane au-dessus de sa tête, décalée vers le bord.

## Phase 2 de la v1 — Image et son

- **DF.18 — Plateau illustré dans le style dodu (phase 2, demande de Clément : « décor de la cour et phase 2 de l'audit » ; inquiétude : « que ces nouveaux décors surchargent la map »).** Les îlots, l'îlot spécial, les deux cabanes, le portail et le bureau de la CPE sont maintenant des images générées dans le même trait que les élèves (planche Higgsfield en 3/4, job e0f020f3), découpées et posées dans `public/plateau/` (512×512, puissances de 2). La pancarte « OFFICE » de la porte de la CPE a été effacée. Une pastille rond/carré reste sur chaque cabane pour reconnaître la bande. Si une image manque, le dessin en code d'avant reprend sa place. Le décor du fond ne change pas : la version avec un local à vélos en bas chargeait la zone du rang et du bouton, elle est gardée de côté.
- **DF.19 — Retouches du plateau illustré (remarques de Clément : « redescendre un peu l'ensemble pour ne pas couper la maison », « attention aux superpositions entre les îlots et l'évier et la basket »).** La cour descend de 40 px et se resserre d'autant (la cabane du haut ne passe plus sous le bandeau). Les cabanes sont un peu plus petites et le bouton d'appel descend de 12 px pour que la cabane du bas ne le touche plus. L'évier et la basket sont effacés du décor : ils tombaient sous les bancs quel que soit le format d'écran.
- **DF.20 — Portail, CPE, fenêtres et basket (demandes de Clément : « revoir l'illu CPE et portail », « plutôt qu'un picto carré et rond sur les cabanes, adapter la forme de leur fenêtre », « j'aimais bien qu'il y ait des éléments décoratifs comme la basket, il faut juste éviter la superposition avec les îlots »).** Nouveau portail (grille verte entre deux piliers de pierre) et nouveau bureau de la CPE (guérite crème à toit bleu, pancarte « CPE »), générés sur une planche dédiée (job f3f3aef7) et un peu plus grands dans leur panneau. Les pastilles rond/carré des cabanes disparaissent : la cabane rouge a une fenêtre ronde, la bleue garde sa fenêtre carrée. La basket revient comme objet posé sur la cour (`OBJETS_COUR`), placé en coordonnées de cour sous le banc de droite, hors des allées, pour ne jamais chevaucher un îlot quel que soit l'écran.
- **DF.21 — Goûters illustrés (demande de Clément : « complexifie un peu les pictogrammes récompense pour les lier à la DA »).** Les quatre goûters de la cour et le grand goûter du panneau « ramassé » sont des images (`public/gouters/`, jobs b52e2b7d et 7bbe3057), au trait du plateau, avec les silhouettes et couleurs des vidéos de récompense validées : tablette de chocolat dans son alu, deux cookies dorés, bonbon rayé blanc et rose à papillotes rose vif, sucette orange à spirale caramel. Le dessin en code reste en secours.
- **DF.22 — Des objets qui traînent dans la cour (remarque de Clément : « la basket seule n'est-elle pas étrange ? », « plutôt des objets qui traînent dans la cour »).** En plus de la basket, un ballon, des craies, un avion en papier et un bonnet sont semés dans les zones libres (planche job 679cae0f). Chacun est placé en coordonnées de cour, loin des îlots, des allées, des goûters et des panneaux. Le cartable et la corde à sauter de la planche sont gardés pour d'autres cours : ils n'avaient pas de place libre sur la cour n°1.
- **DF.23 — Plus d'objets posés sur la cour (demande de Clément : « supprimer tous ces pictos secondaires, on dirait qu'ils portent un rôle »).** La basket, le ballon, les craies, l'avion et le bonnet de DF.20 et DF.22 sont retirés : sur un plateau de jeu, un objet détouré se lit comme une pièce. Le décor ne garde que ce qui est peint dans l'image du fond (craies au sol, marelle, escargot). L'évier reste effacé.
- **DF.24 — Plus de « Touche un élève » au-dessus du rang (demande de Clément : « ce sera expliqué dans le tuto »).** La phrase disparaît de l'écran de jeu ; les textes restent dans `TEXTES.hud.toucherCarte` et `FUN.hud.toucherCarte` pour le futur tuto.
- **DF.25 — Les élèves ne clignotent plus (remarque de Clément : « les personnages clignotent pendant le jeu »).** À chaque coup, l'écran est redessiné et les pastilles et bustes sont recréés. Leur masque (qui coupe le corps au bord de la pastille ou de la carte) était recalé au moment de la création, quand l'élève n'avait pas encore sa place : pendant une image, le corps disparaissait et seuls les bras restaient. Le masque est maintenant recalé juste avant chaque rendu. Le jeu contre l'ordi (PR #8) rendait le défaut plus fréquent, puisque chaque action de l'ordi redessine l'écran. En plus, chaque redessin donnait à chaque élève une nouvelle phase d'animation tirée au hasard, d'où un petit sursaut de pose : la phase dépend maintenant du personnage et reste la même d'un redessin à l'autre.
- **DF.26 — La victoire attend que la surveillante ait fini de marcher (remarque de Clément : « il aurait fallu lui laisser le temps de bouger avant de valider la victoire »).** La règle ne change pas (D2.18) : à la fin d'un tour complet elle quitte son goûter, puis un goûter déjà entouré est ramassé, et la partie se finit si le seuil est atteint. Mais l'écran de fin s'affichait tout de suite, par-dessus la cour, alors qu'elle était encore dessinée sur le goûter. Désormais la mise en scène suit l'ordre de la règle : elle marche jusqu'au bout, puis le goûter s'envole au cartable, puis vient la victoire, et l'écran de fin n'apparaît qu'une fois tout cela vu.
- **DF.27 — Mme Josiane suit sa ronde quand on la chasse (remarque de Clément : « le déplacement de la surveillante lorsqu'elle est chassée d'une case bug »).** Avec le Mot d'excuse du Délégué, sa marche partait vers sa place finale du coup, et non vers le goûter où le Délégué l'envoie. Quand le pas de fin de tour suivait dans le même coup, elle revenait d'un bond en arrière pour refaire le chemin. Et quand elle avançait de 2 goûters, elle coupait la cour en diagonale. Désormais chaque marche part de là où la précédente s'arrête. Elle longe les goûters de sa ronde au lieu de couper la cour, s'arrête un instant sur chaque goûter d'arrivée, et son étiquette marche avec elle. Tant que ses marches ne sont pas finies, elle reste dessinée sur le goûter qu'elle quitte.
- **DF.28 — Le rang de l'adversaire est visible (demande de Clément : « je veux voir le nombre de personnes dans la main de mon adversaire »).** À côté de la cabane d'en face, entre la cabane et le bureau de la CPE, un petit éventail de cartes vues de dos, à la couleur de sa bande, avec leur nombre (« ×5 »). On voit combien d'élèves l'adversaire a en main, jamais lesquels. Le toucher ouvre une fiche qui le dit. « En face », c'est la bande dont le rang n'est pas affiché en bas de l'écran : l'ordi en solo, l'autre joueur à deux.
- **DF.29 — Clignotement sur Android (remarque de Clément après DF.25 : « tout, partout, Android »).** Les élèves clignotaient en entier, partout, sur son téléphone Android, mais pas dans un navigateur d'ordinateur. Cause la plus probable : le shader « multi-textures » de Phaser, qui choisit la texture de chaque image dans un lot. Certains processeurs graphiques de téléphone se trompent sur ce choix, et chaque élève a sa propre texture. Le jeu dessine maintenant avec une seule texture par lot (`maxTextures: 1`) : un peu plus d'appels de dessin, sans effet visible sur un jeu de cette taille. Pour tester un téléphone, l'adresse accepte `?textures=16` (ancien réglage) et `?rendu=canvas` (sans WebGL).
- **DF.30 — Accueil rangé (demande de Clément : « fais un coup de propre en UX/UI sur la page d'accueil »).** Sept boutons de même taille s'empilaient, le sous-titre mordait la casquette du Grand et la règle, en paragraphe, collait aux boutons. Désormais, de haut en bas : la pancarte du titre avec son sous-titre en bandeau ; le Grand et le Petit, le Petit disant le but du jeu dans une bulle ; un seul gros bouton jaune « Jouer contre l'ordi » (le mode qu'on lance seul, d'où sa place en premier), son niveau en trois pastilles juste dessous (la choisie en vert) au lieu d'un bouton qui fait défiler ; « Jouer à deux » en bleu pervenche, plus petit ; puis les réglages en cases à cocher (Équipements, Conseils, Sons) et le bouton Style. Les réglages et le niveau restent gardés sur le téléphone comme avant.
- **DF.31 — Le Grand et le Petit jouent la comédie sur l'accueil (demande de Clément : « retravaille fortement les animations des 2 personnages de la home, le jeu ne doit pas paraître cheap dès l'accueil »).** Avant, les deux élèves se dandinaient avec une simple rotation de l'image entière. Désormais (`ui/duoAccueil.ts`), ce sont leurs marionnettes articulées qui jouent, membre par membre, sans jamais déformer le dessin. La pancarte du titre tombe et rebondit ; le Grand entre en marchant, le Petit en courant puis d'un salto, « Tadaa ! ». Ensuite, en boucle, quatre sketchs muets séparés de pauses où le Petit dit le but du jeu dans sa bulle (qui sort de sa tête et y rentre) : les trois sauts du Petit pour être aussi grand (le Grand applaudit), le « check » dans la main avec un « Paf ! » et une secousse, la chute du Petit qui frime (étoiles qui tournent, le Grand se tord de rire), et le copieur (le Petit imite les poses du Grand et finit en vrille). Poussière à chaque atterrissage, ombres qui rétrécissent pendant les sauts. Touchés, le Grand sursaute (« ! ») et le Petit fait un salto. Le skin a une nouvelle méthode `acteur` (l'élève entier piloté par l'appelant) ; le skin Jetons y répond par un jeton qui saute et penche. L'horloge de la mise en scène avance d'au plus 1/20 s par image, pour que l'entrée ne soit pas sautée si le téléphone rame au démarrage.
- **DF.32 — Portail et CPE posés en grand sur la cour (remarque de Clément : « le picto portail et CPE ne sont toujours pas efficaces »).** Les illustrations étaient réduites à 40 px dans une carte de papier : illisibles. La carte disparaît ; le portail (grille et piliers) et la guérite de la CPE sont posés en grand de part et d'autre de chaque cabane, avec leur étiquette au-dessus et une pastille de nombre (« ×15 », « 0 ») au pied. Les punis s'assoient en badges devant la guérite (les 3 derniers). Le mouchoir des enrhumés reste au coin du portail. Sans image, l'ancienne carte dessinée revient.
- **DF.33 — Trois nouveaux bruitages.** « Tuuut ! » quand Mme Josiane change de goûter, le tic de la pendule quand l'aiguille avance, et un petit son quand l'écran « Passe le téléphone » arrive (partie à deux seulement). Bips provisoires en attendant les fichiers choisis par Clément.
- **DF.34 — La pioche et le coin remplacent le portail et la CPE (remarque de Clément : « c'est la notion même de portail d'école et de bureau administratif qu'on ne comprend pas » ; choix : « paquet de cartes + au coin »).** La réserve de copains est une pioche de cartes face cachée à la couleur de la bande, comme les cartes du rang, avec « ×15 » ; le paquet maigrit quand il se vide, et une pioche vide n'est plus qu'un emplacement en pointillés. Les élèves éliminés vont « au coin », face au mur avec un bonnet d'âne ; leurs badges s'y alignent. Tous les textes suivent (« touche ta pioche », « part au coin », « fait sortir un élève du coin », panneau « Au coin ! »). Les règles ne changent pas, ni les noms internes (`couloir`, `cpe`). Le coin est illustré (job cd7b5304 : coin de mur, bonnet d’âne, tabouret), aussi dans le panneau « Au coin ! » ; les images du portail et de la guérite sont retirées.

## DF.35 — Le coin = un bonnet d'âne seul (27/11)

Clément : « Et le bonnet d'âne tout seul ? ». L'illustration du coin de mur (DF.34) ne se lisait pas à la taille du lieu. Le coin est maintenant un bonnet d'âne dessiné en code (cône crème, bandeau bleu, pompon jaune, oreilles d'âne pour qu'on reconnaisse l'objet), avec les 3 derniers punis empilés à sa gauche et leur nombre. Même bonnet, en grand, dans la cinématique « Au coin ! ». `public/plateau/coin.png` est retiré.

Mise à jour : Clément ne reconnaissait pas le bonnet dessiné en code (« On ne reconnaît pas le bonnet d'âne. Généré le ? »). Bonnet illustré généré (Higgsfield, 2 versions, 4 cr., `lot6/`), version B retenue par défaut (« ÂNE » à l'horizontale, plus lisible en petit) : `public/plateau/bonnet.png`, clé `PLATEAU.bonnet`. Le dessin en code reste en secours si l'image manque.

## DF.36 — La punition = un carton rouge (27/11)

Le bonnet d'âne, dessiné puis illustré, ne se reconnaissait pas (« Ça ne fonctionne pas »). Clément a fait générer 10 idées de punition (`lot7/planche-punitions.jpg` : heure de colle, lignes, carton rouge, confisqués, chaise, tableau, corvée, sablier, piquet, mot aux parents, plus 2 carnets de correspondance) et a choisi le **carton rouge** (job 1905e5c9). Châtiments corporels (règle sur les doigts, fessée) écartés : ton du jeu et classement d'âge.

- Image : `public/plateau/carton.png`, clé `PLATEAU.carton` ; le bonnet d'âne dessiné en code reste en secours. `bonnet.png` est retiré.
- Vocabulaire affiché : « Au coin » → « Carton rouge » (lieu, fiche « Cartons rouges », annonce « Carton rouge ! », consignes « prend un carton rouge », « faire revenir un élève exclu »). Nom interne `cpe` inchangé.

Mise à jour (Clément : « Garde le texte punis non ? ») : l'image reste le carton rouge, mais les mots reviennent à « punis » : lieu « Punis », fiche « Les punis », annonce « Puni ! », consignes « est puni », « à punir », « faire revenir un élève puni ».

## DF.37 — Boîte à goûter simplifiée (27/11)

Clément : « Tu peux simplifier le picto de la boîte à goûter ou le rendre plus explicite ». Le cartable (poignée + rabat blanc + cases vides) devient une simple boîte à la couleur de la bande. Case vide = biscuit pâle en pointillé (« à ramasser »), case pleine = vrai biscuit sur fond jaune. Les biscuits illustrés (DF.21) sont collés sur le côté extérieur de la boîte pour dire tout de suite ce qu'on y range. Formes rondes (rouge) / carrées (bleu) gardées pour les daltoniens.

Mise à jour : Clément trouve la boîte à cases « pas clair ». Remplacée par une pastille à la couleur de la bande avec les biscuits illustrés et le score écrit en gros (« 2 / 3 »). Les goûters ramassés volent jusqu'au biscuit.

## DF.38 — Incrustations : mégaphone, réveil, nuage de bagarre (27/11)

Clément : appeler les copains, la sonnerie de fin et le plaquage ne doivent pas être des vidéos plein écran mais des animations courtes et dynamiques, incrustées par-dessus le jeu. Trois animations sans élève (pour servir aux deux bandes et à tous les skins), générées sur fond vert (Higgsfield, jobs ed9f8d09 mégaphone, f4bec7b2 réveil, 4e6ce0cd nuage), accélérées à ≈ 1,3–1,6 s et détourées. Clément a écarté la cloche en laiton murale (« trop vieillot ») au profit du réveil. Elles sont jouées en planches de sprites WebP (`public/incrust/`, 256 px, 15 images/s) et non en vidéo, car la vidéo WebM transparente ne marche pas sur Safari iOS. Le mégaphone s'affiche au-dessus de la pioche de la bande qui appelle, le nuage sur l'îlot du plaquage, le réveil à la place du pictogramme dans le panneau « Sonnerie ». Les sons restent ceux du jeu (`jouerSon`). Code : `src/game/ui/incrust.ts`.

## Bêta — Deux nouvelles cartes et deux nouvelles équipes

Proposition validée par Clément le 27/11 : doc « La Cour des Grands : cartes et équipes de la bêta ».

- **DB.1 — Une équipe est un look, pas une règle (choix de Clément : « on garde les mêmes règles »).** Les nouvelles équipes ont les mêmes 8 rôles, valeurs et pouvoirs que les Rouges et les Bleus. Le moteur continue de parler de deux camps (`rouge` = en bas, `bleu` = en haut) ; l'équipe choisie ne changera que l'affichage, par les skins.
- **DB.2 — Camp scout : sentiers à sens unique.** Même plan que la cour du premier jour, sans bancs. La tyrolienne (A1 → M1 → B1) ne fait que descendre, l'échelle de corde (B2 → M3 → A2) ne fait que monter : chaque camp a un raccourci de son côté, plan symétrique par rotation. Le sens unique ne joue que sur la connexion à la cabane (où l'on peut poser) ; les pouvoirs qui comptent des voisins ou des distances (Rapporteuse, buts, toboggan) les comptent toujours dans les deux sens (D1.10).
- **DB.3 — Piscine : le courant.** À la fin de chaque tour complet, après le pas du surveillant, les piles des 4 flotteurs (F1 → F2 → F3 → F4 → F1) avancent d'un cran, dans le sens des aiguilles d'une montre. Les places restent fixes, ce sont les piles qui bougent. Les régions sont ensuite vérifiées, comme après tout déplacement (D1.7). Objectif 4 glaces (grand bain 3, chaque bord 1) ; le maître-nageur garde tour à tour le bord du haut, le grand bain, le bord du bas, le grand bain.
- **DB.4 — Équilibre mesuré (arène, IA moyen contre moyen, 300 parties, graine 3).** Cour du premier jour : rouges 48,3 %, premier joueur 50,3 %. Piscine : rouges 50,3 %, premier joueur 49,7 %, victoire aux glaces 86 %. Camp scout : rouges 49,7 %, premier joueur 48,3 %, victoire à la tente 55 %.

### DB.5 — La carte et les bandes se choisissent avant la partie

- Après « Jouer contre l'ordi » ou « Jouer à deux », un écran demande la carte (récré, piscine, camp scout) puis la bande. Contre l'ordi, le joueur prend la bande du bas et l'ordi une autre au hasard ; à deux, le joueur du bas choisit, puis celui du haut (une bande déjà prise est grisée).
- Chaque carte a son décor, ses îlots illustrés (clé `decor` du plan), sa cabane (vestiaire, tente) et son surveillant (Monsieur Yvon le maître-nageur, Babette la cheftaine). Les textes qui parlaient de « Mme Josiane » / « la surveillante » lisent maintenant la carte en cours (`src/data/cartes.ts`).
- Cabanes neutres : les murs (calque `-murs` en gris clair) sont teintés à la couleur de l'équipe. Le rond ou le carré de la bande reste dessiné sur la cabane, pour lire sans les couleurs.
- Les goûters restent des goûters sur les trois cartes (le texte de la piscine ne parle pas de glaces) : à illustrer par carte plus tard si Clément le souhaite.
- Piscine : la planche de pièces n'a pas de frite ; F1 devient « Le beignet » (la bouée rose). Les îlots du bord (douches, plongeoir, échelle, bord) tombent sur le bord du grand bain dans le décor : à revoir si ça gêne.
- Sentiers à sens unique : trois chevrons jaunes au milieu du sentier, dans le sens où l'on passe. Courant : tourbillon de flèches et « GLOUGLOU ! » autour du grand bain.
- Populaire alien refaite fine avec une grosse coiffure (la ronde détonnait à côté des autres).

### DB.6 — Le tourbillon du courant ne reste plus à l'écran

- Bug (capture Android de Clément, 27/11) : les flèches du courant restaient affichées par-dessus l'écran de fin. Le tourbillon était dessiné hors du calque du plateau ; quand l'écran se redessinait avant la fin de son animation (fin de tour, victoire), ses tweens étaient arrêtés et il n'était jamais détruit. Il pouvait donc aussi rester planté sur le grand bain pendant la partie.
- Il est maintenant dans le calque du plateau (effacé à chaque redessin), et le coup compte sa durée (1 s) avant de passer à la suite.
- Score de fin : le nom de l'équipe sans « Les » (« Goûters : Rouges 4, Vers de terre 1 ») au lieu de l'adjectif court (« ver 1, rouge 4 »).

### DB.7 — Le nuage du plaquage ne reste plus figé

- Bug (capture Android de Clément, 27/11, écran « DRIIIING ! ») : le nuage de bagarre du plaquage restait figé sur sa dernière image, par-dessus un élève et le texte de fin. Même cause que DB.6 : les incrustations (DF.39) sont posées hors du calque du plateau ; quand l'écran se redessinait avant la fin de leur animation (fin de tour à 0,9 s, victoire), leurs tweens étaient arrêtés et elles n'étaient jamais détruites. Le mégaphone des copains avait le même défaut.
- Redessiner l'écran efface maintenant les incrustations en cours, et chacune est détruite d'office 1,6 s après son départ.
- Un coup avec plaquage compte 1,8 s (chute + nuage), et l'appel des copains 1,45 s, avant de passer à la suite : on voit le nuage finir au lieu de le couper.

### DB.8 — Les vers de terre d'un seul morceau (27/11)

- Clément : « L'anim des vers est pauvre et on sent la découpe. » Un ver n'a ni bras ni jambes : découpé en trois pièces rigides (tête, chasuble, queue), il ne faisait que pivoter aux jointures, qui se voyaient.
- Le ver n'est plus découpé : son dessin entier (`public/skins/dodu/vers-<rôle>-corps.png`, trait égalisé comme les autres, `scripts/ver-entier.py`) est plaqué sur une colonne souple de 32 points (`ui/ver.ts`, une `Rope` de Phaser). Il se plie, ondule, s'étire et s'écrase (son volume est gardé : étiré, il s'amincit) ; la queue enroulée reste posée au sol.
- Gestes propres aux vers, selon le caractère : le Petit rebondit comme un ressort (« boing »), le Grand s'étire en bâillant, la Populaire danse en vagues, le Chouchou se dresse (« moi ! »), la Rapporteuse se penche pour cafarder, le Contagieux gonfle (une bosse remonte jusqu'à la tête) puis éternue, le Délégué bombe la chasuble, la Fouine se faufile en S.
- Tenu par la tête, le ver pend sous le doigt et sa queue traîne en se tortillant. En rendu Canvas (`?rendu=canvas`), pas de déformation possible : le ver penche et s'étire d'un bloc.
- Les attaches de `rigEquipes.ts` servent encore aux mesures (haut de la tête, bas de la chasuble) ; les anciennes planches de pièces des vers sont supprimées.

## DF.39 — Incrustations en 2D, animées en code (27/11)

Clément : « Les pictos animés qui arrivent dans le jeu doivent être en 2D. Réserver le réalisme aux actions plein écran. » Les trois incrustations de DF.38 (mégaphone, réveil, nuage de bagarre) sont redessinées dans le style du plateau (trait noir épais, aplats pastel ; Higgsfield nano_banana_2, référence plateau e0f020f3 : jobs 3eabd17f mégaphone, 4a92c4ea réveil, 532837d7 nuage), détourées, en PNG 512 px dans `public/incrust/`. Tout le mouvement est fait en code dans `src/game/ui/incrust.ts` : le mégaphone gonfle, recule et lance trois ondes ; le réveil sautille et se tortille avec des traits de vibration ; le nuage roule, crache cinq étoiles puis éclate. Les planches de sprites réalistes sont retirées.

## Vidéos de pouvoir

- **DV.1 — Première vidéo de pouvoir : l'éternuement du Contagieux (choix de Clément : « solo 1 »).** Quand le Contagieux envoie un adversaire à l'infirmerie, une vidéo de 4 s plein écran remplace le panneau : gros plan de plus en plus serré, le nez gonfle, « ATCHOUM » dans l'objectif, écran vert. « Atchoum ! » et la phrase du panneau s'affichent par-dessus à la fin ; toucher passe la vidéo. L'élève est **toujours seul** dans une vidéo de pouvoir (règle de Clément) : la victime, c'est la caméra, donc une vidéo sert contre n'importe quel adversaire et n'importe quel skin. Les vidéos appartiennent au skin (`Skin.videoPouvoir`, fichiers `public/videos/<skin>/`) ; le skin « Jetons » n'en a pas et garde le panneau. Sans réseau ou si le navigateur refuse la vidéo (rien après 2,5 s, ou erreur), le panneau habituel prend le relais. Son coupé si les sons du jeu sont coupés ; si le navigateur refuse le son, la vidéo passe en muet. Une seule version (débardeur rouge) pour les deux bandes en attendant une version bleue. Les vidéos du skin sont téléchargées en fond dès le chargement.
- **DV.2 — Toutes les vidéos validées branchées (Clément : « Intégré toutes les videos », 27/11).** Chaque vidéo remplace le panneau de son moment, avec le même titre par-dessus à la fin et le même repli sur le panneau si la vidéo ne démarre pas :
  - Chouchou (talkie) → l'arrivée des grands frères ; Délégué (mot d'excuse) → la surveillante déplacée ; Rapporteuse → la mise aux punis **seulement quand c'est la Rapporteuse qui l'a provoquée** (les autres mises aux punis gardent le carton rouge) ; Contagieux → l'infirmerie (inchangé).
  - Deux moments nouveaux, **seulement en vidéo** (sans vidéo, comme avec le skin « Jetons », rien ne s'affiche pour ne pas ralentir les tours) : le Petit qui plaque un élève (« Prise de catch ! ») et la Fouine posée sur un îlot qui n'était pas relié à sa bande avant le coup (« Par les buissons ! »). Interprétation : c'est le moment où son pouvoir change vraiment la partie ; une Fouine posée normalement n'a pas de vidéo.
  - Goûters : les 4 vidéos carrées sur fond crème (chocolat, biscuits, bonbon, sucette, dans l'ordre des régions) remplacent le panneau « Miam ! ». Montrées entières sur un fond crème, pas en plein écran recadré. `Skin.videoGouter(index)`.
  - Pas encore : le Populaire (pas validé) ; le Contagieux reste dans l'ancien style ; les 3 animations sur fond vert (copains, sonnerie, plaquage) sont des incrustations (DF.38).
- **DV.3 — Goûters sur fond manga animé (Clément : « un fond dynamique en mode manga en motion design », puis « Fond en code, gratuit », 27/11).** Le fond crème prolongé est remplacé par un fond dessiné en code (`ui/fondManga.ts`) : éclats qui tournent à la couleur de la bande qui ramasse, trame de points, lignes de vitesse qui scintillent vers le centre. La vidéo carrée du goûter est posée dans une case de manga (bord blanc + encre, penchée), qui arrive d'un coup. Rien n'est généré, et le même fond sert pour toutes les cartes. À étendre aux vidéos de pouvoir seulement si Clément le demande (il faudrait détourer les élèves ou refaire les vidéos).
- **DV.4 — Fond manga « éclairs » derrière les élèves (Clément : « Je valide comme ça », 27/11).** Pour les vidéos de pouvoir, le décor réel est remplacé par des diagonales nettes brisées comme des éclairs, redessinées par à-coups (12 fois par seconde), sur la couleur de l'équipe. Fait au montage, sans rien générer : la Fouine (tournée sur fond bleu) est détourée par couleur ; Chouchou, Rapporteuse, Délégué et Petit sont détourés automatiquement (rembg isnet). Chacun a son angle et son tirage d'éclairs (« une petite variation », Clément). Fichiers `<rôle>-rouge.mp4`. Le Contagieux (ancien style, final en plein écran vert) garde sa vidéo. Les goûters gardent le fond « zoom » (DV.3), qui prend maintenant la couleur de l'équipe qui ramasse, y compris les Vers et les Aliens. Depuis l'arrivée des équipes (DB.5), les vidéos de pouvoir montrent des élèves en débardeur rouge, donc elles ne passent que pour l'équipe des Rouges. Les autres équipes gardent le panneau en attendant leurs vidéos.
- **DV.5 — Les Bleus ont leurs vidéos de pouvoir, sans rien générer (Clément : « Ne peut-on pas juste retoucher la couleur de leur chasuble sur les vidéos existantes ? », 27/11).** Chouchou, Rapporteuse, Fouine, Délégué et Petit sont recolorés image par image : les rouges très saturés du maillot passent au bleu pervenche, en gardant les ombres. Seules les grandes taches très saturées sont prises, pour que les joues, le nez et les mains restent intacts. Ils sont posés sur un fond éclairs bleu, avec un autre tirage et un autre angle que les Rouges. Fichiers `<rôle>-bleu.mp4`. `videoPouvoir` choisit la vidéo selon l'équipe : les Vers, les Aliens et le Contagieux bleu gardent le panneau. Les 9 cr d'images clés prévus pour les Bleus n'ont pas été dépensés.
- **DV.6 — Les vidéos de pouvoir passent aussi sur le réseau mobile (Clément : « Les anim des pouvoirs des persos ne sont toujours pas intégrées », 27/11, sur Android).** Les vidéos étaient bien en ligne, mais le téléphone les retéléchargeait au moment de les jouer : sur le réseau mobile, la vidéo ne démarrait pas dans les 2,5 s et le panneau prenait sa place. Chaque vidéo est maintenant téléchargée une fois en entier, deux à la fois, et jouée depuis la mémoire du téléphone (`game/videos.ts`). Ordre : Rouges et goûters dès le chargement, puis les deux équipes de la partie passent devant. Une vidéo pas encore téléchargée est prise sur le réseau avec 5 s de délai. Les vidéos suivent aussi la bande qui joue (avant : toujours la version des Rouges, même pour l'adversaire) ; les Vers et les Aliens gardent leur panneau.
- **DV.7 — La vidéo du pouvoir passe dès que l'élève est posé, le pouvoir se résout après (Clément : « Met les videos d'action joueur dès qu'ils sont posés, l'action se résout après », 27/11).** L'élève atterrit (0,65 s), puis sa vidéo part. Pendant la vidéo, la partie est figée derrière elle : les conséquences du coup (adversaire qui file chez la CPE, infirmerie, surveillante qui marche, 2e élève du Chouchou), le tour de l'ordi et le « Passe le téléphone » attendent la fin de la vidéo, puis se jouent. Quand le pouvoir demande un choix (cible de la Rapporteuse, élève du Chouchou), la vidéo passe à la pose et le joueur choisit après ; la résolution ne remontre pas la vidéo. Vaut pour les deux camps (joueur et ordi), quand le skin a la vidéo de cette équipe (Rouges, Bleus) ; sinon, le panneau reste après le coup, comme avant. Interprétation : la vidéo part dès qu'un pouvoir va vraiment servir (Petit qui plaque, Fouine qui se faufile, pouvoir qui a une cible) ; un élève posé dont le pouvoir ne fait rien n'a pas de vidéo.
- **DV.8 — Toutes les vidéos passent au style du jeu, en 2D (Clément : « Ok c'est bien mieux, on part là-dessus pour tous les persos et bonus du jeu ! Garde la possibilité de changer la couleur des chasubles », 27/11).** Les vidéos de pouvoir et de goûter ne sont plus en rendu 3D : elles sont dessinées comme le plateau (trait noir épais un peu tremblé, aplats pastel, squash and stretch), sur fond rose à diagonales manga. Une vidéo par espèce (Écoliers, Aliens, Vers) et par rôle à pouvoir, tournée avec une chasuble bleu roi, puis recolorée image par image à la couleur de chaque tenue, tenue miroir comprise : `public/videos/cartoon/<tenue>-<rôle>.mp4` (6 tenues × 7 rôles, 720p). Les Vers et les Aliens ont donc enfin leurs vidéos. Nouveau : la Populaire a son moment vidéo quand elle fait venir ses copains (pioche de la Populaire), vidéo seulement, comme la Fouine et le Petit. Les goûters gardent leur case manga (DV.3) avec les nouvelles vidéos. Les vidéos réalistes 1080p (chasuble bleue) ne sont pas branchées. Méthode et prompts : section « Version 3 » du guide de prompt ; sources dans le dossier du projet `videos-pouvoirs/style-jeu/`.
- **DV.9 — Le son des vidéos passe à part, normalisé (Clément : « Certaines n'ont pas de son », 28/11).** Les pistes son existaient toutes, mais un téléphone coupe le son d'une vidéo lancée sans geste récent du joueur : c'était le cas de chaque pouvoir joué par l'adversaire, et certaines pistes étaient aussi très basses. Chaque vidéo a maintenant sa bande son à côté (`<nom>.m4a`, mono, volume ramené à −16 LUFS). La vidéo est jouée muette et la bande son passe par le contexte audio du jeu, débloqué une fois au premier toucher ; elle est téléchargée en début de partie pour les deux équipes et les goûters. Si la bande n'est pas encore prête, on garde l'ancien comportement (son de la vidéo si le navigateur l'accepte).
- **DV.10 — Vidéos plus riches, en 1080p, sur fond animé (Clément : « un peu pauvres… traits parfois très épais… pas en 1080p… fonds pas tous animés… dessin trop simpliste », puis « Go MAGI mais il faut animer les fonds », 28/11).** Toutes les vidéos de pouvoir et de goûter sont refaites : dessin plus fouillé (trait moyen d'épaisseur constante, deux tons d'ombre, reflets, coutures, mèches), plan large fixe sans zoom (le trait ne grossit plus), 1080p, voix anglaise. Modèle vidéo MAGI-2 (10 crédits la vidéo de 4 s au lieu de 64). Pour que le fond bouge à coup sûr, chaque perso est tourné sur un fond cyan uni, détouré image par image, puis posé sur un fond manga animé dessiné en code (rayons qui tournent et pulsent, trame qui respire, étoiles d'encre qui dérivent). La chasuble reste bleu roi au tournage et est recolorée par tenue comme avant (DV.8). Fichiers : `public/videos/cartoon/<tenue>-<rôle>.mp4` (1080×1920) et `gouter-<nom>.mp4` (1080×1080), bandes son à côté (DV.9). Sources et scripts : dossier du projet `videos-pouvoirs/style-jeu/v2-magi/`.

## Piscine rééquilibrée (27/11)

Clément, sur sa capture : « La piscine est trop chargée en haut, la zone de jeu n'est pas centrée en hauteur, le décor est trop vide sur les côtés », puis « deux bouées rondes sont trop proches graphiquement » et « Punis et Pioche n'ont pas le même impact visuel, notamment à cause de l'épaisseur du trait ».

- **DP.1 — Le décor de la piscine est posé en couches autour de la cour.** L'ancienne image plein écran plaçait son bassin selon la forme du téléphone, jamais sous les îlots, et ses douches, plongeoirs, échelles et rangées de ronds ressemblaient à des pièces du jeu. Maintenant (`ui/decorPiscine.ts`) : un carrelage qui remplit tout l'écran, un bassin calé sur la cour (bord à mi-chemin entre chaque cabane et ses deux îlots, donc les deux vestiaires sont sur le carrelage, à la même distance de l'eau), une ligne d'eau en haut et deux couloirs de nage. Les textures sont fabriquées sans rien générer par `scripts/couches-piscine.py`, à partir des couleurs et des casiers de l'ancien décor. L'ancienne image reste pour la vignette de choix et en secours.
- **DP.2 — Des casiers sur les côtés, seulement quand il y a la place.** Sur un écran plus court que 9:16 (navigateur intégré, tablette), on voit plus large : deux rangées de casiers de chaque côté, collées au bord de l'écran, portes vers le bassin. Sur un téléphone allongé, il n'y a pas la place et on ne voit que le carrelage. Rien n'est posé sur la cour elle-même.
- **DP.3 — Pioche et Punis au même poids.** Le carton rouge illustré avait un trait trois fois plus fin que la pioche dessinée en code. Il est redessiné comme une carte de la pioche (même taille, même trait, même ombre, penché, reflet brillant), et son compteur est au même endroit et au même format (« ×0 »). Le carton illustré reste pour le panneau plein écran. L'éventail du rang adverse est réduit (×1,35 → ×1,05) pour alléger le haut.
- **DP.4 — La bouée devient une bouée de sauvetage.** La bouée orange ressemblait trop au beignet rose : elle est recolorée en bouée rouge et blanche à quatre bandes (même dessin, même trait), le beignet ne change pas.

## DF.40 — Un pouvoir sans vrai choix s'applique tout seul (27/11)

Clément : « Lorsqu'un pouvoir ne demande pas de choix à l'utilisateur, applique-le sans demander, comme la Chouchou par exemple. » Lu comme : dès que toutes les options d'un pouvoir ou d'un équipement reviennent au même (une seule option, ou deux élèves du même rôle au même endroit), le moteur l'applique aussitôt, sans faire toucher la pioche, l'adversaire ou l'îlot. Le coup et ses effets arrivent ensemble ; les vidéos et panneaux suivent comme avant.

- Toujours automatiques : Populaire (piocher), Contagieux (éternuer), cabane perchée (piocher 1).
- Automatiques quand il n'y a qu'une cible : Rapporteuse, buts, toboggan (une seule glissade possible), porte de la vie scolaire (un seul rôle chez les punis), Chouchou (un seul 2e élève de 5 ou plus et un seul îlot possible ; il arrive alors après le premier, avec le panneau des grands frères).
- **Le Délégué demande toujours** : garder son mot d'excuse reste un vrai choix (« Passer », DF.8). Ambiguïté à confirmer par Clément s'il le veut automatique aussi.
- Interprétation pour la Chouchou : s'il y a plusieurs élèves ou plusieurs îlots possibles, le choix reste à faire au doigt (c'est un vrai choix).
- Réglage du moteur `pouvoirsAuto`, activé par le jeu (`Controleur`) ; les tests de règles et l'arène gardent la règle stricte (pouvoir facultatif). L'ordi joue avec le même réglage que l'écran.

## Surveillants lisibles et vivants (27/11)

### DS.1 — Sur la cour, le surveillant est un médaillon

En pied à la taille de la cour, le surveillant était petit et illisible (demande de Clément). Il
devient un médaillon (`ui/surveillant.ts`) : sa tête et ses épaules dans une rosette festonnée
jaune à cœur bleu nuit, deux rubans dessous et son nom sur une banderole. Tout l'oppose aux
pastilles d'élèves (rondes ou carrées, fond clair de l'équipe, chiffre) : la forme, les rubans,
le cœur foncé, l'absence de chiffre. Le goûter gardé a un rond pointillé jaune et bleu, aux mêmes
couleurs (il était lilas, trop proche des Aliens).

Le médaillon se pose au-dessus du goûter gardé, ou sur le côté ou dessous quand un îlot, une
cabane ou un autre goûter gêne : la place est calculée une fois par goûter.

Sans corps, la tête doit compenser (demande de Clément) : elle respire, dodeline, et enchaîne des
tics propres à chacun (Josiane : scrute, note dans son cahier, boit son café, remonte ses
lunettes, bâille ; Yvon : jumelles, frime, sifflote ; Babette : chante, compte ses scouts,
jumelles). Elle réagit au jeu : coup de sifflet quand il change de goûter (il regarde où il va,
puis hoche la tête à l'arrivée), colère (rouge, fumée, « Grrr ! ») quand un élève part chez la
CPE, sursaut « ! » quand un goûter est ramassé, « Hé ! » à un plaquage. Les accessoires (sifflet,
tasse, jumelles, notes, fumée, éclats) sont dessinés en code, en 2D cartoon (DF.39).

### DS.2 — À la présentation de la carte, il est en pied

Pendant la fiche de la carte, le surveillant entre en marchant par la gauche, s'arrête, siffle
(« TUUUT ! »), montre la règle spéciale du bras, puis s'agite en attendant (montre encore,
gronde du doigt, tape du pied, saute). La règle se pousse à droite pour lui laisser la place.
Sur « C'est parti ! », il saute jusqu'à sa place sur la cour en rapetissant, et le médaillon
apparaît d'un bond avec un coup de sifflet.

## Piscine v3 (27/11)

Clément, sur la piscine fusionnée : « La piscine ne doit pas être carrée. Trouver autre chose qu'une maison en bout de course (un casier ?). Les casiers sur les côtés sont tristes, il faut apporter de la vie. »

- **DP.5 — Un bassin aux bords ronds.** Le bassin est dessiné en code (`ui/decorPiscine.ts`) au trait du plateau : un carré aux coins très arrondis, un peu resserré à la taille comme le réseau d'îlots du grand bain, avec margelle crème, bande d'eau claire le long du bord et petites vagues blanches qui vont et viennent. Les textures `bassin`, `vague` et `casiers` de DP.1 sont supprimées ; le carrelage reste.
- **DP.6 — La base de chaque bande est un casier du vestiaire.** Dessiné dans le style des îlots (perspective, trait noir épais, porte à aérations), ses murs prennent la couleur de l'équipe comme la cabane (`casier.png`, `casier-murs.png`, `scripts/accessoires-piscine.py`). Les textes disent toujours « cabane » (mot du jeu commun à toutes les cartes).
- **DP.7 — Des affaires de baignade autour du bassin.** Serviettes à rayures, tongs, ballon de plage et plantes en pot, dessinés sans rien générer. Plantes, tongs et ballons aux coins du bassin sur tous les écrans (à moitié hors de l'écran sur un téléphone étroit) ; serviettes et objets en plus sur les côtés quand l'écran est plus large que 9:16. Les plantes et les ballons se balancent doucement. Rien n'est posé sur la cour elle-même. Les casiers gris des côtés (DP.2) sont retirés.
- **DP.8 — Bassin agrandi en hauteur (Clément : « Agrandir le bassin en hauteur quitte à mordre un peu sur les HUD »).** Le bassin va maintenant du bas du bandeau du haut, qu'il touche un peu, jusqu'au bouton d'action. La pioche, les punis et les casiers des deux bandes sont posés sur l'eau. Les accessoires des coins descendent ou remontent sur le carrelage à côté.

## DE.1 — Une équipe, une couleur ; la seconde ne sert qu'en miroir (27/11)

Clément, sur l'écran « Choisis ta bande » : « Chaque équipe devrait avoir une seule couleur et une seconde non affichée si jamais deux équipes identiques s'affrontent. » Les Rouges et les Bleus étaient en fait les mêmes élèves, dessinés en deux couleurs : l'écran montrait une même équipe deux fois.

- On choisit maintenant parmi **trois équipes** : **Les Écoliers** (rouge), **Les Vers de terre** (jaune moutarde), **Les Aliens** (violet). Chacune n'est montrée que dans sa couleur. Le nom « Les Écoliers » est une proposition, à changer si Clément préfère autre chose.
- Chaque équipe a une **seconde tenue cachée** : Écoliers bleus, Vers turquoise, Aliens orange. Elle ne sert que si les deux camps prennent la même équipe : le camp du haut l'enfile (`tenuesPour`, `data/equipes.ts`). Le modèle sépare l'équipe (ce qu'on choisit) de la tenue (couleur + dessins à l'écran).
- À deux, le joueur 2 peut prendre la même équipe que le joueur 1 (la carte dit « Aussi celle du joueur 1 » au lieu de « Déjà prise »). Contre l'ordi, l'ordi tire son équipe parmi les trois, la même comprise.
- Tenues miroir des Vers et des Aliens : seule la chasuble est recolorée, en local, sans génération (`scripts/tenue-miroir.py`, images `vers2-*`, `aliens2-*`) ; les marionnettes reprennent les attaches de la tenue d'origine. Les Écoliers bleus gardent leurs dessins et leurs vidéos de pouvoir existants.
- En jeu, les Écoliers restent « bande rouge » / « bande bleue » dans le journal (court et clair), « Écoliers » au score. Accueil et partie par défaut : Écoliers contre Écoliers (donc rouges contre bleus, comme avant).
- Les cartes du rang prennent le fond clair de la tenue (avant : rose ou bleu selon le camp).

## Piscine : forme finale (27/11)

- **DP.9 — Retour au rectangle, avec un escalier rond à chaque bout (Clément : « C1 est très bien »).** Parmi les formes étudiées (rectangle, gélule, haricot, puis quatre variantes de marches), Clément retient un bassin rectangulaire avec, au milieu de chaque petit côté, un escalier en demi-cercle qui descend dans l'eau (quatre marches, du crème au sec au bleu pâle immergé). Le casier de la bande est posé sur la marche du haut, au sec. Sur la piscine seulement, la pioche et les punis s'écartent davantage de la cabane (252 px au lieu de 205) pour ne plus toucher les îlots des bords. La forme arrondie de DP.5 est retirée.
- **DP.10 — Les îlots prennent toute la largeur du bassin (Clément : « Profite plus de la largeur de la piscine »).** Îlots des bords à 0,2 et 0,8 de la largeur de la cour (avant 0,25 et 0,75), îlots du grand bain à 0,27 et 0,73 (avant 0,32 et 0,68). Les règles ne changent pas, seulement l'affichage. La pioche et les punis passent dans les coins du bassin (290 px de la cabane), et les accessoires des coins vont sur le carrelage des côtés, seulement sur les écrans assez larges.

## Audit d'équilibrage des trois cartes (27/11)

Demande de Clément : « Joue aux 3 cartes des centaines de fois et fais un audit sur l'équilibrage et le fun des parties. » Aucune règle n'est modifiée.

- **DA.1 — Simulateur d'audit.** `scripts/audit.ts` fait jouer deux IA avec les règles de l'écran (`pouvoirsAuto`) et écrit chaque partie tour par tour (JSONL) ; `scripts/audit-analyse.py` en tire équité, durée, finales serrées, retournements, temps morts, moments marquants. Les variantes (`sansSurveillante`, `sansCourant`, `sansSensUnique`, `sansEquipements`, `rondeCourte`, `deuxChemins`, `mainPlus2`) ne changent qu'une copie de la cour le temps de la simulation. `scripts/audit-roles.ts` mesure la valeur d'un rôle : une IA s'interdit de le poser.
- **DA.2 — Interprétation : les équipes ne sont pas simulées à part.** Elles ont les mêmes règles (DB.1) ; seul le côté (haut ou bas) est mesuré.
- **DA.3 — Résultats principaux** (doc « Audit d'équilibrage et de fun — 3 cartes ») : premier joueur 49,7 % sur 3 600 parties ; piscine décidée par le seul grand bain et 27 % de sonneries entre IA difficiles ; Chouchou, Rapporteuse et Populaire décisifs, Petit, Fouine, Contagieux et Délégué presque sans effet ; surveillants peu influents ; début de partie lent (4 pioches sur 6 premiers tours).

## Jeu en ligne (27/11)

Clément : « Développer le multijoueur pour inviter un ami à jouer avec moi » puis « rentrer dans
le dur directement, le but est de mettre l'appli sur le Play Store et l'App Store ». Pas de
prototype jetable : l'architecture est celle de la sortie. Le détail est dans
`docs/multijoueur.md`.

- **DR.1 — Le serveur est l'arbitre.** Il garde l'état complet, applique les coups avec le même
  moteur que le jeu (`src/reseau/arbitre.ts`) et refuse tout coup hors tour, illégal ou envoyé sur
  une version périmée de la partie (un double toucher ne joue qu'une fois). La graine du mélange
  vient du serveur, jamais d'un téléphone.
- **DR.2 — Chaque téléphone ne reçoit que ce que son joueur a le droit de savoir**
  (`src/reseau/vue.ts`). Cachés : le rang adverse (sauf les élèves revenus de la CPE ou d'un
  îlot, ou mis à l'infirmerie, qui ont été vus), l'ordre des deux couloirs (y compris le sien :
  on ne connaît pas l'ordre de sa pioche), les absents de l'appel, le hasard du moteur, et les
  options du choix en attente de l'adversaire. À la fin de la partie, tout est montré.
- **DR.3 — Temps par tour : 2 minutes par défaut** (réglable de 30 s à une semaine, pour une
  partie par correspondance plus tard). Le temps repart à chaque nouveau tour, pas à chaque choix
  d'un même coup. Temps écoulé = partie perdue : l'adversaire peut réclamer la victoire, et une
  tâche du serveur clôt aussi ces parties. Proposition, à ajuster après les premières parties.
- **DR.4 — L'hôte joue le camp rouge, l'invité le bleu.** Le premier joueur reste tiré au sort par
  le moteur. Chacun verra sa bande en bas de l'écran (à faire dans la partie « écran »).
- **DR.5 — Abandonner** donne la victoire à l'autre ; avant l'arrivée de l'ami, cela ferme
  simplement la partie, sans gagnant.
- **DR.6 — Codes d'invitation de 6 lettres** sans lettres ambiguës (ni I, L, O, Q, U, W, ni
  chiffres), insensibles à la casse, aux espaces et aux tirets.
- **DR.7 — Le serveur du jeu a son propre projet Supabase** (`la-cour-des-grands`, Paris, offre
  gratuite). Choix de Clément : mettre en pause son ancien projet « norrep's Project » pour
  libérer la place gratuite. Pro (environ 25 $/mois) seulement à la sortie sur les stores.
- **DR.8 — L'écran du jeu en ligne.** À l'accueil, « Avec un ami en ligne » est à côté de « Jouer
  à deux ». L'hôte choisit la carte et SA bande, puis reçoit un code de 6 lettres et un bouton
  « Envoyer le lien » (partage du téléphone, ou copie). L'ami tape le code, ou ouvre le lien qui
  l'amène droit au choix de SA bande. Pendant la partie : « À toi de jouer ! » ou « Au tour de ton
  ami », le temps restant sous la pastille (en rouge sous 15 s), et « Ton ami réfléchit… ». Un coup
  qui ne pioche rien et ne dépend d'aucun hasard est montré tout de suite ; un appel de copains ou
  un pouvoir au hasard attend la réponse du serveur (« C'est envoyé… », une fraction de seconde).
  Après une coupure, « Reprendre ma partie » apparaît dans le menu en ligne.
- **DR.9 — Pour l'instant, l'invité joue en haut de la cour** (le camp bleu), comme le joueur 2 à
  deux sur un téléphone. Retourner la cour pour que chacun ait sa cabane en bas demande de revoir
  les décors : à faire dans une prochaine étape si Clément le souhaite.

- **DR.11 — En ligne, chacun voit sa cabane en bas** (remplace DR.9 ; Clément : « le plateau de mon adversaire doit être retourné pour lui »). Toutes les cours sont symétriques par demi-tour : le téléphone de l'invité (camp bleu) montre la partie RETOURNÉE (`src/reseau/miroir.ts`), où il joue le camp rouge. Chaque îlot va sur son symétrique (point le plus proche de (1 − x, 1 − y)), les bandes sont échangées, la ronde du surveillant et l'anneau du courant décalés. Le serveur ne change pas : il garde la partie dans le sens de l'hôte, et les coups de l'invité sont retournés avant l'envoi. Une cour non symétrique lève une erreur. Testé sur les 3 cours : retourner deux fois redonne la partie, et jouer dans la partie retournée donne le même résultat que jouer puis retourner.
- **DR.12 — En ligne, le surveillant est sur la cour dès le départ** (Clément : « les surveillants ont disparu et sont remplacés par un cercle pointillé »). En ligne, il n'y a pas de fiche de la cour : la partie commence directement. Mais l'écran se croyait encore « en présentation » (le surveillant est alors en pied à côté de la règle, et le médaillon attend qu'on lance la partie) : il ne restait que le rond pointillé du goûter gardé, toute la partie. La présentation est maintenant coupée d'office en ligne, et le médaillon apparaît d'un bond au premier dessin. En solo et à deux sur un téléphone, rien ne change.

- **DR.12 — Amis, abandon, temps limite** (Clément : « La liste d'amis, l'abandon et le temps limite par tour »). Un pseudo est demandé une fois en entrant dans le jeu en ligne. On devient amis en jouant ensemble ou par le code ami (6 lettres, dans les deux sens, sans demande à accepter : c'est plus simple pour des enfants, et inviter ne fait qu'ouvrir une partie). Inviter un ami de la liste lui montre l'invitation dans son menu ; elle disparaît dès que la partie commence ou est annulée, et au bout de 24 h. L'abandon est dans l'aide « ? » (deux touchers, pour éviter l'accident). Le temps limite est tenu par le serveur sans tâche planifiée : toute demande après l'échéance clôt la partie, les deux téléphones la demandent à zéro, et le menu clôt les parties échues en s'ouvrant. Pas encore : retirer un ami, plus de 5 amis à l'écran.

## Lisibilité sur téléphone (27/11)

Audit du 27/11 : sur un Android de 360 dp, le jeu est réduit de moitié ; les cartes en main
faisaient 40 × 70 dp et les petits textes 7 à 8 dp. Clément a choisi le lot 1 à 6, avec la main en
léger éventail, puis demandé qu'on voie mieux quand c'est à l'autre de jouer.

- **DL.1 — Main XXL en léger éventail.** Cartes de 122 × 190 (61 × 95 dp), sans le nom écrit : le
  visage et le chiffre suffisent, la loupe montre le reste. Au-delà de 6 cartes elles se
  chevauchent ; elles s'inclinent un peu vers l'extérieur et les bords descendent.
- **DL.2 — « +2 copains » à côté de la pioche** de la bande qui joue, au lieu du grand bouton sous
  la cour. Il respire doucement pour qu'on le voie.
- **DL.3 — Loupe.** Doigt posé sur une carte (220 ms) : la carte en grand avec son nom et son
  pouvoir, tant qu'on la tient ; glisser la referme et joue. Un toucher la laisse ouverte jusqu'au
  toucher suivant. Toucher un élève seul sur la cour ouvre la même loupe.
- **DL.4 — Textes de 22 à 24 px de jeu au moins** sur la cour (×N, étiquettes, Pioche/Punis,
  valeurs des goûters, verbes des pouvoirs) et dans les bulles (22 au lieu de 18).
- **DL.5 — Piles dépliables.** Plus de colonne de mini-badges à côté d'une pile ; la pastille
  « ×N » est plus grosse, et toucher la pile la déplie dans une bulle, du dessus au dessous.
  Pastilles de la cour 92 → 112.
- **DL.6 — Glisser.** L'îlot visé est marqué par un grand disque jaune qui respire ; sans
  animations, la carte passe au-dessus du doigt.
- **DL.7 — Tour d'en face bien visible.** Pendant le tour de l'ordi (ou de l'ami en ligne), la main
  descend et pâlit, un bandeau à la couleur d'en face dit « L'ordi réfléchit… » et un cadre de sa
  couleur borde l'écran. Quand le tour revient : un tampon « À toi ! » et un petit son.
- **DL.8 — « +2 copains » devient un gros rond jaune au-dessus du coin droit de la main**
  (retour de Clément : le bouton à côté de la pioche n'était pas clair). Essayée d'abord, une carte
  au début de la main serrait trop les élèves ; parmi trois maquettes (rond flottant, onglet sur la
  main, pioche qui s'allume), Clément a choisi le rond : sous le pouce, il respire et dit « +2
  copains ».
- **DL.9 — Les punis passent à côté de la pioche**, à gauche de la cabane (essai demandé par
  Clément), pour les deux bandes et sur toutes les cartes. La droite de la cabane reste libre pour
  le rond « +2 copains » en bas et le rang adverse en haut.
- **DL.10 — La zone des punis disparaît quand la cour n'a pas de porte de la vie scolaire** (aucune
  des trois cartes actuelles) : elle ne faisait qu'afficher les exclus. Les punis sont comptés par
  une pastille rouge « N punis » sous la pioche (le détail est dans la fiche de la pioche), et
  l'exclu vole jusqu'à la pioche. La pioche reste au bord de l'écran : rapprochée de la cabane, elle touchait des îlots (piscine surtout). Le code de
  la zone reste : elle revient d'elle-même sur une cour qui a la porte (`avecZonePunis`).
- **DL.11 — Rond « +2 copains » redessiné** : jeton jaune au trait épais avec reflet, deux cartes
  de la pioche en éventail qui se dandinent, « +2 » en autocollant blanc cerclé de noir, « copains »
  sur un ruban à la couleur de l'équipe, halo qui respire, et le rond s'enfonce sous le pouce.
- **DL.12 — La pioche du bas en miroir du rond « +2 copains »** (choix A de Clément parmi trois
  maquettes : miroir, duo à droite, pioche-bouton). Elle se range au-dessus du coin gauche de la
  main, à la hauteur du rond et un peu agrandie (×1,22), son étiquette « Pioche » en ruban dessous
  comme « copains », les punis au-dessus. La pioche du haut ne bouge pas.
- **DL.13 — On voit l'élève partir à la punition** (demande de Clément) : un carton rouge jaillit
  au-dessus de lui, il sursaute bras en l'air, puis traîne les pieds tête basse jusqu'à la pioche
  (ou au bureau des punis s'il existe), petits nuages de poussière à chaque pas, et disparaît
  dedans (≈ 1,5 s, `DUREE_PUNITION`). La conséquence suivante attend 0,7 s pour qu'on voie le
  carton. Le panneau « Puni ! » (carton et sifflet) est retiré : il ne reste que la vidéo du
  pouvoir quand le skin en a une.
- **DL.14 — Les cartes de la main deviennent des cases de bande dessinée** (Clément trouvait la
  main « un peu pauvre » ; choix C parmi trois maquettes : cartes de collection, pupitre, cases de
  BD). Fond à la couleur de l'équipe avec lignes de vitesse, trame de points qui grossit vers les
  bords, étoile « pop » derrière la tête et gros trait noir ; la tête de l'élève sort du haut de
  la case, le visage garde sa taille. La loupe montre la même case en grand. Pour laisser passer
  les têtes, la pioche du bas et le rond « +2 copains » remontent de 22 px.
- **DL.15 — Cartes de la main : cadre de carte de collection, têtes qui débordent** (Clément :
  « le pire des deux mondes », garder les têtes qui sortent, reprendre le contour et le fond de la
  carte de collection, retirer les lignes blanches). Remplace le fond de DL.14 : cadre épais à la
  couleur de l'équipe, panneau clair avec un éclat (rayons coupés au bord du panneau) et un rond
  blanc derrière la tête, reflet sur le bord gauche. Plus de lignes de vitesse, de trame ni
  d'étoile. La tête sort toujours par le haut ; le cadre repasse sur le buste à gauche, à droite
  et en bas.
  Retouche (Clément) : plus de rond blanc derrière la tête, seul l'éclat reste.
- **DL.16 — Le rang remonte sur les écrans courts** (Clément : « les persos sont coupés en bas »).
  Sur un écran de forme 9:16 ou plus court (navigateur avec barres), les cartes du bord de
  l'éventail touchaient le bas de l'écran. Le rang se place au plus à 128 px du bas visible ;
  sur les écrans allongés rien ne change.
- **DL.17 — La pendule montre la sonnerie qui approche** (Clément : l'horloge du haut n'était
  pas lisible ; choix C parmi trois maquettes : grande pendule, pendule et heure écrite, sonnerie
  qui approche). Pendule deux fois plus grande (rayon 34), cadre rouge, deux cloches jaunes
  dessus, aiguilles épaisses ; elle avance toujours de 5 minutes par tour. Son cadran se remplit
  de rouge à mesure que les couloirs des deux bandes se vident (vide quand les rangs de départ
  sont tirés, plein quand plus personne ne peut appeler de copains) : la sonnerie ne vient
  qu'ensuite, quand un joueur ne peut plus rien faire. La pastille « Au tour de… » passe sous la
  pendule, le « ? » à sa droite, le temps restant du jeu en ligne à sa gauche.
- **DL.18 — L'élève s'appuie sur le bas du cadre** (Clément : « les persos ne touchent toujours
  pas la bordure de la carte »). Le bas du débardeur était 5 px au-dessus du cadre, laissant une
  bande claire. Il glisse maintenant juste sous le cadre du bas, qui le recouvre de 3 px ; la tête
  sort toujours par le haut.
- **DL.19 — Les bras ne sont plus coupés par les côtés du cadre** (Clément : « le corps des
  aliens semble cropé sur les côtés »). Les côtés du cadre ne repassent plus sur le buste : bras
  et épaules passent devant (les Aliens ont les bras les plus longs). Seul le bas du cadre recouvre
  le débardeur (DL.18).

## Pastilles de valeur retirées (27/11, demande de Clément)

- **DP.1 — Plus de pastille de valeur à côté des élèves** (skin Cartoon) : ni sur les cartes de la
  main, ni sur les pastilles de la cour, ni sur l'élève en entier. « Le chasuble porte déjà le
  numéro. » Remplace DG.3 : depuis la main XXL et les pastilles 112 (DL.1, DL.5), le numéro de la
  chasuble se lit à taille téléphone, y compris le « J » du joker et le jaune des Vers. Rond ou
  carré pour distinguer les bandes sans les couleurs : c'est la forme de la pastille de cour qui
  le garde. Ambiguïté : « sur les cartes » lu comme « partout où l'élève porte sa chasuble » ; les
  badges seuls (punis au bureau de la CPE, élève plaqué, skin « Jetons ») restent,
  car il n'y a pas d'élève dessiné à côté.
- **DP.2 — « J » blanc sur la chasuble du Petit des Vers** (et de sa tenue miroir), comme les
  autres numéros : le bleu marine du dessin est passé en blanc, trait noir inchangé.
- **DP.3 — Contour noir autour des numéros des Vers**, comme chez les autres équipes (16 dessins,
  tenue miroir comprise) : trait de 8 px de texture, la même épaisseur que les chiffres des
  écoliers. Le « 2 » du Chouchou, crème (ou bleu pâle en miroir), passe en blanc comme les autres.

## Règles finales de l'audit (27/11, version d'essai)

Demande de Clément : prendre le meilleur des trois tests (v2, main 4/5, règles strictes du jeu d'origine), puis « si on doit modifier quelque chose c'est la map de piscine, pas les règles ». Testé par simulation (`scripts/audit.ts`) avant d'être codé ; version d'essai séparée, pas fusionnée sans son accord.

- **DQ.1 — Main de départ 4 et 5** (au lieu de 3 et 4), sur toutes les cartes.
- **DQ.2 — La Populaire pioche 3** (au lieu de 2).
- **DQ.3 — Le Petit est intouchable** : aucun adversaire ne peut le recouvrir, et il prolonge le chemin comme les autres (choix de Clément le 28/11 : avec la main 4/5, les victoires à la cabane montent à 74 % sur la cour et 68 % au camp, parties plus courtes, équité gardée).
- **DQ.4 — La Fouine posée hors du chemin pioche 1** (« par les buissons, elle ramène un copain »). Le chemin est mesuré avant la pose.
- **DQ.5 — Le Délégué choisit le goûter** où va la surveillante (une option par autre goûter de sa ronde, toujours facultatif).
- **DQ.6 — Sonnerie** : à égalité de goûters, gagne celui qui tient le plus d'îlots ; sinon, comme avant, le joueur bloqué perd.
- **DQ.7 — Nouvelle piscine** : quatre coins (un bord + le flotteur voisin, 1 glace chacun) et le grand bain (2 glaces), objectif 3 ; Monsieur Yvon fait la ronde des quatre coins ; le courant tourne dans l'autre sens (F1 → F4 → F3 → F2), ce qui ramène le premier joueur de 42 % à 48 % entre IA difficiles avec la main 4/5.

## Choix de la carte et de la bande en carrousel (28/11, demande de Clément)

« UX/UI à revoir pour la présentation des maps », puis « l'adapter pour le choix des bandes ».
Trois maquettes (carrousel, billets empilés, plein écran) ; Clément choisit le carrousel.

- **DC.1 — Carrousel d'une grande carte à la fois** pour « Où on joue ? » et « Choisis ta bande » :
  la carte du milieu en grand (540 × 860), les voisines qui dépassent sur les bords. On glisse du
  doigt, on touche une voisine pour la ramener, ou les flèches de part et d'autre des points. Gros
  bouton jaune « On joue ici ! » / « Je prends cette bande ! » ; toucher la carte du milieu choisit
  aussi. « Retour » passe en petit bouton en haut à gauche. La carte et la bande en vue sont
  gardées quand on revient en arrière.
- **DC.2 — Carte de lieu** : aperçu de la vraie cour (îlots, goûters, cabanes, bancs, flèches),
  médaillon du surveillant dans le coin, nom sur un ruban à la couleur du lieu, « Surveillé par… »,
  et la règle spéciale en une phrase sur un autocollant jaune (`TEXTES.choixPartie.regle`, plus
  courte que celle de la fiche de la cour). Les aperçus (`public/cartes/apercus/`) sont des
  captures de l'écran de présentation de chaque carte, pioche et bulles masquées ; ils remplacent
  les vignettes de décor vide. À refaire si un plan change.
- **DC.3 — Carte de bande** : le Grand et le Petit en grand sur un halo de la couleur de l'équipe,
  le nom sur un ruban, puis les six autres élèves en bustes (« Toute la bande »). L'ombre se pose
  sous les pieds de la marionnette (et non plus sous le bas de son cadre), ce qui corrige les Vers
  dont l'ombre flottait au milieu du corps.
- **DQ.8 — Goûter pris** : un goûter ne se prend qu’une fois (déjà le cas dans le moteur). À l’écran, il s’envole vers le cartable puis disparaît de la cour, au lieu de rester pâli sur un rond de la couleur de l’équipe (demande de Clément, 28/11).
- **DQ.9 — Pioche sans mégaphone** : quand un pouvoir fait piocher (Populaire, Fouine, copains), le mégaphone incrusté au-dessus de la pioche (DF.38) est retiré, jugé superflu par Clément (28/11). Restent le rebond de la pioche, le vol des cartes vers la main et le son de pioche ; la pause après une pioche passe de 1,45 s à 0,76 s comme les autres conséquences.

## Goûter gardé visible sous la surveillante (28/11, demande de Clément)

- **DG.1** — Le médaillon se posait 96 px au-dessus du goûter, mais sa banderole et ses rubans
  retombaient sur le goûter et sa pastille « +N ». Il se pose désormais selon sa vraie emprise
  (tête, rubans, banderole du nom) : jamais par-dessus le goûter gardé, le plus près possible, en
  évitant les îlots, les autres goûters et les lieux ; au-dessus quand il y a la place.
- **DG.3** — Plus de nom sous le médaillon sur la cour, pour les trois surveillants (demande de
  Clément : la carte est déjà chargée). Le nom reste à la présentation de la carte, en pied. Le
  médaillon, plus étroit sans sa banderole, se pose plus près de son goûter.
- **DG.4** — Plus de rubans sous la rosette non plus (demande de Clément) : sur la cour, le
  médaillon n'est plus que la rosette et la tête.
- **DG.2** — Le médaillon passe de 100 à 84 px de diamètre sur la cour : à 100, il ne tenait pas
  près de son goûter sur la cour et le camp scout (trop serrés) et partait loin. Ambiguïté notée :
  s'il paraît trop petit, on peut revenir à 92 en acceptant qu'il s'éloigne un peu sur ces cartes.

## Goûters de la piscine dégagés (28/11, demande de Clément : « illisibles, plein d'informations se superposent »)

- **DH.1** — Les goûters des quatre coins étaient au milieu de deux îlots du bord, donc sous
  l'élève posé (sa tête), sa pile « ×2 » et les étiquettes. Ils se posent 105 px plus près du milieu
  du bassin, dans l'eau libre. Dessin et pastille « +N » inchangés (une bouée-plateau plus grande a
  été essayée puis refusée : « revenir au goûter d'origine »).
- **DH.2** — Mot d'excuse du Délégué : plus d'étiquette « Mot d'excuse ! » sur chaque goûter visé
  (la consigne le dit déjà, et elles se recouvraient). La bulle de consigne passe sous l'îlot quand,
  au-dessus, elle cacherait un goûter (sur toutes les cartes).

## Transition et écran de victoire (28/11, demande de Clément)

- **DW.1 — Transition de victoire, en code** : quand la partie se gagne sur la cour, on voit
  d'abord comment, environ 2 s. La cour s'assombrit sauf un rond de projecteur, et la caméra
  s'approche : sur la cabane prise (le drapeau du gagnant s'y plante), sur la boîte à goûter
  pleine (les goûters en débordent) ou sur la pendule (le réveil sonne). Un cri de manga claque
  (« CABANE PRISE ! », « GOÛTERS DÉVALISÉS ! », « DRIIIIING ! »), puis un rond à la couleur de la
  bande se referme sur l'écran de fin. Toucher l'écran passe. Rien pour un abandon ou un temps
  écoulé en ligne (l'écran de fin vient directement). Ambiguïté notée : la vidéo du Grand
  (cabane, goûters) choisie aussi par Clément viendra se loger dans ce cri, une fois validée.
- **DW.2 — Écran de victoire « affiche manga »** (maquette A, choisie parmi trois) : fond manga à
  la couleur de la bande gagnante, ruban « GAGNÉ ! », le Grand et le Petit qui sautent, une
  étiquette qui dit comment (pictogramme + trois mots + la phrase), les deux boîtes à goûter
  (un biscuit par goûter, un rond vide pour ceux qui manquaient), « Rejouer » en grand et
  « Accueil » à côté. Les élèves sont les marionnettes de l'équipe (plus l'ancien dessin).
- **DW.3 — Point de vue** : contre l'ordi ou en ligne, si on perd, le titre devient « PERDU… »
  sur fond gris et c'est notre bande qui boude. À deux sur le même téléphone, le titre est le nom
  de l'équipe gagnante (« ALIENS ! »). Les couleurs viennent de l'équipe (avant, rouge/bleu fixes,
  faux pour les Vers et les Aliens).
- **DW.4 — Vidéos de victoire** (choisies par Clément, images clés validées) : le Grand de la bande
  gagnante, seul, plante le drapeau sur la cabane (« We took the hut! ») ou se goinfre de goûters
  (« All the snacks are mine! »). MAGI-2 1080p 4 s sur fond cyan, chasuble et drapeau bleu roi
  recolorés par tenue (la casquette pervenche, peu saturée, est épargnée), fond manga animé à la
  couleur de la tenue. Elles passent plein écran juste après le rond de la transition, puis
  l'écran de fin ; toucher passe. `public/videos/cartoon/victoire-<tenue>-<cabane|gouters>.mp4`
  (+ .m4a), pour les six tenues. Les Aliens partent de leur nouveau dessin « grosse tête »
  (PR #50) et sont tournés sur fond magenta : leur peau menthe est trop proche du cyan. Sans
  vidéo (skin sans vidéo, réseau), la transition va droit à l'écran de fin.
  Pas de vidéo pour la sonnerie : le réveil de la transition suffit.
- **DW.5 — Cri en tampon** : la bulle d'explosion de manga du cri (DW.1) est jugée « très moche »
  par Clément. Parmi trois styles (tampon, ruban, lettres seules), il choisit le tampon : le même
  autocollant jaune que le « À toi ! » (DL.7), liseré intérieur à la couleur de la bande, un peu
  plus grand qu'avant.

## Aliens « grosse tête » (28/11)

Demande de Clément : « Je commence à avoir un doute avec le design de mes aliens, je trouve leur qualité graphique en dessous des autres races ». Diagnostic (planche comparative, dossier du projet `equipes/diagnostic-aliens/`) : le trait n'était pas en cause (même épaisseur relative que les Écoliers et les Vers) ; la tête faisait 1/5 de la hauteur et les yeux étaient trois points noirs, d'où des bustes illisibles à 96 px ; les corps étaient ceux des Écoliers peints en vert, tous du même vert ; le Délégué avait une tête de robot.

- **DT.1 — Les 8 Aliens sont redessinés en piste A « grosse tête »** (choisie par Clément parmi A « grosse tête » et B « gélatineux », toutes deux tirées sur le clan complet) : tête ronde d'un tiers de la hauteur, gros yeux blancs à paupières comme les Écoliers, antennes, un vert différent par rôle (pistache, turquoise, vert d'eau, citron, olive, sauge, émeraude, menthe), accessoires du rôle gardés (casquette, couettes, écharpe, capuche, cravate…). Le Délégué perd sa tête-boîte. Sources : `equipes/diagnostic-aliens/tests/A-<rôle>.png` (Higgsfield, nano_banana_2 2K, 2 cr l'image, 34 cr pour les tests et le clan A et B).
- **DT.2 — Découpe des grosses têtes par le trait** (`scripts/decoupe.py --tete-encre`) : ces Aliens n'ont pas de cou, le menton descend entre les bras, et la coupe droite d'avant tranchait le visage. La tête est maintenant faite des zones de couleur fermées par l'encre qui commencent au-dessus des bras (visage, cheveux, antennes), avec leur contour ; le tronc et les bras perdent l'intérieur de la tête. Les autres bandes ne changent pas.
- **DT.3 — Tenue miroir orange refaite** à partir des nouveaux dessins (`scripts/tenue-miroir.py aliens`).
- À suivre : les vidéos de pouvoir des Aliens (`public/videos/cartoon/aliens*-*.mp4`) montrent encore l'ancien dessin ; à refaire avec le fil des vidéos.
- **DT.4 — Bustes de l'écran « Choisis ta bande » : coiffures et mains ne sont plus rognées** (Clément : « Sur les preview aliens les filles ont les cheveux cropés », puis la Rapporteuse des Vers, puis « les mains de la rapporteuse et de la fouine humaine »). Le masque du buste ne coupe plus que sous le débardeur ; sur les côtés il laisse 1,6 fois la case, pour une tête décentrée ou qui se balance et pour les gestes (la Rapporteuse qui pointe, la Populaire qui salue peuvent passer devant le voisin). Pour tenir, un buste se réduit si sa tête, ou son tronc avec les bras qui pendent, dépasse 1,2 fois la case.
- **DT.5 — Les côtés du buste des Aliens ne sont plus coupés** (Clément : « le corps des aliens semble cropé sur les côtés », « les côtés du buste »). La découpe gardait le tronc à la largeur de la taille et coupait droit bras et épaules : l'écharpe, le sweat et les épaules tombaient, et les coins carrés du bras dépassaient quand il pend. Sous les bras, le tronc garde maintenant toute la largeur du corps ; le bout du bras et les épaules du tronc sont arrondis et cerclés d'encre, ce qui ne laisse plus de coupe visible (`scripts/decoupe.py --tete-encre`, les 8 Aliens et leur tenue miroir).

## Rôles signature des clans (28/11, demande de Clément)

Clément trouvait qu'un clan payant n'était « quasiment que de la cosmétique ». Chaque clan reçoit un rôle signature qui remplace un des 8 rôles, sans jamais rendre un clan plus fort (pas de « payer pour gagner »). Proposition et simulations : doc « Rôles signature des clans », labo dans le dossier du projet `labo-roles-signature/`. Revient sur « mêmes règles pour toutes les équipes » (27/11).

- **DS.1 — Un rôle signature par clan, au chiffre du rôle remplacé** : il prend la place des 3 exemplaires de ce rôle dans le couloir (`OptionsPartie.signatures`, `EQUIPES[…].signature`). Seuls les « petits pouvoirs » sont remplacés (Contagieux 5, Délégué 6) : remplacer un gros pouvoir déséquilibre tout de suite (sans Fouine, les Vers tombent à 33 %). Écoliers → Bagarreur (5, à la place du Contagieux) ; Aliens → Téléporteur (6, à la place du Délégué). Une partie miroir donne le rôle aux deux bandes. En ligne, l'arbitre donne les rôles selon les équipes : il faut le redéployer pour que ce soit actif (avant, les parties en ligne gardent les 8 rôles d'origine).
- **DS.2 — Bousculade du Bagarreur** : un adversaire voisin de 1 à 4 recule sur un îlot vide voisin de lui (pas sur l'îlot du Bagarreur). Ni le Petit (intouchable) ni un planqué. Facultatif (« Passer »), même avec un seul choix. À l'écran, deux touchers comme le toboggan : l'adversaire, puis l'îlot vide.
- **DS.3 — Téléportation du Téléporteur** : il échange sa place avec un élève de sa bande visible ailleurs sur la cour, sauf le Petit (choisi par Clément : 54 → 52 % contre les Vers) et sauf un planqué ; pas depuis le banc. Facultatif. À l'écran, on touche le copain.
- **DS.4 — Pas de Fouisseur pour les Vers** : le « Fouisseur » (se pose sur un îlot vide n'importe où, ton chemin repart de lui) était jugé trop fort par Clément (posé devant la cabane, victoire au tour suivant). Même en lui interdisant de servir pour entrer dans la cabane, les Aliens battaient les Vers 56 % du temps sur la cour (900 parties). Clément : « Garde le rôle de base et évacue le fouisseur sinon ». Les Vers gardent leurs 8 rôles.
- **DS.5 — Numéro doré** (demande de Clément : « il faudra que l'on comprenne que ces personnages sont le rôle spécial », « leur numéro peut être doré ? ») : une étoile d'or avec le chiffre sur le débardeur, dans la main, sur la cour et dans l'écran de fin ; le badge (skin Jetons) écrit le chiffre en or ; la fiche commence par « ★ Rôle spécial des Écoliers / des Aliens ». En attendant leurs dessins, le Bagarreur emprunte celui du Contagieux et le Téléporteur celui du Délégué (même chiffre sur le débardeur) ; pas de vidéo de pouvoir.
- **DS.6 — Bousculade et téléportation se voient sur la cour** : l'élève glisse d'un îlot à l'autre (comme le toboggan, événement `glissade` avec `par`), sans le panneau du toboggan ; une ligne au journal.
