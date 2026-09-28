-- Manifest / Consolidation Sheets
-- Each GCN is collected in one of two UAE warehouse zones (Mainland or JAFZA).
-- Newly collected GCNs are auto-attached to that zone's currently-open "pending"
-- consolidation sheet. Once a sheet's total pallet count reaches 45 (or a user
-- manually converts it), the sheet becomes a "manifest" — same row, same number,
-- only the status/label changes — and a Job Order is created pre-filled with the
-- sheet's GCNs.

ALTER TABLE public.goods_collection_notes
  ADD COLUMN IF NOT EXISTS origin_zone TEXT CHECK (origin_zone IN ('mainland', 'jafza'));

CREATE SEQUENCE IF NOT EXISTS consolidation_sheet_seq_global START 1;

CREATE OR REPLACE FUNCTION public.generate_sheet_number(p_zone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq  BIGINT;
  v_year TEXT;
BEGIN
  SELECT nextval('consolidation_sheet_seq_global') INTO v_seq;
  v_year := to_char(NOW(), 'YYYY');
  RETURN 'CS-' || upper(p_zone) || '-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

CREATE TABLE public.consolidation_sheets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_number     TEXT NOT NULL UNIQUE,
  zone             TEXT NOT NULL CHECK (zone IN ('mainland', 'jafza')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'manifest')),
  pallet_count     INT NOT NULL DEFAULT 0,
  item_count       INT NOT NULL DEFAULT 0,
  converted_at     TIMESTAMPTZ,
  converted_by     UUID REFERENCES public.user_profiles(id),
  conversion_type  TEXT CHECK (conversion_type IN ('auto', 'manual')),
  job_order_id     UUID REFERENCES public.job_orders(id),
  created_by       UUID REFERENCES public.user_profiles(id),
  updated_by       UUID REFERENCES public.user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one open ("pending") sheet per zone at a time
CREATE UNIQUE INDEX consolidation_sheets_one_pending_per_zone
  ON public.consolidation_sheets (zone)
  WHERE status = 'pending';

CREATE TABLE public.consolidation_sheet_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id     UUID NOT NULL REFERENCES public.consolidation_sheets(id) ON DELETE CASCADE,
  gcn_id       UUID NOT NULL REFERENCES public.goods_collection_notes(id),
  position     INT NOT NULL DEFAULT 0,
  pallet_count INT NOT NULL DEFAULT 0,
  remarks      TEXT,
  added_by     UUID REFERENCES public.user_profiles(id),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, gcn_id)
);

ALTER TABLE public.consolidation_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidation_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_consolidation_sheets" ON public.consolidation_sheets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_consolidation_sheet_items" ON public.consolidation_sheet_items
  FOR SELECT TO authenticated USING (true);
