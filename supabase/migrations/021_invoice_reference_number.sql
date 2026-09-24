-- A free-text reference number shown in the invoice's "Invoice Details" box
-- (No / Date / Job No / Shipper / Destination / Payment), alongside those.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS reference_number TEXT;
