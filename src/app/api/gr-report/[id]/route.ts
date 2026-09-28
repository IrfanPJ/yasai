import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

// Job #/Job Date are driven by the Job Order link, not editable here.
// Balance is a generated column. Everything else on the grid is fair game.
const EDITABLE_FIELDS = [
  "entry_date", "cr_number", "shipper", "consignee", "doc_ref_number",
  "item_category", "items", "item_package", "pickup_point",
  "total_package_qty", "cbm", "delivered_qty", "tracking", "invoiced_amount",
] as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("gr_report_entries")
    .update({ ...updates, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
