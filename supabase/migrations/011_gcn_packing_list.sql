ALTER TABLE public.goods_collection_notes
  ADD COLUMN IF NOT EXISTS packing_list_url TEXT;
