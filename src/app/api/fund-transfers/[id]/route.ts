import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("fund_transfers").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const { transfer_number, created_by, created_at, ...rest } = body;
  void transfer_number; void created_by; void created_at;

  const nullify = (v: unknown) => (v === "" || v === undefined ? null : v);
  const cleanRest = {
    ...rest,
    fund_collection_id: nullify(rest.fund_collection_id),
    third_party_name: nullify(rest.third_party_name),
    third_party_location: nullify(rest.third_party_location),
    destination_bank_account: nullify(rest.destination_bank_account),
    bank_reference: nullify(rest.bank_reference),
    notes: nullify(rest.notes),
  };

  const { data, error } = await serviceClient
    .from("fund_transfers")
    .update({ ...cleanRest, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
  return NextResponse.json(data);
}
