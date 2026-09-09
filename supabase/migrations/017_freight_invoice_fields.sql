-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – Freight Invoice fields
-- Migration: 017_freight_invoice_fields.sql
-- Adds freight/upload invoice support to the invoices table
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type       TEXT NOT NULL DEFAULT 'standard'
    CHECK (invoice_type IN ('standard', 'freight', 'uploaded')),
  ADD COLUMN IF NOT EXISTS uploaded_file_url  TEXT,
  ADD COLUMN IF NOT EXISTS port_of_loading    TEXT,
  ADD COLUMN IF NOT EXISTS packages_count     TEXT,
  ADD COLUMN IF NOT EXISTS final_destination  TEXT;

-- Storage bucket for uploaded invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-uploads', 'invoice-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read invoice-uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-uploads');

CREATE POLICY "auth insert invoice-uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-uploads');

CREATE POLICY "auth delete invoice-uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoice-uploads');
