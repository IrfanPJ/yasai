import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";
import { ensureBankProfile } from "@/lib/bank-profiles";

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
    bank_profile_id: nullify(rest.bank_profile_id),
    bank_name: nullify(rest.bank_name),
    bank_account_holder: nullify(rest.bank_account_holder),
    destination_bank_account: nullify(rest.destination_bank_account),
    swift_code: nullify(rest.swift_code),
    bank_reference: nullify(rest.bank_reference),
    transfer_rate: rest.transfer_rate ? parseFloat(rest.transfer_rate) : null,
    notes: nullify(rest.notes),
    over_transfer_reason: nullify(rest.over_transfer_reason),
  };

  if (cleanRest.transfer_mode === "bank_transfer" && !cleanRest.bank_profile_id && cleanRest.bank_name) {
    cleanRest.bank_profile_id = await ensureBankProfile(serviceClient, {
      bank_name: cleanRest.bank_name,
      account_holder: cleanRest.bank_account_holder,
      account_number: cleanRest.destination_bank_account,
      swift_code: cleanRest.swift_code,
      currency: cleanRest.destination_currency,
      createdBy: user.id,
    });
  }

  const { data, error } = await serviceClient
    .from("fund_transfers")
    .update({ ...cleanRest, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });

  if (cleanRest.over_transfer_reason) {
    await serviceClient.from("activity_logs").insert({
      user_id: user.id,
      action: "OVER_TRANSFER",
      entity_type: "fund_transfers",
      entity_id: id,
      details: { transfer_number: data.transfer_number, reason: cleanRest.over_transfer_reason, fund_collection_id: cleanRest.fund_collection_id },
    });
  }

  return NextResponse.json(data);
}
