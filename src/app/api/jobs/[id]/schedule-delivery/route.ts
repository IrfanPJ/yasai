import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const delivery_scheduled_at = body.delivery_scheduled_at || null;
  const delivery_driver = body.delivery_driver || null;

  const now = new Date().toISOString();

  const [{ data, error }, { data: gcnLinks }] = await Promise.all([
    serviceClient
      .from("job_orders")
      .update({
        status: "out_for_delivery",
        delivery_scheduled_at,
        delivery_driver,
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single(),
    serviceClient.from("job_order_gcns").select("gcn_id").eq("job_order_id", id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (gcnLinks && gcnLinks.length > 0) {
    const gcnIds = gcnLinks.map((r: { gcn_id: string }) => r.gcn_id);
    await serviceClient
      .from("goods_collection_notes")
      .update({ status: "out_for_delivery", updated_by: user.id })
      .in("id", gcnIds);
  }

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_DELIVERY_SCHEDULED",
    entity_type: "job_orders",
    entity_id: id,
    details: { delivery_scheduled_at, delivery_driver },
  });

  // suppress unused warning
  void now;

  return NextResponse.json(data);
}
