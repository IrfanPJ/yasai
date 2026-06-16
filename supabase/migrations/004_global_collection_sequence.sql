-- Replace per-year sequences with a single global sequence starting at 10001
CREATE SEQUENCE IF NOT EXISTS gcn_seq_global START 10001;

-- Update the collection number generator to use YAS-NNNNN format
CREATE OR REPLACE FUNCTION public.generate_collection_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq    BIGINT;
  v_number TEXT;
BEGIN
  SELECT nextval('gcn_seq_global') INTO v_seq;
  v_number := 'YAS-' || v_seq::TEXT;
  RETURN v_number;
END;
$$;
