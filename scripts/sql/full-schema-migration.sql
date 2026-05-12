-- =============================================================================
-- MINT — Full Schema Migration
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query)
-- Safe to run multiple times — uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  first_name      text,
  last_name       text,
  phone           text,
  id_number       text,
  avatar_url      text,
  date_of_birth   date,
  nationality     text,
  address         text,
  city            text,
  postal_code     text,
  country         text DEFAULT 'ZA',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. WALLETS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance         numeric(18,4) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'ZAR',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own wallet" ON wallets;
CREATE POLICY "Users can manage own wallet" ON wallets FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  body            text,
  type            text NOT NULL DEFAULT 'system',
  payload         jsonb,
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. REQUIRED_ACTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS required_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_linked     boolean NOT NULL DEFAULT false,
  bank_in_review  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE required_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own required_actions" ON required_actions;
CREATE POLICY "Users can manage own required_actions" ON required_actions FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. USER_ONBOARDING
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_onboarding (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_status          text,
  sumsub_raw          jsonb,
  sumsub_applicant_id text,
  is_fully_onboarded  boolean NOT NULL DEFAULT false,
  employment_details  jsonb,
  mandate_signed      boolean NOT NULL DEFAULT false,
  risk_disclosure     boolean NOT NULL DEFAULT false,
  source_of_funds     text,
  bank_account        jsonb,
  terms_accepted      boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own onboarding" ON user_onboarding;
CREATE POLICY "Users can manage own onboarding" ON user_onboarding FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. USER_ONBOARDING_PACK_DETAILS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_onboarding_pack_details (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_details    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE user_onboarding_pack_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own pack details" ON user_onboarding_pack_details;
CREATE POLICY "Users can manage own pack details" ON user_onboarding_pack_details FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. TRANSACTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id    uuid,
  type                text,
  direction           text,
  amount              numeric(18,4),
  description         text,
  store_reference     text,
  status              text DEFAULT 'pending',
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

-- ---------------------------------------------------------------------------
-- 8. INVESTMENT_GOALS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text,
  target_amount   numeric(18,4),
  current_amount  numeric(18,4) DEFAULT 0,
  target_date     date,
  strategy_id     uuid,
  icon            text,
  color           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own goals" ON investment_goals;
CREATE POLICY "Users can manage own goals" ON investment_goals FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. FAMILY_MEMBERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_members (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id         uuid REFERENCES auth.users(id),
  linked_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  relationship            text CHECK (relationship IN ('spouse', 'child')),
  first_name              text,
  last_name               text DEFAULT '',
  date_of_birth           date,
  avatar_url              text,
  mint_number             text DEFAULT '',
  spouse_email            text,
  certificate_url         text,
  certificate_uploaded_at timestamptz,
  available_balance       bigint DEFAULT 0,
  signed_agreement_url    text,
  signed_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own family members" ON family_members;
CREATE POLICY "Users can manage their own family members" ON family_members
  FOR ALL USING (auth.uid() = primary_user_id) WITH CHECK (auth.uid() = primary_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_primary_user_id ON family_members (primary_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_relationship ON family_members (relationship);

-- ---------------------------------------------------------------------------
-- 10. STRATEGIES_C  (table may already exist — only add missing columns)
-- ---------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN name text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN slug text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN short_name text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN description text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN risk_level text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN objective text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN sector text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN tags text[]; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN base_currency text DEFAULT 'ZAR'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN min_investment numeric(18,4); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN provider_name text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN benchmark_symbol text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN benchmark_name text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN fee_type text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN management_fee_bps numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN performance_fee_pct numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN high_water_mark boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN status text DEFAULT 'active'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN is_public boolean DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN is_featured boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN is_child_friendly boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN icon_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN image_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN holdings jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN created_at timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE strategies_c ADD COLUMN updated_at timestamptz DEFAULT now(); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 11. STRATEGIES_RETURNS_C
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategies_returns_c (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id     uuid NOT NULL,
  as_of_date      date NOT NULL,
  ytd_pct         numeric,
  "5d_pct"        numeric,
  "1m_pct"        numeric,
  "6m_pct"        numeric,
  "1y_pct"        numeric,
  nav             numeric,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, as_of_date)
);
ALTER TABLE strategies_returns_c ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read strategy returns" ON strategies_returns_c;
CREATE POLICY "Authenticated can read strategy returns" ON strategies_returns_c FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_strategies_returns_c_strategy_date ON strategies_returns_c (strategy_id, as_of_date DESC);

-- ---------------------------------------------------------------------------
-- 12. CLIENT_STRATEGY_RETURNS_C
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_strategy_returns_c (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id         uuid NOT NULL,
  as_of_date          date NOT NULL,
  basket_value        numeric,
  holdings_snapshot   jsonb,
  ytd_pct             numeric,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, strategy_id, as_of_date)
);
ALTER TABLE client_strategy_returns_c ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own strategy returns" ON client_strategy_returns_c;
CREATE POLICY "Users can read own strategy returns" ON client_strategy_returns_c FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_client_strategy_returns_user_strategy ON client_strategy_returns_c (user_id, strategy_id, as_of_date DESC);

-- ---------------------------------------------------------------------------
-- 13. SECURITIES_C
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS securities_c (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol          text NOT NULL UNIQUE,
  name            text,
  logo_url        text,
  sector          text,
  exchange        text,
  market_cap      numeric,
  dividend_yield  numeric,
  pe              numeric,
  last_price      numeric,
  description     text,
  isin            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE securities_c ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read securities" ON securities_c;
CREATE POLICY "Authenticated can read securities" ON securities_c FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_securities_c_symbol ON securities_c (symbol);

-- ---------------------------------------------------------------------------
-- 14. STOCK_INTRADAY_C
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_intraday_c (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id     uuid REFERENCES securities_c(id) ON DELETE CASCADE,
  symbol          text,
  current_price   numeric,
  "1d_pct"        numeric,
  "1d_abs"        numeric,
  volume          bigint,
  timestamp       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_intraday_c ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read intraday" ON stock_intraday_c;
CREATE POLICY "Authenticated can read intraday" ON stock_intraday_c FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_stock_intraday_c_security_ts ON stock_intraday_c (security_id, timestamp DESC);

-- ---------------------------------------------------------------------------
-- 15. STOCK_RETURNS_C
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_returns_c (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id     uuid REFERENCES securities_c(id) ON DELETE CASCADE,
  symbol          text,
  as_of_date      date NOT NULL,
  r_1d            numeric,
  r_1w            numeric,
  r_1m            numeric,
  r_3m            numeric,
  r_6m            numeric,
  r_ytd           numeric,
  r_1y            numeric,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (security_id, as_of_date)
);
ALTER TABLE stock_returns_c ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read stock returns" ON stock_returns_c;
CREATE POLICY "Authenticated can read stock returns" ON stock_returns_c FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 16. STOCK_HOLDINGS_C
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_holdings_c (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id     uuid,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  symbol          text,
  name            text,
  quantity        numeric,
  avg_fill        numeric,
  last_price      numeric,
  market_value    numeric,
  unrealized_pnl  numeric,
  logo_url        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_holdings_c ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own stock holdings" ON stock_holdings_c;
CREATE POLICY "Users can manage own stock holdings" ON stock_holdings_c FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_stock_holdings_c_user_id ON stock_holdings_c (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_holdings_c_family_member_id ON stock_holdings_c (family_member_id);

-- ---------------------------------------------------------------------------
-- 17. STOCK_HOLDINGS  (used by server-side portfolio endpoint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_holdings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          text,
  name            text,
  quantity        numeric,
  avg_fill        numeric,
  last_price      numeric,
  market_value    numeric,
  unrealized_pnl  numeric,
  strategy_id     uuid,
  logo_url        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own holdings" ON stock_holdings;
CREATE POLICY "Users can manage own holdings" ON stock_holdings FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_stock_holdings_user_id ON stock_holdings (user_id);

-- ---------------------------------------------------------------------------
-- 18. NEWS_ARTICLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "News_articles" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  author          text,
  published_at    timestamptz,
  body            text,
  source          text,
  image_url       text,
  topics          text[],
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "News_articles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read news" ON "News_articles";
CREATE POLICY "Authenticated can read news" ON "News_articles" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Service role can write news" ON "News_articles";
CREATE POLICY "Service role can write news" ON "News_articles" FOR ALL TO service_role USING (true);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON "News_articles" (published_at DESC);

-- ---------------------------------------------------------------------------
-- 19. CREDIT_ACCOUNTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_limit    numeric(18,4) DEFAULT 0,
  balance         numeric(18,4) DEFAULT 0,
  status          text DEFAULT 'inactive',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own credit account" ON credit_accounts;
CREATE POLICY "Users can manage own credit account" ON credit_accounts FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 20. CREDIT_SCORE_HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_score_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score           integer,
  source          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE credit_score_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own credit score history" ON credit_score_history;
CREATE POLICY "Users can read own credit score history" ON credit_score_history FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_credit_score_history_user_created ON credit_score_history (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 21. LOAN_ENGINE_SCORE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_engine_score (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score           numeric,
  breakdown       jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE loan_engine_score ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own loan engine score" ON loan_engine_score;
CREATE POLICY "Users can read own loan engine score" ON loan_engine_score FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 22. LOAN_APPLICATION
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_application (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          numeric(18,4),
  term_months     integer,
  interest_rate   numeric,
  status          text DEFAULT 'pending',
  purpose         text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE loan_application ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own loan applications" ON loan_application;
CREATE POLICY "Users can manage own loan applications" ON loan_application FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_loan_application_user_id ON loan_application (user_id);

-- ---------------------------------------------------------------------------
-- 23. CREDIT_TRANSACTIONS_HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_transactions_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id         uuid REFERENCES loan_application(id),
  amount          numeric(18,4),
  type            text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE credit_transactions_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own credit transactions" ON credit_transactions_history;
CREATE POLICY "Users can read own credit transactions" ON credit_transactions_history FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_credit_txn_user_id ON credit_transactions_history (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 24. TRUID_BANK_SNAPSHOTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truid_bank_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data            jsonb,
  provider        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE truid_bank_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own bank snapshots" ON truid_bank_snapshots;
CREATE POLICY "Users can manage own bank snapshots" ON truid_bank_snapshots FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 25. DOCUMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text,
  url             text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
CREATE POLICY "Users can manage own documents" ON documents FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 26. LOAN_DOCUMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         uuid REFERENCES loan_application(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url             text,
  type            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE loan_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own loan documents" ON loan_documents;
CREATE POLICY "Users can manage own loan documents" ON loan_documents FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 27. INSURANCE_POLICIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insurance_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text,
  status          text DEFAULT 'active',
  premium         numeric,
  cover_amount    numeric,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own policies" ON insurance_policies;
CREATE POLICY "Users can manage own policies" ON insurance_policies FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 28. ORDER_EMAILS  (Resend email log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_emails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email_type      text,
  recipient       text,
  subject         text,
  resend_id       text,
  status          text DEFAULT 'sent',
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can write order emails" ON order_emails;
CREATE POLICY "Service role can write order emails" ON order_emails FOR ALL TO service_role USING (true);

-- ---------------------------------------------------------------------------
-- 29. Realtime subscriptions: enable tables needed by frontend
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE required_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_intraday_c;

-- ---------------------------------------------------------------------------
-- 30. Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('documents', 'documents', false, 20971520, ARRAY['application/pdf','image/jpeg','image/png']),
  ('birth-certificates', 'birth-certificates', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/heic']),
  ('signed-agreements', 'signed-agreements', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for avatars (public read, own write)
DO $$ BEGIN
  CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage RLS for documents (own access only)
DO $$ BEGIN
  CREATE POLICY "Users can manage own documents storage" ON storage.objects FOR ALL USING (bucket_id = 'documents' AND split_part(name, '/', 1) = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can upload own birth certificates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'birth-certificates' AND split_part(name, '/', 1) = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can view own birth certificates" ON storage.objects FOR SELECT USING (bucket_id = 'birth-certificates' AND split_part(name, '/', 1) = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can upload own agreements" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signed-agreements' AND split_part(name, '/', 1) = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can view own agreements" ON storage.objects FOR SELECT USING (bucket_id = 'signed-agreements' AND split_part(name, '/', 1) = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Parent → child wallet transfer function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_parent_to_child_wallet(
  p_parent_user_id uuid,
  p_family_member_id uuid,
  p_amount_cents bigint,
  p_reference text DEFAULT NULL
)
RETURNS TABLE (parent_balance_cents bigint, child_balance_cents bigint, transfer_reference text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_child_primary_user_id uuid;
  v_child_relationship text;
  v_child_first_name text;
  v_child_current_balance_cents bigint;
  v_parent_current_balance_cents bigint;
  v_parent_new_balance_cents bigint;
  v_child_new_balance_cents bigint;
  v_ref text;
BEGIN
  IF p_parent_user_id IS NULL THEN RAISE EXCEPTION 'Parent user id is required.'; END IF;
  IF p_family_member_id IS NULL THEN RAISE EXCEPTION 'family_member_id is required.'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'Amount must be a positive integer in cents.'; END IF;

  SELECT fm.primary_user_id, fm.relationship, fm.first_name, COALESCE(fm.available_balance, 0)
  INTO v_child_primary_user_id, v_child_relationship, v_child_first_name, v_child_current_balance_cents
  FROM family_members fm WHERE fm.id = p_family_member_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child account not found.'; END IF;
  IF v_child_relationship <> 'child' THEN RAISE EXCEPTION 'Transfers are only supported for child accounts.'; END IF;
  IF v_child_primary_user_id <> p_parent_user_id THEN RAISE EXCEPTION 'You can only transfer to your own children.'; END IF;

  SELECT ROUND(COALESCE(w.balance, 0)::numeric * 100)::bigint INTO v_parent_current_balance_cents
  FROM wallets w WHERE w.user_id = p_parent_user_id FOR UPDATE;
  IF v_parent_current_balance_cents IS NULL THEN RAISE EXCEPTION 'Parent wallet not found.'; END IF;
  IF v_parent_current_balance_cents < p_amount_cents THEN RAISE EXCEPTION 'Insufficient wallet balance.'; END IF;

  v_parent_new_balance_cents := v_parent_current_balance_cents - p_amount_cents;
  v_child_new_balance_cents  := v_child_current_balance_cents + p_amount_cents;

  UPDATE wallets SET balance = (v_parent_new_balance_cents::numeric / 100), updated_at = now() WHERE user_id = p_parent_user_id;
  UPDATE family_members SET available_balance = v_child_new_balance_cents WHERE id = p_family_member_id;

  v_ref := COALESCE(NULLIF(p_reference, ''), 'CHILD-TRF-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6));

  INSERT INTO transactions (user_id, family_member_id, type, direction, amount, description, store_reference, status)
  VALUES
    (p_parent_user_id, p_family_member_id, 'transfer_out', 'debit', p_amount_cents, 'Transfer to ' || COALESCE(v_child_first_name, 'child') || '''s account', v_ref, 'completed'),
    (p_parent_user_id, p_family_member_id, 'transfer_in', 'credit', p_amount_cents, 'Received from parent', v_ref, 'completed');

  RETURN QUERY SELECT v_parent_new_balance_cents, v_child_new_balance_cents, v_ref;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_parent_to_child_wallet(uuid, uuid, bigint, text) TO authenticated, service_role;

COMMIT;

-- =============================================================================
-- DONE. Tables created / updated:
--   profiles, wallets, notifications, required_actions,
--   user_onboarding, user_onboarding_pack_details, transactions,
--   investment_goals, family_members, strategies_c (columns added),
--   strategies_returns_c, client_strategy_returns_c, securities_c,
--   stock_intraday_c, stock_returns_c, stock_holdings_c, stock_holdings,
--   News_articles, credit_accounts, credit_score_history, loan_engine_score,
--   loan_application, credit_transactions_history, truid_bank_snapshots,
--   documents, loan_documents, insurance_policies, order_emails
-- Storage buckets: avatars, documents, birth-certificates, signed-agreements
-- =============================================================================
