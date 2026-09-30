import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { convertSheetToManifest } from "@/lib/manifest";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: sheet } = await serviceClient
    .from("consolidation_sheets")
    .select("id, status, item_count")
    .eq("id", id)
    .single();

  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
  if (sheet.status !== "pending") {
    return NextResponse.json({ error: "Sheet is already a manifest" }, { status: 409 });
  }
  if (sheet.item_count === 0) {
    return NextResponse.json({ error: "Cannot convert an empty sheet" }, { status: 400 });
  }

  const jobOrderId = await convertSheetToManifest(serviceClient, id, user.id, "manual");
  return NextResponse.json({ success: true, job_order_id: jobOrderId });
}
