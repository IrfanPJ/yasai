import { createServiceClient } from "@/lib/supabase/server";
import type { TrackingEventType, TrackingStage } from "@/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

// event_type -> the current_stage badge it puts the GCN in.
const STAGE_FOR_EVENT: Record<TrackingEventType, TrackingStage> = {
  received_at_warehouse: "in_warehouse",
  warehouse_transfer: "in_warehouse",
  dispatched_transit: "in_transit",
  customs_cleared: "customs_clearance",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
};

interface LogTrackingEventInput {
  gcnIds: string[];
  eventType: TrackingEventType;
  performedBy: string;
  toLocation?: string;
  fromLocation?: string;
  toWarehouseId?: string;
  fromWarehouseId?: string;
  relatedJobOrderId?: string;
  notes?: string;
}

/**
 * Logs one auto-approved tracking event per GCN and advances each GCN's
 * current_stage badge to match. Used by every Job Order transition route
 * (dispatch/customs-cleared/schedule-delivery/pod-collected) and warehouse
 * receiving — none of these change GCN.status, which stays collected/
 * in_warehouse regardless of how far the journey has actually gone.
 */
export async function logTrackingEvents(
  serviceClient: ServiceClient,
  { gcnIds, eventType, performedBy, toLocation, fromLocation, toWarehouseId, fromWarehouseId, relatedJobOrderId, notes }: LogTrackingEventInput
) {
  if (gcnIds.length === 0) return;

  const stage = STAGE_FOR_EVENT[eventType];

  await Promise.all([
    serviceClient.from("gcn_tracking_events").insert(
      gcnIds.map((gcn_id) => ({
        gcn_id,
        event_type: eventType,
        approval_status: "auto" as const,
        requested_by: performedBy,
        to_location: toLocation,
        from_location: fromLocation,
        to_warehouse_id: toWarehouseId,
        from_warehouse_id: fromWarehouseId,
        related_job_order_id: relatedJobOrderId,
        notes,
      }))
    ),
    serviceClient
      .from("goods_collection_notes")
      .update({ current_stage: stage, updated_by: performedBy })
      .in("id", gcnIds),
  ]);
}
