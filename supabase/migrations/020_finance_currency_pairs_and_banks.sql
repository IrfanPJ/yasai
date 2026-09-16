-- ─── Reusable bank profiles ──────────────────────────────────────
-- Enter a bank's details once (on a Fund Collection/Transfer, or in
-- Settings), pick it from a dropdown everywhere after.
CREATE TABLE public.bank_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name         TEXT NOT NULL,
  account_holder    TEXT,
  -- Empty string (not NULL) so the unique constraint below actually
  -- catches duplicates — Postgres treats every NULL as distinct.
  account_number    TEXT NOT NULL DEFAULT '',
  swift_code        TEXT,
  currency          TEXT NOT NULL DEFAULT 'AED',
  country           TEXT,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_name, account_number)
);

ALTER TABLE public.bank_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select bank_profiles" ON public.bank_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert bank_profiles" ON public.bank_profiles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update bank_profiles" ON public.bank_profiles
  FOR UPDATE TO authenticated USING (true);

-- ─── Fund Collections: source/destination currency pair ─────────
-- `currency` (existing column, kept as-is to avoid touching every
-- reference to it) is now explicitly the SOURCE currency collected.
-- `destination_currency` is what it converts to; `transfer_rate`
-- (already existed) is the rate between the two.
ALTER TABLE public.fund_collections
  ALTER COLUMN currency SET DEFAULT 'SAR',
  ADD COLUMN destination_currency TEXT NOT NULL DEFAULT 'AED',
  ADD COLUMN bank_profile_id UUID REFERENCES public.bank_profiles(id),
  ADD COLUMN bank_account_holder TEXT,
  ADD COLUMN swift_code TEXT;

COMMENT ON COLUMN public.fund_collections.currency IS
  'Source currency actually collected. See destination_currency + transfer_rate for the conversion.';

-- ─── Fund Transfers: same currency pair, now with its own rate ──
ALTER TABLE public.fund_transfers
  ALTER COLUMN currency SET DEFAULT 'SAR',
  ADD COLUMN destination_currency TEXT NOT NULL DEFAULT 'AED',
  ADD COLUMN transfer_rate NUMERIC,
  ADD COLUMN bank_profile_id UUID REFERENCES public.bank_profiles(id),
  ADD COLUMN bank_name TEXT,
  ADD COLUMN bank_account_holder TEXT,
  ADD COLUMN swift_code TEXT;

COMMENT ON COLUMN public.fund_transfers.currency IS
  'Source currency being transferred. See destination_currency + transfer_rate for the conversion.';
