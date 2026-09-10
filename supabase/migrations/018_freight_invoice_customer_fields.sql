-- Add customer contact fields and freight-specific fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_phone        TEXT,
  ADD COLUMN IF NOT EXISTS customer_contact_person TEXT,
  ADD COLUMN IF NOT EXISTS shipper               TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms         TEXT,
  ADD COLUMN IF NOT EXISTS manual_job_number     TEXT;
