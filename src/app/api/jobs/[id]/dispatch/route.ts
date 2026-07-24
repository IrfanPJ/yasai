import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: job } = await serviceClient
    .from("job_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "goods_collected") {
    return NextResponse.json({ error: "Job must have goods collected before dispatch" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const [{ data, error }, { data: gcnLinks }] = await Promise.all([
    serviceClient
      .from("job_orders")
      .update({
        status: "export_documentation_complete",
        dispatched_by: user.id,
        dispatched_at: now,
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single(),
    serviceClient.from("job_order_gcns").select("gcn_id").eq("job_order_id", id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flip all linked GCNs to in_transit
  if (gcnLinks && gcnLinks.length > 0) {
    const gcnIds = gcnLinks.map((r: { gcn_id: string }) => r.gcn_id);
    await serviceClient
      .from("goods_collection_notes")
      .update({ status: "in_transit", updated_by: user.id })
      .in("id", gcnIds);
  }

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_DISPATCHED",
    entity_type: "job_orders",
    entity_id: id,
  });

  return NextResponse.json(data);
}
