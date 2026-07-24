-- ═══════════════════════════════════════════════════════════════
-- Stage 3-8: Job Orders, Transit Monitoring, Finance Invoices
-- Migration: 010_job_orders_and_invoices.sql
-- ═══════════════════════════════════════════════════════════════

-- Add finance role
ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operations','warehouse','warehouse_supervisor','finance','viewer'));

-- ── Job order auto-numbering sequence ──────────────────────────
CREATE SEQUENCE IF NOT EXISTS job_order_seq_global START 1;

-- ── Core job order table ────────────────────────────────────────
CREATE TABLE public.job_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number                TEXT UNIQUE NOT NULL,
  destination               TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft','pending_approval','approved','loading','dispatched',
      'in_transit','customs_clearance','out_for_delivery','delivered'
    )),

  -- Truck / transporter (Stage 3)
  truck_number              TEXT,
  driver_name               TEXT,
  driver_phone              TEXT,
  transporter_name          TEXT,
  departure_date            DATE,

  -- Capacity (derived from linked GCNs — stored for quick read)
  total_weight_kg           NUMERIC,
  total_cbm                 NUMERIC,

  -- GM / Admin approval (Stage 3)
  gm_approval_status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (gm_approval_status IN ('pending','approved','rejected')),
  gm_approved_by            UUID REFERENCES public.user_profiles(id),
  gm_approved_at            TIMESTAMPTZ,
  gm_rejection_reason       TEXT,
  submitted_by              UUID REFERENCES public.user_profiles(id),
  submitted_at              TIMESTAMPTZ,

  -- Origin warehouse dispatch (Stage 4)
  loaded_by                 UUID REFERENCES public.user_profiles(id),
  loaded_at                 TIMESTAMPTZ,
  driver_signature_received BOOLEAN DEFAULT FALSE,
  dispatched_by             UUID REFERENCES public.user_profiles(id),
  dispatched_at             TIMESTAMPTZ,

  -- Transit monitoring (Stage 5)
  transit_notes             TEXT,
  customs_cleared_at        TIMESTAMPTZ,
  customs_cleared_by        UUID REFERENCES public.user_profiles(id),
  finance_notified_at       TIMESTAMPTZ,

  -- Destination pre-delivery scheduling (Stage 6)
  delivery_scheduled_at     TIMESTAMPTZ,
  delivery_driver           TEXT,

  -- Destination final delivery (Stage 8)
  destination_received_at   TIMESTAMPTZ,
  destination_received_by   UUID REFERENCES public.user_profiles(id),
  pod_collected_at          TIMESTAMPTZ,
  pod_collected_by          UUID REFERENCES public.user_profiles(id),

  notes                     TEXT,
  created_by                UUID REFERENCES public.user_profiles(id),
  updated_by                UUID REFERENCES public.user_profiles(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── GCN ↔ Job Order junction ────────────────────────────────────
-- Each GCN should be in at most one active job (enforced in app logic)
CREATE TABLE public.job_order_gcns (
  job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE,
  gcn_id       UUID REFERENCES public.goods_collection_notes(id) ON DELETE CASCADE,
  added_by     UUID REFERENCES public.user_profiles(id),
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (job_order_id, gcn_id)
);

-- ── Transit update log ──────────────────────────────────────────
CREATE TABLE public.job_transit_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE NOT NULL,
  update_text  TEXT NOT NULL,
  created_by   UUID REFERENCES public.user_profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Finance invoices (Stage 7) ──────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq_global START 1;

CREATE TABLE public.invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   TEXT UNIQUE NOT NULL,
  job_order_id     UUID REFERENCES public.job_orders(id),
  customer_name    TEXT NOT NULL,
  customer_email   TEXT,
  customer_address TEXT,
  -- [{description, qty, unit_price, amount}]
  line_items       JSONB NOT NULL DEFAULT '[]',
  subtotal         NUMERIC NOT NULL DEFAULT 0,
  tax_rate         NUMERIC DEFAULT 0,
  tax_amount       NUMERIC DEFAULT 0,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'SAR',
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issued_at        TIMESTAMPTZ,
  due_date         DATE,
  paid_at          TIMESTAMPTZ,
  payment_notes    TEXT,
  created_by       UUID REFERENCES public.user_profiles(id),
  updated_by       UUID REFERENCES public.user_profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Helper functions for auto-numbering ────────────────────────
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq    BIGINT;
  v_year   TEXT;
BEGIN
  SELECT nextval('job_order_seq_global') INTO v_seq;
  v_year := to_char(NOW(), 'YYYY');
  RETURN 'JOB-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq    BIGINT;
  v_year   TEXT;
BEGIN
  SELECT nextval('invoice_seq_global') INTO v_seq;
  v_year := to_char(NOW(), 'YYYY');
  RETURN 'INV-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- ── RLS: authenticated SELECT (all writes go through service client) ──
ALTER TABLE public.job_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_order_gcns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_transit_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated select job_orders"
  ON public.job_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated select job_order_gcns"
  ON public.job_order_gcns FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated select job_transit_updates"
  ON public.job_transit_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated select invoices"
  ON public.invoices FOR SELECT TO authenticated USING (true);
