import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string; gcnId: string }>; }

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { id: jobId, gcnId } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { error } = await serviceClient
    .from("job_order_gcns")
    .delete()
    .eq("job_order_id", jobId)
    .eq("gcn_id", gcnId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
