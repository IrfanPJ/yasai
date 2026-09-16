-- ─── Company Accounts ────────────────────────────────────────────
-- Your own bank accounts (one per country/currency/bank), each with
-- a real computed balance — distinct from bank_profiles, which is a
-- book of beneficiary banks used on transactions, not a ledger.
CREATE TABLE public.accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  country           TEXT,
  currency          TEXT NOT NULL DEFAULT 'AED',
  bank_profile_id   UUID REFERENCES public.bank_profiles(id),
  opening_balance   NUMERIC NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_by        UUID REFERENCES public.user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select accounts" ON public.accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert accounts" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update accounts" ON public.accounts
  FOR UPDATE TO authenticated USING (true);

-- ─── Link each transaction to the account it actually moved ──────
-- Fund Collections: which account the (destination-currency) money
-- landed in.
ALTER TABLE public.fund_collections
  ADD COLUMN account_id UUID REFERENCES public.accounts(id);

-- Fund Transfers: money leaves source_account_id and lands in
-- destination_account_id — both optional (a transfer to an outside
-- party has no destination_account_id of yours).
ALTER TABLE public.fund_transfers
  ADD COLUMN source_account_id UUID REFERENCES public.accounts(id),
  ADD COLUMN destination_account_id UUID REFERENCES public.accounts(id);

-- Supplier Payments: which account the payment was made from.
ALTER TABLE public.supplier_payments
  ADD COLUMN account_id UUID REFERENCES public.accounts(id);

-- ─── Balances, computed live — never stored/denormalized ─────────
-- Conservative by design: a collection only counts once verified,
-- a payment/transfer-out counts once actually executed (paid /
-- initiated — the money is already gone at that point), a
-- transfer-in only counts once delivered/confirmed. Amounts are
-- converted into the account's own currency using each row's
-- stored transfer_rate (or the transfer's confirmed received_amount
-- when available, since that's the real figure instead of an
-- estimate).
CREATE VIEW public.account_balances AS
SELECT
  a.id AS account_id,
  a.name,
  a.currency,
  a.country,
  a.opening_balance,
  a.opening_balance
    + COALESCE(collections_in.total, 0)
    + COALESCE(transfers_in.total, 0)
    - COALESCE(transfers_out.total, 0)
    - COALESCE(payments_out.total, 0)
    AS balance
FROM public.accounts a
LEFT JOIN (
  SELECT account_id,
         SUM(CASE WHEN currency = destination_currency THEN amount ELSE amount * COALESCE(transfer_rate, 1) END) AS total
  FROM public.fund_collections
  WHERE status = 'verified' AND account_id IS NOT NULL
  GROUP BY account_id
) collections_in ON collections_in.account_id = a.id
LEFT JOIN (
  SELECT destination_account_id AS account_id,
         SUM(COALESCE(received_amount, amount * COALESCE(transfer_rate, 1))) AS total
  FROM public.fund_transfers
  WHERE status IN ('delivered', 'confirmed') AND destination_account_id IS NOT NULL
  GROUP BY destination_account_id
) transfers_in ON transfers_in.account_id = a.id
LEFT JOIN (
  SELECT source_account_id AS account_id, SUM(amount) AS total
  FROM public.fund_transfers
  WHERE source_account_id IS NOT NULL
  GROUP BY source_account_id
) transfers_out ON transfers_out.account_id = a.id
LEFT JOIN (
  SELECT account_id, SUM(amount) AS total
  FROM public.supplier_payments
  WHERE status IN ('paid', 'confirmed') AND account_id IS NOT NULL
  GROUP BY account_id
) payments_out ON payments_out.account_id = a.id;
