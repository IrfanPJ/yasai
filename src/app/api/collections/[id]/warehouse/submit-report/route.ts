import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { sendWarehouseReportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: existing, error: fetchError } = await serviceClient
    .from("goods_collection_notes")
    .select("warehouse_received_at, collection_number, shipper_name, consignee_name")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  if (!existing.warehouse_received_at) {
    return NextResponse.json({ error: "Goods must be marked as received before submitting a report" }, { status: 400 });
  }

  const body = await request.json();

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({
      warehouse_report_status: "submitted",
      warehouse_report_submitted_by: user.id,
      warehouse_report_submitted_at: new Date().toISOString(),
      warehouse_report_notes: typeof body.notes === "string" ? body.notes : null,
      warehouse_report_rejection_reason: null,
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_REPORT_SUBMITTED",
    entity_type: "goods_collection_notes",
    entity_id: id,
  });

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
    const reviewUrl = `${appUrl}/collections/${id}`;
    const { data: approvers } = await serviceClient
      .from("user_profiles")
      .select("email")
      .in("role", ["admin", "operations"])
      .eq("is_active", true);

    for (const approver of approvers || []) {
      if (!approver.email) continue;
      await sendWarehouseReportEmail({
        to: approver.email,
        type: "submitted",
        collectionNumber: existing.collection_number,
        shipperName: existing.shipper_name,
        consigneeName: existing.consignee_name,
        reviewUrl,
      });
    }
  } catch (emailErr) {
    console.error("Warehouse report submitted email failed:", emailErr);
  }

  return NextResponse.json(data);
}
