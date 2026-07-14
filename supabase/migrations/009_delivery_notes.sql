-- Delivery Notes: one-to-one with a goods collection note
CREATE TABLE public.delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.goods_collection_notes(id) ON DELETE CASCADE,

  -- Header fields
  doc_number TEXT,
  doc_date DATE,
  job_number TEXT,
  shipper TEXT,
  ref_number TEXT,
  destination TEXT,

  -- Customer block (typed per delivery, separate from GCN consignee)
  customer_name TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,

  -- Right-side notes/remarks
  notes TEXT,

  -- Items: [{ item_description, qty, unit, total_pallets, remark }]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Receiver sign-off
  receiver_name TEXT,
  received_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One delivery note per collection
  UNIQUE(collection_id)
);

ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;

-- All reads for authenticated users (writes go through service client in API routes)
CREATE POLICY "authenticated_select" ON public.delivery_notes
  FOR SELECT TO authenticated USING (true);
