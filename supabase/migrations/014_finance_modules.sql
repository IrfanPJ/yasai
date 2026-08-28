-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – Finance Modules
-- Migration: 014_finance_modules.sql
-- Tables: fund_collections, fund_transfers, supplier_payments, backup_documents
-- ═══════════════════════════════════════════════════════════════

-- ─── Fund Collections ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS fund_collection_seq START 1;

CREATE TABLE public.fund_collections (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_number           TEXT UNIQUE NOT NULL,
  invoice_id                  UUID REFERENCES public.invoices(id),
  customer_name               TEXT NOT NULL,
  amount                      NUMERIC NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'AED',
  payment_mode                TEXT NOT NULL CHECK (payment_mode IN ('cash', 'bank_transfer')),
  collection_date             DATE NOT NULL,
  transfer_rate               NUMERIC,
  bank_reference              TEXT,
  destination_account         TEXT,
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'verified')),
  sales_manager_approved_by   UUID REFERENCES public.user_profiles(id),
  sales_manager_approved_at   TIMESTAMPTZ,
  accounts_verified_by        UUID REFERENCES public.user_profiles(id),
  accounts_verified_at        TIMESTAMPTZ,
  notes                       TEXT,
  created_by                  UUID REFERENCES public.user_profiles(id),
  updated_by                  UUID REFERENCES public.user_profiles(id),
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_collection_number() RETURNS TEXT AS $$
DECLARE v BIGINT; y TEXT;
BEGIN
  v := nextval('fund_collection_seq');
  y := TO_CHAR(NOW(), 'YYYY');
  RETURN 'FC-' || y || '-' || LPAD(v::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Fund Transfers ────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS fund_transfer_seq START 1;

CREATE TABLE public.fund_transfers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number           TEXT UNIQUE NOT NULL,
  fund_collection_id        UUID REFERENCES public.fund_collections(id),
  transfer_mode             TEXT NOT NULL CHECK (transfer_mode IN ('cash_third_party', 'bank_transfer')),
  amount                    NUMERIC NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'AED',
  source_region             TEXT NOT NULL DEFAULT 'UAE',
  destination_region        TEXT NOT NULL DEFAULT 'KSA',
  -- Cash / third party
  third_party_name          TEXT,
  third_party_location      TEXT,
  third_party_scheduled_at  TIMESTAMPTZ,
  third_party_receipt_url   TEXT,
  -- Bank
  destination_bank_account  TEXT,
  bank_reference            TEXT,
  backup_document_url       TEXT,
  -- Status
  status                    TEXT NOT NULL DEFAULT 'initiated'
                              CHECK (status IN ('initiated', 'in_transit', 'delivered', 'confirmed')),
  transferred_by            UUID REFERENCES public.user_profiles(id),
  transferred_at            TIMESTAMPTZ,
  -- Destination receipt
  confirmed_by              UUID REFERENCES public.user_profiles(id),
  confirmed_at              TIMESTAMPTZ,
  received_amount           NUMERIC,
  receipt_date              DATE,
  receipt_url               TEXT,
  notes                     TEXT,
  created_by                UUID REFERENCES public.user_profiles(id),
  updated_by                UUID REFERENCES public.user_profiles(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_transfer_number() RETURNS TEXT AS $$
DECLARE v BIGINT; y TEXT;
BEGIN
  v := nextval('fund_transfer_seq');
  y := TO_CHAR(NOW(), 'YYYY');
  RETURN 'FT-' || y || '-' || LPAD(v::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Supplier Payments ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS supplier_payment_seq START 1;

CREATE TABLE public.supplier_payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number            TEXT UNIQUE NOT NULL,
  fund_transfer_id          UUID REFERENCES public.fund_transfers(id),
  supplier_name             TEXT NOT NULL,
  amount                    NUMERIC NOT NULL,
  currency                  TEXT NOT NULL DEFAULT 'AED',
  payment_mode              TEXT NOT NULL CHECK (payment_mode IN ('bank_transfer', 'cdm', 'cash_hand')),
  payment_date              DATE NOT NULL,
  bank_reference            TEXT,
  cdm_account               TEXT,
  messenger_name            TEXT,
  proof_url                 TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'paid', 'confirmed')),
  operations_notified       BOOLEAN DEFAULT FALSE,
  operations_notified_at    TIMESTAMPTZ,
  notes                     TEXT,
  created_by                UUID REFERENCES public.user_profiles(id),
  updated_by                UUID REFERENCES public.user_profiles(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_payment_number() RETURNS TEXT AS $$
DECLARE v BIGINT; y TEXT;
BEGIN
  v := nextval('supplier_payment_seq');
  y := TO_CHAR(NOW(), 'YYYY');
  RETURN 'SP-' || y || '-' || LPAD(v::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Backup Documents ──────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS backup_doc_seq START 1;

CREATE TABLE public.backup_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number        TEXT UNIQUE NOT NULL,
  doc_type          TEXT NOT NULL CHECK (doc_type IN ('pi', 'po')),
  fund_transfer_id  UUID REFERENCES public.fund_transfers(id),
  supplier_name     TEXT NOT NULL,
  amount            NUMERIC NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'AED',
  doc_url           TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES public.user_profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_backup_doc_number() RETURNS TEXT AS $$
DECLARE v BIGINT; y TEXT;
BEGIN
  v := nextval('backup_doc_seq');
  y := TO_CHAR(NOW(), 'YYYY');
  RETURN 'BD-' || y || '-' || LPAD(v::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.fund_collections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_documents   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select fund_collections"  ON public.fund_collections  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth select fund_transfers"    ON public.fund_transfers    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth select supplier_payments" ON public.supplier_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth select backup_documents"  ON public.backup_documents  FOR SELECT TO authenticated USING (true);
