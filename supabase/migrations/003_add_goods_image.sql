-- Add goods image column to goods_collection_notes
ALTER TABLE public.goods_collection_notes
  ADD COLUMN IF NOT EXISTS goods_image_url TEXT;

COMMENT ON COLUMN public.goods_collection_notes.goods_image_url IS
  'Base64 JPEG data URL of the goods photo, compressed client-side';
