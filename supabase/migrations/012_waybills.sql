-- Waybill number sequence
CREATE SEQUENCE IF NOT EXISTS waybill_seq_global START 1;

CREATE TABLE public.waybills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waybill_number TEXT UNIQUE NOT NULL,

  -- Shipper
  shipper_name TEXT NOT NULL,
  shipper_address TEXT,

  -- Consignee
  consignee_name TEXT NOT NULL,
  consignee_address TEXT,

  -- Routing
  port_of_loading TEXT NOT NULL DEFAULT 'DUBAI, UAE',
  port_of_discharge TEXT NOT NULL,
  shipment_date DATE NOT NULL,
  mode_of_transport TEXT NOT NULL DEFAULT 'road'
    CHECK (mode_of_transport IN ('road', 'air', 'sea')),
  remarks TEXT,
  job_number TEXT,
  final_destination TEXT,

  -- Cargo items: [{truck_number, seal_no, invoice_number, invoice_value, invoice_currency, num_packages, description, weight, measurement}]
  cargo_items JSONB NOT NULL DEFAULT '[]',

  -- Footer
  prepared_by TEXT,
  num_originals INTEGER DEFAULT 1,
  place_of_issue TEXT DEFAULT 'Dubai',
  issue_date DATE,
  delivery_contact TEXT,

  -- Generated PDF
  pdf_url TEXT,

  -- Metadata
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Auto-generate waybill number: WB-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_waybill_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
  year_str TEXT;
BEGIN
  seq_val := nextval('waybill_seq_global');
  year_str := TO_CHAR(NOW(), 'YYYY');
  RETURN 'WB-' || year_str || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated select waybills"
  ON public.waybills FOR SELECT TO authenticated USING (true);
