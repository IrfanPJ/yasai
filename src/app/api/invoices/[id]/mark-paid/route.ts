import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json().catch(() => ({}));

  const { data, error } = await serviceClient
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_notes: body.payment_notes || null,
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "INVOICE_PAID",
    entity_type: "invoices",
    entity_id: id,
  });

  return NextResponse.json(data);
}
