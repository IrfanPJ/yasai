-- Add commercial invoice, country of origin document URLs and status history tracking to GCNs

ALTER TABLE public.goods_collection_notes
  ADD COLUMN IF NOT EXISTS commercial_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS country_of_origin_url  TEXT,
  ADD COLUMN IF NOT EXISTS status_history          JSONB NOT NULL DEFAULT '[]';
