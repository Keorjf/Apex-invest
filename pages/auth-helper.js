// ═══════════════════════════════════════════════════════════
// APEX INVEST — Auth Helper (GitHub Pages / Supabase)
// Aucune dépendance Netlify — 100% statique
// ═══════════════════════════════════════════════════════════

// ⚠️  Configure tes clés Supabase ici
const SUPABASE_URL      = 'https://vsukkuqcbgsdknlmvbhs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yjBSLfDA_G1TnoSmgEGAHw_yJpcid26';

// Initialisation Supabase (chargé via CDN dans chaque page)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Détection du chemin de base (GitHub Pages vs local) ──────────────────────
// GitHub Pages : /NOM-REPO/pages/login.html  →  base = /NOM-REPO
// Local / domaine perso : /pages/login.html  →  base = ''
function basePath() {
  const segs = window.location.pathname.split('/');
  // Si on est dans /pages/, le segment avant est soit le repo soit ''
  const pagesIdx = segs.indexOf('pages');
  if (pagesIdx > 1) return '/' + segs.slice(1, pagesIdx).join('/');
  return '';
}
const BASE = basePath();

function url(path) { return BASE + path; }

// ── Redirections ──────────────────────────────────────────────────────────────
function redirect(path) { window.location.href = url(path); }

// ── Guards ────────────────────────────────────────────────────────────────────
async function requireAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) redirect('/pages/login.html');
  return session;
}
async function requireGuest() {
  const { data: { session } } = await db.auth.getSession();
  if (session) redirect('/app.html');
}

// ── Profil utilisateur ────────────────────────────────────────────────────────
async function getUserProfile(userId) {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).single();
  if (error) console.error('[APEX Auth] profile fetch:', error.message);
  return data;
}

// ── Messages UI ───────────────────────────────────────────────────────────────
function showError(msg) {
  let el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}
function showSuccess(msg) {
  let el = document.getElementById('success-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

// ── Traduction erreurs Supabase → FR ──────────────────────────────────────────
const ERR_MAP = {
  'Invalid login credentials'    : 'Email ou mot de passe incorrect.',
  'Email not confirmed'          : 'Confirme ton email avant de te connecter.',
  'Too many requests'            : 'Trop de tentatives. Attends quelques minutes.',
  'User already registered'      : 'Cet email est déjà utilisé.',
  'Password should be at least 6': 'Le mot de passe doit faire 8 caractères minimum.',
  'Email rate limit exceeded'    : 'Trop d\'emails envoyés. Réessaie dans quelques minutes.',
};
function translateError(msg) {
  for (const [key, fr] of Object.entries(ERR_MAP)) {
    if (msg && msg.includes(key)) return fr;
  }
  return msg || 'Une erreur est survenue.';
}
