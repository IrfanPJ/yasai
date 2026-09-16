import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";
import { ensureBankProfile } from "@/lib/bank-profiles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  let query = supabase
    .from("fund_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) query = query.ilike("transfer_number", `%${search}%`);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  // Coerce empty strings to null for UUID/nullable fields
  const nullify = (v: unknown) => (v === "" || v === undefined ? null : v);
  const cleanBody = {
    ...body,
    fund_collection_id: nullify(body.fund_collection_id),
    third_party_name: nullify(body.third_party_name),
    third_party_location: nullify(body.third_party_location),
    bank_profile_id: nullify(body.bank_profile_id),
    source_account_id: nullify(body.source_account_id),
    destination_account_id: nullify(body.destination_account_id),
    bank_name: nullify(body.bank_name),
    bank_account_holder: nullify(body.bank_account_holder),
    destination_bank_account: nullify(body.destination_bank_account),
    swift_code: nullify(body.swift_code),
    bank_reference: nullify(body.bank_reference),
    transfer_rate: body.transfer_rate ? parseFloat(body.transfer_rate) : null,
    notes: nullify(body.notes),
  };

  if (cleanBody.transfer_mode === "bank_transfer" && !cleanBody.bank_profile_id && cleanBody.bank_name) {
    cleanBody.bank_profile_id = await ensureBankProfile(serviceClient, {
      bank_name: cleanBody.bank_name,
      account_holder: cleanBody.bank_account_holder,
      account_number: cleanBody.destination_bank_account,
      swift_code: cleanBody.swift_code,
      currency: cleanBody.destination_currency,
      createdBy: user.id,
    });
  }

  const { data: num, error: numErr } = await serviceClient.rpc("generate_transfer_number");
  if (numErr) return NextResponse.json({ error: "Failed to generate number" }, { status: 500 });

  const { data, error } = await serviceClient
    .from("fund_transfers")
    .insert({ ...cleanBody, transfer_number: num, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "CREATE",
    entity_type: "fund_transfers",
    entity_id: data.id,
    details: { transfer_number: num },
  });

  return NextResponse.json(data, { status: 201 });
}
