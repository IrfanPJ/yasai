import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: jobId } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const gcnId = typeof body.gcn_id === "string" ? body.gcn_id.trim() : "";
  if (!gcnId) return NextResponse.json({ error: "gcn_id is required" }, { status: 400 });

  // Verify GCN exists
  const { data: gcn } = await serviceClient
    .from("goods_collection_notes")
    .select("id, weight_kg, volume_cbm, warehouse_report_status")
    .eq("id", gcnId)
    .single();

  if (!gcn) return NextResponse.json({ error: "GCN not found" }, { status: 404 });

  const { error } = await serviceClient
    .from("job_order_gcns")
    .insert({ job_order_id: jobId, gcn_id: gcnId, added_by: user.id });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "GCN is already linked to this job" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalculate totals
  const { data: links } = await serviceClient
    .from("job_order_gcns")
    .select("gcn:goods_collection_notes(weight_kg, volume_cbm)")
    .eq("job_order_id", jobId);

  let totalWeight = 0, totalCbm = 0;
  for (const link of links || []) {
    const g = (link as { gcn: { weight_kg?: number; volume_cbm?: number } }).gcn;
    totalWeight += g?.weight_kg ?? 0;
    totalCbm += g?.volume_cbm ?? 0;
  }

  await serviceClient
    .from("job_orders")
    .update({ total_weight_kg: totalWeight, total_cbm: totalCbm, updated_by: user.id })
    .eq("id", jobId);

  return NextResponse.json({ success: true });
}
