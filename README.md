# BEAU · Salle de jeux du Souffleur

Module ludique de BEAU Capital : sept tables (Échecs, Tawla, Sudoku, Escales, Puissance 4, Quiz du Souffleur, Pari scellé), bilingues FR/EN, esthétique quiet luxury (ivoire, encre, terracotta, pétrole, Cormorant Garamond).

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173/jeux
npm run build
```

La salle de jeux est servie sur `/jeux` (`/play` et toute autre route y redirigent). `vercel.json` réécrit les routes vers `index.html`.

## Structure

| Fichier | Rôle |
|---|---|
| `src/games/beau-jeux.jsx` | Hub `BeauJeux` : entrée par le nom, bouton FR/EN, grille, rendu d'un jeu avec retour. Passe `lang` à chaque jeu. |
| `src/games/beau-*.jsx` | Les sept jeux. Chacun : `function Comp({ lang = "fr" })`, table `STR`/`UI` par langue. |
| `src/games/storage.js` | Tout le stockage : `localStorage` (`beau_name`, `beau_lang`, `beau_paris`, `beau_quiz`) et synchronisation Supabase. |
| `src/lib/supabase.js` | Client Supabase, `null` si non configuré. |
| `supabase/migrations/` | Schéma de la salle de jeux pour le projet BEAU Treasury. |
| `docs/` | Brief d'origine et démo HTML autonome (référence, non intégrée). |

Langue par défaut : anglais. Le choix FR/EN persiste dans `beau_lang`.

## Supabase (projet BEAU Treasury `lxlpunmdywbhlwifgcpx`)

Sans configuration, tout reste local. Pour relier la salle à BEAU :

1. Appliquer `supabase/migrations/20261011120000_salle_de_jeux.sql` sur le projet (SQL Editor, ou `supabase db push`). La migration ne fait qu'ajouter des tables et des fonctions.
2. Copier `.env.example` en `.env.local` et renseigner `VITE_SUPABASE_ANON_KEY` (clé publishable/anon, jamais la `service_role`).
3. Dans Auth > URL Configuration, ajouter l'URL de la salle aux Redirect URLs (lien de connexion par e-mail).

Ce que ça active :

- **Identité** : connexion avec le compte BEAU existant (mot de passe ou lien e-mail, sans création de compte). Le nom affiché vit dans `player_profiles`.
- **Quiz** : `quiz_answers` (une réponse par semaine ISO, définitive), historique synchronisé entre appareils, répartition des réponses de la salle (`quiz_week_stats`) et classement par assiduité (`quiz_leaderboard`).
- **Pari scellé** : `wagers` ne reçoit que le sceau (empreinte, échéance, mise). La prédiction et le sel restent sur l'appareil jusqu'à la révélation, écrite dans `wager_reveals` : la base recalcule le SHA-256 et refuse toute révélation non concordante. Un sceau ne peut plus être modifié. Mur public des paris révélés (`wager_wall`).
- **Paris croisés** : table `wager_challenges` prête (contre-sceau, révélation vérifiée), interface à venir.

Mises symboliques uniquement : BEAU n'est pas une salle de paris.
