import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import type { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string; itemId: string }>; }

async function recalcSheetTotals(serviceClient: ReturnType<typeof createServiceClient>, sheetId: string) {
  const { data: items } = await serviceClient
    .from("consolidation_sheet_items")
    .select("pallet_count, cbm")
    .eq("sheet_id", sheetId);

  const palletCount = (items || []).reduce((s: number, it: { pallet_count: number }) => s + (it.pallet_count || 0), 0);
  const cbmTotal = (items || []).reduce((s: number, it: { cbm: number }) => s + (it.cbm || 0), 0);
  await serviceClient
    .from("consolidation_sheets")
    .update({ pallet_count: palletCount, cbm_total: cbmTotal, item_count: (items || []).length })
    .eq("id", sheetId);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id, itemId } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  const { data: sheet } = await serviceClient.from("consolidation_sheets").select("status").eq("id", id).single();
  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  if (sheet.status !== "pending") {
    return NextResponse.json({ error: "Cannot edit items on a finalized manifest" }, { status: 409 });
  }

  const body = await request.json();
  const updateData: { remarks?: string | null; pallet_count?: number; cbm?: number; position?: number } = {};
  if ("remarks" in body) updateData.remarks = body.remarks || null;
  if ("pallet_count" in body) updateData.pallet_count = Math.max(0, Number(body.pallet_count) || 0);
  if ("cbm" in body) updateData.cbm = Math.max(0, Number(body.cbm) || 0);
  if ("position" in body) updateData.position = Number(body.position) || 0;

  const { data, error } = await serviceClient
    .from("consolidation_sheet_items")
    .update(updateData)
    .eq("id", itemId)
    .eq("sheet_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ("pallet_count" in updateData || "cbm" in updateData) {
    await recalcSheetTotals(serviceClient, id);
  }

  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { id, itemId } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  const { data: sheet } = await serviceClient.from("consolidation_sheets").select("status").eq("id", id).single();
  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  if (sheet.status !== "pending") {
    return NextResponse.json({ error: "Cannot edit items on a finalized manifest" }, { status: 409 });
  }

  const { error } = await serviceClient
    .from("consolidation_sheet_items")
    .delete()
    .eq("id", itemId)
    .eq("sheet_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recalcSheetTotals(serviceClient, id);

  return NextResponse.json({ success: true });
}
