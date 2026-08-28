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
  const { status, received_amount, receipt_date, receipt_url, third_party_receipt_url, bank_reference } = body;

  const update: Record<string, unknown> = {
    status,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (status === "in_transit") {
    update.transferred_by = user.id;
    update.transferred_at = new Date().toISOString();
    if (bank_reference) update.bank_reference = bank_reference;
    if (third_party_receipt_url) update.third_party_receipt_url = third_party_receipt_url;
  }

  if (status === "confirmed") {
    update.confirmed_by = user.id;
    update.confirmed_at = new Date().toISOString();
    if (received_amount) update.received_amount = received_amount;
    if (receipt_date) update.receipt_date = receipt_date;
    if (receipt_url) update.receipt_url = receipt_url;
  }

  const { data, error } = await serviceClient
    .from("fund_transfers")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: `TRANSFER_${status.toUpperCase()}`,
    entity_type: "fund_transfers",
    entity_id: id,
  });

  return NextResponse.json(data);
}
