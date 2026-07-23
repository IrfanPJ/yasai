import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import type { TruckStatus } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string; truckId: string }> }

const VALID_STATUSES: TruckStatus[] = [
  "created", "goods_collected", "documents_uploaded", "uae_customs_submitted",
  "naql_foc_received", "bayan_received", "fazza_generated", "fazza_sent_to_driver",
  "reached_saudi_border", "inspection", "duty_payment", "entered_saudi_arabia",
  "delivered", "completed",
];

const STATUS_TIMESTAMPS: Partial<Record<TruckStatus, string>> = {
  naql_foc_received: "naql_foc_received_at",
  bayan_received: "bayan_received_at",
  fazza_generated: "fazza_generated_at",
  fazza_sent_to_driver: "fazza_sent_at",
  reached_saudi_border: "reached_border_at",
  entered_saudi_arabia: "entered_saudi_at",
  delivered: "delivered_at",
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, truckId } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const status = body.status as TruckStatus;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid truck status" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const tsField = STATUS_TIMESTAMPS[status];
  const update: Record<string, unknown> = {
    status,
    updated_by: user.id,
    updated_at: now,
  };
  if (tsField) update[tsField] = now;
  if (status === "duty_payment" && body.customs_duty_amount != null) {
    update.customs_duty_amount = body.customs_duty_amount;
    update.customs_duty_paid_at = now;
  }
  if (body.fazza_token) update.fazza_token = body.fazza_token;
  if (body.border_status) update.border_status = body.border_status;

  const { data, error } = await serviceClient
    .from("job_order_trucks")
    .update(update)
    .eq("id", truckId)
    .eq("job_order_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the status update
  await serviceClient.from("job_status_updates").insert({
    job_order_id: id,
    truck_id: truckId,
    status,
    notes: body.notes || null,
    created_by: user.id,
  });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "TRUCK_STATUS_UPDATED",
    entity_type: "job_orders",
    entity_id: id,
    details: { truck_id: truckId, status, notes: body.notes },
  });

  return NextResponse.json(data);
}
