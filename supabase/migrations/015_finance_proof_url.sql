-- Add proof_url to fund_collections (payment slip / proof of receipt)
ALTER TABLE public.fund_collections ADD COLUMN IF NOT EXISTS proof_url TEXT;
