-- ═══════════════════════════════════════════════════════════════
-- 011: Multi-truck support + UAE→Saudi workflow
-- Extends the job_orders table and adds job_order_trucks,
-- job_status_updates tables.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Update job_orders status constraint to new 10-status flow ──
ALTER TABLE public.job_orders
  DROP CONSTRAINT job_orders_status_check;

ALTER TABLE public.job_orders
  ADD CONSTRAINT job_orders_status_check
  CHECK (status IN (
    'draft',
    'ready_for_collection',
    'goods_collected',
    'export_documentation_complete',
    'uae_customs_clearance',
    'border_exit',
    'saudi_customs_clearance',
    'in_transit_saudi',
    'delivered',
    'closed'
  ));

-- Update any existing rows that used old statuses to 'draft'
UPDATE public.job_orders
  SET status = 'draft'
  WHERE status NOT IN (
    'draft','ready_for_collection','goods_collected',
    'export_documentation_complete','uae_customs_clearance',
    'border_exit','saudi_customs_clearance','in_transit_saudi',
    'delivered','closed'
  );

-- ── 2. Add new columns to job_orders ────────────────────────────
ALTER TABLE public.job_orders
  ADD COLUMN IF NOT EXISTS customer_name       TEXT,
  ADD COLUMN IF NOT EXISTS consignee_name      TEXT,
  ADD COLUMN IF NOT EXISTS commercial_invoice_url   TEXT,
  ADD COLUMN IF NOT EXISTS packing_list_url         TEXT,
  ADD COLUMN IF NOT EXISTS country_of_origin_url    TEXT,
  ADD COLUMN IF NOT EXISTS other_documents_urls     JSONB DEFAULT '[]';

-- ── 3. Trucks table ──────────────────────────────────────────────
CREATE TABLE public.job_order_trucks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id   UUID REFERENCES public.job_orders(id) ON DELETE CASCADE NOT NULL,

  -- Vehicle & driver
  truck_number   TEXT,
  trailer_number TEXT,
  driver_name    TEXT,
  driver_phone   TEXT,
  driver_passport_url TEXT,
  driver_id_url       TEXT,

  -- UAE → Saudi status flow
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created',
      'goods_collected',
      'documents_uploaded',
      'uae_customs_submitted',
      'naql_foc_received',
      'bayan_received',
      'fazza_generated',
      'fazza_sent_to_driver',
      'reached_saudi_border',
      'inspection',
      'duty_payment',
      'entered_saudi_arabia',
      'delivered',
      'completed'
    )),

  border_status          TEXT,
  fazza_token            TEXT,
  customs_duty_amount    NUMERIC,
  customs_duty_paid_at   TIMESTAMPTZ,

  -- Key milestone timestamps
  naql_foc_received_at   TIMESTAMPTZ,
  bayan_received_at      TIMESTAMPTZ,
  fazza_generated_at     TIMESTAMPTZ,
  fazza_sent_at          TIMESTAMPTZ,
  reached_border_at      TIMESTAMPTZ,
  entered_saudi_at       TIMESTAMPTZ,
  delivered_at           TIMESTAMPTZ,

  notes        TEXT,
  created_by   UUID REFERENCES public.user_profiles(id),
  updated_by   UUID REFERENCES public.user_profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Manual status updates log ────────────────────────────────
CREATE TABLE public.job_status_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE NOT NULL,
  truck_id     UUID REFERENCES public.job_order_trucks(id) ON DELETE SET NULL,
  status       TEXT NOT NULL,
  notes        TEXT,
  created_by   UUID REFERENCES public.user_profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. RLS ───────────────────────────────────────────────────────
ALTER TABLE public.job_order_trucks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_updates  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated select job_order_trucks"
  ON public.job_order_trucks FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated select job_status_updates"
  ON public.job_status_updates FOR SELECT TO authenticated USING (true);
