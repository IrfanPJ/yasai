-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – Fund Collection Improvements
-- Migration: 016_fund_collection_improvements.sql
-- Adds banking details, cheque fields, collected_by, customer_phone
-- ═══════════════════════════════════════════════════════════════

-- Add new columns
ALTER TABLE public.fund_collections
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS iban            TEXT,
  ADD COLUMN IF NOT EXISTS cheque_number   TEXT,
  ADD COLUMN IF NOT EXISTS cheque_date     DATE,
  ADD COLUMN IF NOT EXISTS cheque_bank     TEXT,
  ADD COLUMN IF NOT EXISTS collected_by    TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone  TEXT;

-- Expand payment_mode constraint to include 'cheque'
ALTER TABLE public.fund_collections
  DROP CONSTRAINT IF EXISTS fund_collections_payment_mode_check;

ALTER TABLE public.fund_collections
  ADD CONSTRAINT fund_collections_payment_mode_check
  CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque'));
