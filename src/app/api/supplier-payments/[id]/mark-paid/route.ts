import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const { proof_url, notify_operations } = body;

  const update: Record<string, unknown> = {
    status: "paid",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (proof_url) update.proof_url = proof_url;

  if (notify_operations) {
    update.operations_notified = true;
    update.operations_notified_at = new Date().toISOString();
  }

  const { data, error } = await serviceClient
    .from("supplier_payments")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "MARK_PAID",
    entity_type: "supplier_payments",
    entity_id: id,
  });

  return NextResponse.json(data);
}
