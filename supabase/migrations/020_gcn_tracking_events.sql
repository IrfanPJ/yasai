-- ─── GCN Tracking Module ────────────────────────────────────────
-- Collapses GCN.status down to just 'collected' / 'in_warehouse'.
-- Everything that happens after warehousing (inter-warehouse
-- transfers, dispatch to transit, customs, out for delivery,
-- delivered) is now recorded as an event in gcn_tracking_events,
-- with a denormalized `current_stage` on the GCN for at-a-glance
-- display (list pages, badges) without joining the event log.

-- ── Warehouse link + display stage ──────────────────────────────
ALTER TABLE public.goods_collection_notes
  ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id),
  ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'collected';

-- Backfill current_stage from today's status so nothing regresses
-- in the UI, then collapse status itself to the new 2-value model.
UPDATE public.goods_collection_notes SET current_stage = status;

-- Best-effort backfill of warehouse_id from the existing free-text
-- storage_location, which today already holds a warehouse code.
UPDATE public.goods_collection_notes gcn
SET warehouse_id = w.id
FROM public.warehouses w
WHERE gcn.storage_location = w.code;

ALTER TABLE public.goods_collection_notes
  DROP CONSTRAINT IF EXISTS goods_collection_notes_status_check;

UPDATE public.goods_collection_notes
  SET status = 'in_warehouse'
  WHERE status NOT IN ('collected', 'in_warehouse');

ALTER TABLE public.goods_collection_notes
  ADD CONSTRAINT goods_collection_notes_status_check
  CHECK (status IN ('collected', 'in_warehouse'));

ALTER TABLE public.goods_collection_notes
  ADD CONSTRAINT goods_collection_notes_current_stage_check
  CHECK (current_stage IN (
    'collected', 'in_warehouse', 'in_transit',
    'customs_clearance', 'out_for_delivery', 'delivered'
  ));

COMMENT ON COLUMN public.goods_collection_notes.status IS
  'Only collected/in_warehouse now — the full journey lives in gcn_tracking_events. See current_stage for display.';
COMMENT ON COLUMN public.goods_collection_notes.current_stage IS
  'Denormalized display stage, kept in sync with the latest gcn_tracking_events row.';

-- ── Tracking events ──────────────────────────────────────────────
CREATE TABLE public.gcn_tracking_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gcn_id             UUID NOT NULL REFERENCES public.goods_collection_notes(id) ON DELETE CASCADE,

  event_type         TEXT NOT NULL CHECK (event_type IN (
                       'received_at_warehouse', 'warehouse_transfer', 'dispatched_transit',
                       'customs_cleared', 'out_for_delivery', 'delivered'
                     )),

  from_warehouse_id  UUID REFERENCES public.warehouses(id),
  to_warehouse_id    UUID REFERENCES public.warehouses(id),
  from_location      TEXT,
  to_location        TEXT,

  -- Only meaningful for 'warehouse_transfer'; every other event type
  -- is logged automatically alongside its Job Order action.
  approval_status    TEXT NOT NULL DEFAULT 'auto'
                       CHECK (approval_status IN ('auto', 'pending', 'approved', 'rejected')),
  requested_by       UUID REFERENCES public.user_profiles(id),
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by        UUID REFERENCES public.user_profiles(id),
  approved_at        TIMESTAMPTZ,
  rejection_reason   TEXT,

  related_job_order_id UUID REFERENCES public.job_orders(id),
  notes              TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gcn_tracking_events IS
  'Full movement/custody timeline for a GCN from warehouse onward. Replaces status-only tracking.';

CREATE INDEX idx_tracking_events_gcn ON public.gcn_tracking_events (gcn_id, created_at DESC);
CREATE INDEX idx_tracking_events_approval ON public.gcn_tracking_events (approval_status)
  WHERE approval_status = 'pending';
CREATE INDEX idx_tracking_events_job_order ON public.gcn_tracking_events (related_job_order_id)
  WHERE related_job_order_id IS NOT NULL;

ALTER TABLE public.gcn_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_tracking_events" ON public.gcn_tracking_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_insert_tracking_events" ON public.gcn_tracking_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_update_tracking_events" ON public.gcn_tracking_events
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'operations', 'warehouse_supervisor')
        AND p.is_active = TRUE
    )
  );

-- One synthetic event per GCN that already had a real journey before
-- this table existed, so the timeline isn't blank for older shipments.
-- (Their real step-by-step history was never captured — see app notes.)
INSERT INTO public.gcn_tracking_events (gcn_id, event_type, to_location, approval_status, notes, created_at)
SELECT id,
       CASE current_stage
         WHEN 'in_transit' THEN 'dispatched_transit'
         WHEN 'customs_clearance' THEN 'customs_cleared'
         WHEN 'out_for_delivery' THEN 'out_for_delivery'
         WHEN 'delivered' THEN 'delivered'
       END,
       current_stage, 'auto',
       'Legacy record — reached "' || current_stage || '" before the tracking timeline existed; detailed history not available.',
       updated_at
FROM public.goods_collection_notes
WHERE current_stage NOT IN ('collected', 'in_warehouse');
