-- Store per-pallet dimensions (length/width/height in meters) used to
-- auto-calculate the GCN's total volume_cbm on the client.
ALTER TABLE public.goods_collection_notes
  ADD COLUMN pallet_dimensions JSONB;

COMMENT ON COLUMN public.goods_collection_notes.pallet_dimensions IS
  'Array of {length_m, width_m, height_m} per pallet; volume_cbm is the calculated sum';
