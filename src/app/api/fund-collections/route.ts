import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  let query = supabase
    .from("fund_collections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    query = query.or(
      `collection_number.ilike.%${search}%,customer_name.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "operations", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  const nullify = (v: unknown) => (v === "" || v === undefined ? null : v);
  const cleanBody = {
    ...body,
    invoice_id: nullify(body.invoice_id),
    bank_reference: nullify(body.bank_reference),
    destination_account: nullify(body.destination_account),
    notes: nullify(body.notes),
  };

  const { data: num, error: numErr } = await serviceClient.rpc("generate_collection_number");
  if (numErr) return NextResponse.json({ error: "Failed to generate number" }, { status: 500 });

  const { data, error } = await serviceClient
    .from("fund_collections")
    .insert({ ...cleanBody, collection_number: num, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "CREATE",
    entity_type: "fund_collections",
    entity_id: data.id,
    details: { collection_number: num },
  });

  return NextResponse.json(data, { status: 201 });
}
