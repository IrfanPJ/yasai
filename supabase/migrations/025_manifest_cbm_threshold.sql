-- Switches the consolidation-sheet auto-conversion trigger from pallet count
-- to total CBM (40.5 m³ limit), since not every GCN is palletized. pallet
-- count stays on both tables as a display-only figure.
ALTER TABLE public.consolidation_sheets
  ADD COLUMN IF NOT EXISTS cbm_total NUMERIC(10, 3) NOT NULL DEFAULT 0;

ALTER TABLE public.consolidation_sheet_items
  ADD COLUMN IF NOT EXISTS cbm NUMERIC(10, 3) NOT NULL DEFAULT 0;
