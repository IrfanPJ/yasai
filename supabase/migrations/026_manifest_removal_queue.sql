-- Removing a GCN from a pending consolidation sheet no longer just unlinks it —
-- it's logged here as "queued", and automatically picked up by the next pending
-- sheet created for that zone (once the current one converts to a manifest and
-- a fresh sheet opens). Also backs the quick "Undo" action and the durable
-- removal history/restore UI.
CREATE TABLE public.consolidation_sheet_removals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone              TEXT NOT NULL CHECK (zone IN ('mainland', 'jafza')),
  gcn_id            UUID NOT NULL REFERENCES public.goods_collection_notes(id),
  original_sheet_id UUID NOT NULL REFERENCES public.consolidation_sheets(id),
  original_position INT NOT NULL DEFAULT 0,
  pallet_count      INT NOT NULL DEFAULT 0,
  cbm               NUMERIC(10, 3) NOT NULL DEFAULT 0,
  remarks           TEXT,
  removed_by        UUID REFERENCES public.user_profiles(id),
  removed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requeued_sheet_id UUID REFERENCES public.consolidation_sheets(id),
  requeued_at       TIMESTAMPTZ,
  restored_at       TIMESTAMPTZ,
  restored_by       UUID REFERENCES public.user_profiles(id)
);

-- Fast lookup of "still-queued" removals for a zone when a new sheet opens
CREATE INDEX consolidation_sheet_removals_queued
  ON public.consolidation_sheet_removals (zone)
  WHERE requeued_sheet_id IS NULL AND restored_at IS NULL;

ALTER TABLE public.consolidation_sheet_removals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_consolidation_sheet_removals" ON public.consolidation_sheet_removals
  FOR SELECT TO authenticated USING (true);
