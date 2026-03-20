-- ═══════════════════════════════════════════════════════════════
-- APEX INVEST — Schéma Supabase
-- Optimisé pour 100 000+ utilisateurs
-- ═══════════════════════════════════════════════════════════════

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────────────────────
-- TABLE PROFILS (extension de auth.users)
-- ───────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  level         TEXT DEFAULT 'Débutant' CHECK (level IN ('Débutant','Intermédiaire','Avancé','Expert')),
  coins         INTEGER DEFAULT 500 CHECK (coins >= 0),
  xp            INTEGER DEFAULT 0 CHECK (xp >= 0),
  streak        INTEGER DEFAULT 0,
  last_play_date DATE,
  diag_profile  TEXT,
  diag_done     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────
-- TABLE PROGRESSION LEÇONS
-- ───────────────────────────────────────
CREATE TABLE public.lesson_progress (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id     TEXT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  quiz_score    INTEGER,
  UNIQUE(user_id, lesson_id)
);

-- ───────────────────────────────────────
-- TABLE PORTEFEUILLE (positions)
-- ───────────────────────────────────────
CREATE TABLE public.positions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id      TEXT NOT NULL,
  quantity      DECIMAL(18,8) DEFAULT 0,
  avg_price     DECIMAL(18,4) DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_id)
);

-- ───────────────────────────────────────
-- TABLE JOURNAL DES TRANSACTIONS
-- ───────────────────────────────────────
CREATE TABLE public.transactions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('buy','sell','limit','event','mission','lesson')),
  asset_id      TEXT,
  asset_name    TEXT,
  amount        DECIMAL(18,4),
  price         DECIMAL(18,4),
  quantity      DECIMAL(18,8),
  gain_loss     DECIMAL(18,4),
  annotation    TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────
-- TABLE MISSIONS
-- ───────────────────────────────────────
CREATE TABLE public.mission_progress (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id    TEXT NOT NULL,
  progress      INTEGER DEFAULT 0,
  claimed       BOOLEAN DEFAULT FALSE,
  claimed_at    TIMESTAMPTZ,
  UNIQUE(user_id, mission_id)
);

-- ───────────────────────────────────────
-- TABLE ORDRES LIMITES EN ATTENTE
-- ───────────────────────────────────────
CREATE TABLE public.limit_orders (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id      TEXT NOT NULL,
  side          TEXT NOT NULL CHECK (side IN ('buy','sell')),
  amount        DECIMAL(18,4) NOT NULL,
  target_price  DECIMAL(18,4) NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','executed','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  executed_at   TIMESTAMPTZ
);

-- ───────────────────────────────────────
-- TABLE ACCEPTATION CGU
-- ───────────────────────────────────────
CREATE TABLE public.terms_acceptance (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  version       TEXT NOT NULL DEFAULT '1.0',
  accepted_at   TIMESTAMPTZ DEFAULT NOW(),
  ip_address    INET,
  UNIQUE(user_id, version)
);

-- ═══════════════════════════════════════════════════════════════
-- INDEX (performance 100k+ utilisateurs)
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_positions_user ON public.positions(user_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_mission_progress_user ON public.mission_progress(user_id);
CREATE INDEX idx_limit_orders_user ON public.limit_orders(user_id);
CREATE INDEX idx_limit_orders_status ON public.limit_orders(status) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — chaque user ne voit que ses données
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Policies profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies tables utilisateur
CREATE POLICY "lesson_select_own" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "positions_select_own" ON public.positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "transactions_select_own" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "missions_select_own" ON public.mission_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "limit_orders_select_own" ON public.limit_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "terms_select_own" ON public.terms_acceptance FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER : création automatique du profil à l'inscription
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER : mise à jour updated_at automatique
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
