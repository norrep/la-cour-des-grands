# Jeu en ligne : architecture

Objectif : jouer contre un ami à distance, dans une appli publiée sur le Play Store et l'App
Store. Les choix ci-dessous visent la sortie, pas un prototype.

## Vue d'ensemble

```
 Téléphone A ──┐                         ┌── Téléphone B
  (Phaser)     │   coups (HTTPS)         │    (Phaser)
               ├──────────► Fonction ◄───┤
               │            « arbitre »  │
               │               │         │
               │          Postgres       │
               │     (parties, vues)     │
               │               │         │
               └──◄── Realtime (vue de A)┘──◄── vue de B
```

- **Supabase** héberge tout : comptes, base Postgres, temps réel, fonctions serveur. GitHub Pages
  (et plus tard l'appli Capacitor) ne sert que le jeu lui-même.
- **L'arbitre** (`src/reseau/arbitre.ts`) est du TypeScript pur qui réutilise `src/engine`. Il
  tourne dans une Edge Function (Deno), dans les tests (Vitest) et dans `SalleMemoire` (jeu
  hors ligne pour développer). Une seule implémentation des règles : pas de divergence possible
  entre l'écran et le serveur.
- **Les vues** (`src/reseau/vue.ts`) : après chaque coup, le serveur calcule la vue de chaque
  camp et l'écrit dans une table que seul ce joueur peut lire (sécurité au niveau des lignes).
  Le temps réel la pousse au téléphone. L'état complet n'est lisible par aucun téléphone.
- **Le téléphone** ne parle qu'à l'interface `ServeurParties` (`src/reseau/client.ts`) :
  `ouvrir`, `rejoindre`, `envoyer`, `lire`, `suivre`, `mesParties`.

## Comptes

- Connexion **anonyme** à la première partie en ligne : pas d'inscription, juste un pseudo.
- Plus tard, le compte anonyme est **relié** à Apple ou Google (Supabase « linkIdentity ») sans
  perdre ses parties ni ses amis. Sign in with Apple sera obligatoire sur l'App Store dès qu'une
  autre connexion sociale existe.

## Tables

| Table     | Contenu                                                    | Lisible par             |
| --------- | ---------------------------------------------------------- | ----------------------- |
| `profils` | pseudo, code ami, date de création                         | tout compte connecté    |
| `parties` | `PartieServeur` complète (état non masqué, version, délai) | personne (serveur seul) |
| `vues`    | une ligne par (partie, camp) : `VueJoueur`                 | le joueur de ce camp    |
| `amis`    | paires de comptes, demandes en attente                     | les deux comptes        |

Écritures uniquement par les fonctions serveur. Un coup = une transaction qui vérifie la version
(verrou optimiste), écrit la partie et les deux vues.

## Reprise, abandon, temps

- Le téléphone garde l'id de sa partie ; au retour (réseau, appli rouverte), il relit sa vue et
  se réabonne. `mesParties` retrouve les parties en cours sur un autre appareil.
- Temps par tour (DR.3) : l'échéance est stockée dans la partie ; l'adversaire peut réclamer la
  victoire une fois l'échéance passée, et une tâche planifiée (pg_cron) clôt les parties oubliées.

## Appli mobile (plus tard)

- Empaquetage **Capacitor** : le même build Vite dans une coquille iOS/Android.
- Liens d'invitation : d'abord un lien web (`…/?code=ABCDEF`) et le code à taper ; ensuite les
  liens universels (iOS) et App Links (Android) pour ouvrir l'appli directement.
- Notifications « c'est ton tour » : à prévoir avec les parties longues.

## Étapes

1. Arbitre, vues masquées, serveur en mémoire, tests. ← fait
2. Projet Supabase : tables, sécurité, comptes anonymes, fonction arbitre. ← fait
3. Écran : jouer en ligne, inviter par lien ou code, partie en direct, reprise.
4. Amis, abandon et temps à l'écran, notifications.

## Projet Supabase et mise en ligne du serveur

- Projet `la-cour-des-grands` (réf. `cewqffjgtwilsjyjsgtl`, Paris `eu-west-3`, offre gratuite),
  créé le 27/11. Adresse et clé publique : `src/game/enLigne/config.ts`.
- Base : `supabase/migrations/` (appliquée telle quelle). La table `parties` n'a volontairement
  aucune règle d'accès : seul le serveur la lit (l'alerte « RLS sans règle » est attendue).
- Fonction `arbitre` : `supabase/functions/arbitre/index.ts`. Le paquet `arbitre.js` est généré
  par `npm run serveur:construire` (un test vérifie qu'il est à jour). À la mise en ligne, le
  `arbitre.js` envoyé à Supabase est une ligne qui importe ce paquet depuis le dépôt public,
  **épinglé sur un commit** : la version jouée par le serveur est donc toujours une version
  relue du dépôt. Après un changement de règles : reconstruire, pousser, redéployer en épinglant
  le nouveau commit.
- Réglage à faire une fois dans le tableau de bord : Authentication → Sign In / Providers →
  « Allow anonymous sign-ins ». Avant la sortie : ajouter un captcha (Turnstile) à la connexion
  anonyme pour éviter les comptes créés en masse, et passer en offre Pro (pas de mise en veille).
