import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("job_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  if (!destination) {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  const { data: jobNumber, error: numError } = await serviceClient.rpc("generate_job_number");
  if (numError) return NextResponse.json({ error: "Failed to generate job number" }, { status: 500 });

  const { data, error } = await serviceClient
    .from("job_orders")
    .insert({
      job_number: jobNumber as string,
      destination,
      truck_number: body.truck_number || null,
      driver_name: body.driver_name || null,
      driver_phone: body.driver_phone || null,
      transporter_name: body.transporter_name || null,
      departure_date: body.departure_date || null,
      notes: body.notes || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_CREATED",
    entity_type: "job_orders",
    entity_id: data.id,
    details: { job_number: jobNumber, destination },
  });

  return NextResponse.json(data, { status: 201 });
}
