import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { sendWarehouseReportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: existing, error: fetchError } = await serviceClient
    .from("goods_collection_notes")
    .select("warehouse_report_status, warehouse_report_submitted_by, collection_number, shipper_name, consignee_name")
    .eq("id", id)
    .single();

  if (fetchError || !existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  if (existing.warehouse_report_status !== "submitted") {
    return NextResponse.json({ error: "Report is not pending approval" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({
      warehouse_report_status: "approved",
      warehouse_report_approved_by: user.id,
      warehouse_report_approved_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_REPORT_APPROVED",
    entity_type: "goods_collection_notes",
    entity_id: id,
  });

  try {
    if (existing.warehouse_report_submitted_by) {
      const { data: submitter } = await serviceClient
        .from("user_profiles")
        .select("email")
        .eq("id", existing.warehouse_report_submitted_by)
        .single();

      if (submitter?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
        await sendWarehouseReportEmail({
          to: submitter.email,
          type: "approved",
          collectionNumber: existing.collection_number,
          shipperName: existing.shipper_name,
          consigneeName: existing.consignee_name,
          reviewUrl: `${appUrl}/collections/${id}`,
        });
      }
    }
  } catch (emailErr) {
    console.error("Warehouse report approved email failed:", emailErr);
  }

  return NextResponse.json(data);
}
