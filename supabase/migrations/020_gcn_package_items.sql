-- A GCN can mix package types (e.g. 3 pallets + 20 pieces + 5 cartons) instead
-- of a single package_type. package_items holds one JSON array of lines:
--   [{ package_type, quantity, weight_kg, volume_cbm, pallet_dimensions? }, ...]
-- The GCN's existing weight_kg/volume_cbm/num_packages stay as the aggregated
-- totals across all lines. Legacy single-type records (no package_items) keep
-- working unchanged — the old package_type/pallet_dimensions columns are left
-- in place and are only read as a fallback when package_items is empty.
ALTER TABLE public.goods_collection_notes
  ADD COLUMN IF NOT EXISTS package_items JSONB;
