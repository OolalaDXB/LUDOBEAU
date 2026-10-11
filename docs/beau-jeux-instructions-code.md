# BEAU · Salle de jeux — Instructions pour Claude Code

Module "Salle de jeux du Souffleur" à intégrer dans BEAU Capital. Objectif produit : une zone ludique qui fait revenir sans transaction. Esthétique quiet luxury (papier ivoire, encre, terracotta, pétrole, Cormorant Garamond). Jamais de thème sombre or/noir.

Convention de travail : commits directement sur `main`, pas de branche `feature/*`. Priorités en P1/P2/P3.

## 1. Fichiers sources (références)

Composants de jeu, chacun autonome (React + hooks only, styles inline, pas de lib externe) :

| Fichier | Export par défaut | Langue | Prop `lang` |
|---|---|---|---|
| `beau-echiquier-plateau.jsx` | `BeauEchiquier` | FR | non (à faire P2) |
| `beau-tawla.jsx` | `BeauTawla` | FR | non (à faire P2) |
| `beau-sudoku.jsx` | `BeauSudoku` | FR | non (à faire P2) |
| `beau-escales-multi.jsx` | `BeauEscalesMulti` | FR | non (à faire P2) |
| `beau-puissance4.jsx` | `BeauPuissance4` | FR | non (à faire P2) |
| `beau-quiz-souffleur.jsx` | `BeauQuizSouffleur` | FR + EN | oui : `<Comp lang="fr"|"en" />` |
| `beau-pari-scelle.jsx` | `BeauPariScelle` | FR + EN | oui : `<Comp lang="fr"|"en" />` |
| `beau-jeux.jsx` | `BeauJeux` (hub) | FR | à remettre à niveau |

Enveloppe autonome : `beau-jeux.html` (tout inliné, double-clic, bilingue). Démo uniquement, ne pas intégrer tel quel.

Fichiers obsolètes à NE PAS utiliser : `beau-echiquier.jsx`, `beau-escales.jsx`.

## 2. Intégration dans BEAU (Vite / React)

1. Copier les sept composants de jeu plus `beau-jeux.jsx` dans `src/games/` (garder les noms de fichiers, les imports relatifs pointent entre eux).
2. Exposer la salle de jeux sur une route dédiée (ex. `/jeux` ou `/play`) qui rend `BeauJeux`.
3. `BeauJeux` gère : l'entrée (saisie du nom), la langue, la grille de cartes, et le rendu d'un jeu avec bouton retour. Il passe `lang` à chaque jeu : `<Comp lang={lang} />`.

Clés `localStorage` utilisées (préfixe `beau_`) :
- `beau_name` : nom affiché du joueur.
- `beau_lang` : `"fr"` ou `"en"`.
- `beau_paris` : liste locale des paris scellés.
- `beau_quiz` : historique local des réponses au quiz (par semaine ISO).

Tout est local pour l'instant. Aucune dépendance réseau hors la police Google (déjà chargée par BEAU, sinon `@import` Cormorant).

## 3. Le pari scellé : principe technique

Commit-reveal via Web Crypto (SHA-256), sans serveur :
- Sceller : empreinte de `prediction ␟ deadline ␟ createdAt ␟ salt` (séparateur U+241F), `salt` aléatoire 8 octets. On ne stocke/partage que l'empreinte (le "sceau").
- Révéler : on émet un jeton `BEAU1:` + base64(JSON `{p,d,c,s,h,m}`). L'onglet Vérifier recalcule l'empreinte et confirme la correspondance mot pour mot.
- Mises symboliques (honneur, café). Jamais d'argent réel : ce n'est pas un produit de pari. Sensibilité GCC à respecter.

## 4. Le quiz du Souffleur

Banque de 12 dilemmes patrimoniaux bilingues. La "question de la semaine" est déterministe : `numéro de semaine ISO % taille de la banque`, donc identique pour tous sur une semaine donnée, sans serveur. Toujours cadré en principes et repères, jamais en conseil financier personnalisé (mention présente en pied de carte).

## 5. Langue et copie

- Interface BEAU en anglais par défaut côté produit ; le bouton FR/EN du portail pilote tout et persiste dans `beau_lang`.
- Copie UI : éviter les tirets cadratins (caractère em dash) dans les textes produit. Le tiret "—" utilisé comme marque de voix du Souffleur est un parti pris typographique : le conserver tel quel, ou le remplacer par un filet plus discret, à valider avant application.
- Ne jamais afficher de thème sombre or/noir. Garder la palette quiet luxury.

## 6. Base de données : seulement quand le partage arrive

Rien n'est requis aujourd'hui. Prévoir Supabase uniquement pour trois usages précis, le jour venu :

- Quiz : synchro de l'historique entre appareils et classement/streaks partagés.
- Pari scellé : paris croisés vérifiables entre deux personnes (A scelle, partage le sceau, B prend le contre, chacun révèle à l'échéance), et un mur public des paris révélés.
- Identité : rattacher `beau_name` au compte BEAU existant plutôt qu'au `localStorage`.

Esquisse de schéma (à affiner) :
- `quiz_answers(user_id, week_key, idx, pick, created_at)` : historique + agrégats.
- `wagers(id, user_id, deadline, created_at, seal_hash, stake, revealed bool, outcome)` : le sceau est public, la prédiction reste hors base jusqu'à révélation.
- `wager_reveals(wager_id, prediction, salt)` : écrit seulement à la révélation ; permet la vérification côté serveur.
- `wager_challenges(wager_id, challenger_id, counter_seal_hash)` : paris croisés.

Le code actuel isole déjà le stockage (fonctions `load*/save*` sur `localStorage`). Le raccordement Supabase remplace ces fonctions, le reste des composants ne bouge pas.

## 7. Backlog

### P1 — Intégrer tel quel
- Copier les composants dans `src/games/`, router `BeauJeux`, vérifier le rendu des sept jeux et du bouton FR/EN.
- Remettre `beau-jeux.jsx` (hub Vite) à parité avec le portail HTML : importer `BeauQuizSouffleur` et `BeauPariScelle`, ajouter l'entrée par le nom, le bouton FR/EN, la persistance `beau_name`/`beau_lang`, et passer `lang` à chaque jeu. Retirer les cartes "À venir".

### P2 — Bilingue complet
- Ajouter la table de chaînes FR/EN et la prop `lang` aux cinq jeux classiques (Échecs, Tawla, Sudoku, Escales, Puissance 4). Ordre conseillé, du plus léger au plus lourd : Puissance 4, Sudoku, Tawla, Échecs, Escales.
- Modèle à suivre : voir `beau-quiz-souffleur.jsx` et `beau-pari-scelle.jsx` (objet `STR`/`UI` par langue, `const t = STR[lang] || STR.fr`, prop `function Comp({ lang = "fr" })`).

### P3 — Supabase (quand le partage est décidé)
- Brancher `quiz_answers` et `wagers`/`wager_reveals` selon le schéma ci-dessus.
- Rattacher l'identité au compte BEAU.
- Classement quiz et mur des paris révélés.
