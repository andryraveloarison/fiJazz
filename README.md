# Fihirana Jazz

Lecteur de cantiques **FFPM en version jazz**. Liste des chants (recherche par titre ou numéro),
lecture avec mini-lecteur (lecture/pause, précédent/suivant, barre de progression, enchaînement
automatique), et un espace **admin** protégé par mot de passe pour ajouter / renommer / supprimer.

Stack : Vite + React + TypeScript + Supabase (DB + Storage), Docker pour le dev,
**Capacitor → APK Android** construit par GitHub Actions.

## 1. Supabase

1. Dans Supabase → **SQL Editor**, exécuter `sql/schema.sql` (crée la table `chants`,
   le bucket Storage public `chants`, et les fonctions admin).
2. Mot de passe admin par défaut : **`okayokay`** (stocké haché bcrypt, vérifié côté Postgres).
   Pour le changer : `update chant_admin set mdp_hash = crypt('nouveau', gen_salt('bf'));`

Le même projet Supabase que Nakaiza peut servir : les noms de tables ne se chevauchent pas.

## 2. Dev local

```bash
cp .env.example .env      # renseigner VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
docker compose up         # http://localhost:5173
# ou : npm install && npm run dev
```

## 3. APK via GitHub

1. Créer le repo `fiJazz` sur GitHub et pousser :
   ```bash
   git remote add origin git@github.com:andryraveloarison/fiJazz.git
   git push -u origin main
   ```
2. Repo → Settings → Secrets and variables → Actions → ajouter
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Chaque push sur `main` lance le workflow **Android APK** (`.github/workflows/android.yml`) :
   l'APK est dans l'onglet **Actions** (artifact) et dans **Releases**.
   Lien direct vers la dernière version :
   `https://github.com/andryraveloarison/fiJazz/releases/latest/download/fihirana-jazz.apk`

Le dossier `android/` n'est pas commité : il est généré en CI (`cap add android`).
Icônes : `assets/*.png` générés depuis `public/logo.svg` via `npm run icons`.

## Admin

Icône cadenas en haut à droite → mot de passe → ajouter un chant (n° FFPM optionnel, titre,
fichier audio), modifier le titre/numéro (crayon), supprimer (corbeille).

⚠️ Sans Supabase Auth, l'upload/suppression de **fichiers** dans le bucket est ouvert au rôle
anon ; seule la **table** `chants` est protégée par le mot de passe.
