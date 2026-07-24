import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: existing } = await serviceClient
    .from("goods_collection_notes")
    .select("warehouse_report_status")
    .eq("id", id)
    .single();

  if (existing?.warehouse_report_status !== "submitted") {
    return NextResponse.json({ error: "Report can only be recalled when pending approval" }, { status: 409 });
  }

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({
      warehouse_report_status: "not_submitted",
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "WAREHOUSE_REPORT_RECALLED",
    entity_type: "goods_collection_notes",
    entity_id: id,
    details: { previous_status: "submitted" },
  });

  return NextResponse.json(data);
}
