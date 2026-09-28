-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – GR Report
-- Migration: 020_gr_report.sql
-- One row per GCN, auto-seeded on GCN creation, auto-updated with
-- Job #/Job Date once that GCN is linked to a Job Order. Everything
-- else (delivered qty, tracking, invoiced amount, and the three
-- Freight Invoice / Delivery Note / Invoice document uploads) is
-- filled in later from the GR Report grid itself.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.gr_report_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gcn_id              UUID UNIQUE NOT NULL REFERENCES public.goods_collection_notes(id) ON DELETE CASCADE,

  -- Auto-filled from the GCN at creation time
  entry_date          DATE,
  cr_number           TEXT,
  shipper             TEXT,
  consignee           TEXT,
  doc_ref_number      TEXT,
  item_category       TEXT,
  item_package        TEXT,
  total_package_qty   NUMERIC,
  cbm                 NUMERIC,

  -- Manual — not captured anywhere else on the GCN
  items               TEXT,
  pickup_point        TEXT,

  -- Auto-filled once this GCN is linked to a Job Order
  job_order_id        UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
  job_number          TEXT,
  job_date            DATE,

  -- Manual, edited inline on the grid
  delivered_qty       NUMERIC NOT NULL DEFAULT 0,
  balance             NUMERIC GENERATED ALWAYS AS (COALESCE(total_package_qty, 0) - delivered_qty) STORED,
  tracking            TEXT,
  invoiced_amount     NUMERIC NOT NULL DEFAULT 0,

  -- Freight Invoice / Delivery Note / Invoice uploads
  freight_invoice_url TEXT,
  delivery_note_url   TEXT,
  invoice_url         TEXT,

  created_by          UUID REFERENCES public.user_profiles(id),
  updated_by          UUID REFERENCES public.user_profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gr_report_entries_job_order_id ON public.gr_report_entries(job_order_id);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.gr_report_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth select gr_report_entries" ON public.gr_report_entries
  FOR SELECT TO authenticated USING (true);

-- ─── Backfill: one row for every GCN that already exists ───────
INSERT INTO public.gr_report_entries (
  gcn_id, entry_date, cr_number, shipper, consignee, doc_ref_number,
  item_category, item_package, total_package_qty, cbm, created_by
)
SELECT
  g.id,
  g.created_at::date,
  g.collection_number,
  g.shipper_name,
  g.consignee_name,
  g.doc_ref_number,
  g.commodity,
  g.num_packages,
  (
    SELECT COALESCE(SUM((line->>'quantity')::NUMERIC), 0)
    FROM jsonb_array_elements(COALESCE(g.package_items, '[]'::jsonb)) AS line
  ),
  g.volume_cbm,
  g.created_by
FROM public.goods_collection_notes g
WHERE g.deleted_at IS NULL
ON CONFLICT (gcn_id) DO NOTHING;

-- ─── Backfill: Job #/Job Date for GCNs already on a Job Order ───
-- (picks each GCN's most recently-added job order link, if more than one)
UPDATE public.gr_report_entries e
SET job_order_id = link.job_order_id,
    job_number    = jo.job_number,
    job_date      = jo.departure_date
FROM (
  SELECT DISTINCT ON (gcn_id) gcn_id, job_order_id
  FROM public.job_order_gcns
  ORDER BY gcn_id, added_at DESC
) link
JOIN public.job_orders jo ON jo.id = link.job_order_id
WHERE e.gcn_id = link.gcn_id;
