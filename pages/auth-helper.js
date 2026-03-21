// ═══════════════════════════════════════════════════════════
// APEX INVEST — Auth Helper (GitHub Pages / Supabase + fallback localStorage)
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://vsukkuqcbgsdknlmvbhs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yjBSLfDA_G1TnoSmgEGAHw_yJpcid26';

// Initialisation Supabase — si ça échoue, db reste null et on bascule sur localStorage
let db = null;
try {
  const { createClient } = supabase;
  db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) {
  console.warn('[APEX] Supabase init failed:', e.message);
}

// ── Timeout wrapper ────────────────────────────────────────────────────────────
function withTimeout(promise, ms = 5000) {
  const t = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );
  return Promise.race([promise, t]);
}

// ── Session localStorage (fallback) ───────────────────────────────────────────
const LS_KEY = 'apex_session';
function lsSetSession(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
function lsGetSession()      { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; } }
function lsClearSession()    { localStorage.removeItem(LS_KEY); }

// ── Détection chemin de base (GitHub Pages vs local) ──────────────────────────
function basePath() {
  const segs = window.location.pathname.split('/').filter(Boolean);
  const pagesIdx = segs.indexOf('pages');
  if (pagesIdx >= 0) return pagesIdx > 0 ? '/' + segs.slice(0, pagesIdx).join('/') : '';
  const lastSeg = segs[segs.length - 1] || '';
  const base = lastSeg.includes('.') ? segs.slice(0, -1) : segs;
  return base.length > 0 ? '/' + base.join('/') : '';
}
const BASE = basePath();
function url(path) { return BASE + path; }
function redirect(path) { window.location.href = url(path); }

// ── Guards ────────────────────────────────────────────────────────────────────
async function requireAuth() {
  // Check localStorage first (instant)
  if (lsGetSession()) return lsGetSession();
  // Then Supabase with timeout
  if (db) {
    try {
      const { data: { session } } = await withTimeout(db.auth.getSession());
      if (session) { lsSetSession({ id: session.user.id, email: session.user.email }); return session; }
    } catch(e) {}
  }
  redirect('/pages/login.html');
}

async function requireGuest() {
  // Already logged in via localStorage?
  if (lsGetSession()) { redirect('/pages/academy.html'); return; }
  // Try Supabase with timeout (don't block page if Supabase is slow)
  if (db) {
    try {
      const { data: { session } } = await withTimeout(db.auth.getSession(), 3000);
      if (session) { lsSetSession({ id: session.user.id, email: session.user.email }); redirect('/pages/academy.html'); }
    } catch(e) { /* Supabase inaccessible — on reste sur la page */ }
  }
}

async function signOut() {
  lsClearSession();
  if (db) { try { await withTimeout(db.auth.signOut()); } catch(e) {} }
  redirect('/pages/login.html');
}

// ── Messages UI ───────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 7000);
}
function showSuccess(msg) {
  const el = document.getElementById('success-msg');
  if (!el) return;
  el.innerHTML = msg;
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
  if (!msg) return 'Une erreur est survenue.';
  for (const [key, fr] of Object.entries(ERR_MAP)) {
    if (msg.includes(key)) return fr;
  }
  return msg;
}
