import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = supabase
    .from("waybills")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    query = query.or(
      `waybill_number.ilike.%${search}%,shipper_name.ilike.%${search}%,consignee_name.ilike.%${search}%,job_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  const { data: waybillNumber, error: numError } = await serviceClient.rpc("generate_waybill_number");
  if (numError) return NextResponse.json({ error: "Failed to generate waybill number" }, { status: 500 });

  const { data, error } = await serviceClient
    .from("waybills")
    .insert({
      ...body,
      waybill_number: waybillNumber,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "CREATE",
    entity_type: "waybills",
    entity_id: data.id,
    details: { waybill_number: waybillNumber },
  });

  return NextResponse.json(data, { status: 201 });
}
