# APEX Invest — Auth System
## Stack : Supabase (Auth + BDD) · GitHub Pages (Hébergement statique)

---

## 📁 Structure

```
apex-auth/
├── pages/
│   ├── auth-helper.js        ← ⚠️ À configurer (tes clés Supabase)
│   ├── login.html
│   ├── register.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   └── terms.html
├── schema.sql                ← À exécuter dans Supabase SQL Editor
├── _config.yml               ← Désactive Jekyll (GitHub Pages)
└── README.md
```

---

## 🚀 Déploiement en 4 étapes

### ÉTAPE 1 — Créer un projet Supabase (gratuit)

1. Va sur https://supabase.com → **New Project**
2. Choisis **Frankfurt** (EU — RGPD)
3. Note ton **Project URL** et **Anon Key** (Settings → API)
4. Dans **SQL Editor**, copie-colle et exécute `schema.sql`

### ÉTAPE 2 — Configurer Supabase Auth

Dans le dashboard Supabase → **Authentication → URL Configuration** :

```
Site URL :       https://TON-USERNAME.github.io/TON-REPO
Redirect URLs :  https://TON-USERNAME.github.io/TON-REPO/pages/login.html
                 https://TON-USERNAME.github.io/TON-REPO/pages/reset-password.html
```

Pour le **login Google** (optionnel) :
- Authentication → Providers → Google → Active
- Crée un projet sur https://console.cloud.google.com → OAuth 2.0
- Colle Client ID + Secret dans Supabase

### ÉTAPE 3 — Configurer auth-helper.js

Ouvre `pages/auth-helper.js` et remplace les 2 lignes :

```javascript
const SUPABASE_URL      = 'https://VOTRE_PROJET.supabase.co';  // ← ton URL
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';                    // ← ta clé anon
```

### ÉTAPE 4 — Déployer sur GitHub Pages

1. Push ce dossier sur un repo GitHub
2. Settings → Pages → **Branch: main** → **/ (root)**
3. Ton site sera sur `https://TON-USERNAME.github.io/TON-REPO`

---

## 🔗 Intégrer l'auth dans apex-v3.html

Ajoute ceci **avant `</body>`** dans `apex-v3.html` (renommé `app.html`) :

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="pages/auth-helper.js"></script>
<script>
(async () => {
  const session = await requireAuth(); // Redirige vers login si non connecté
  if (!session) return;

  const profile = await getUserProfile(session.user.id);
  if (profile) {
    // Injecter la progression sauvegardée
    if (profile.level)  document.getElementById('tbLvl').textContent   = profile.level;
    if (profile.xp)     document.getElementById('tbXP').textContent    = '⚡ ' + profile.xp + ' XP';
    if (profile.coins)  document.getElementById('tbWallet').textContent = '🪙 ' + profile.coins;
    if (profile.streak) document.getElementById('tbStreak').textContent = '🔥 ' + profile.streak + 'j';
  }

  // Bouton déconnexion (ajoute un bouton #logoutBtn dans la navbar de apex-v3)
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await db.auth.signOut();
    redirect('/pages/login.html');
  });
})();
</script>
```

---

## 🔒 Sécurité

- Mots de passe hashés par Supabase (bcrypt)
- JWT avec expiration automatique
- Row Level Security (RLS) : chaque user ne voit que ses données
- Email de confirmation obligatoire à l'inscription
- Reset password : token à usage unique, valable 1h

---

## 🇫🇷 RGPD

- CGU complètes dans `pages/terms.html`
- Acceptation CGU tracée (date + version) en BDD
- Données en EU (Frankfurt)
- **À compléter dans terms.html** : [Nom société], [SIRET], [Adresse], [Médiateur]
