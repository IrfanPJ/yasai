import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireModuleApiAccess } from "@/lib/require-module-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const moduleCheck = await requireModuleApiAccess("manifest");
  if (!moduleCheck.ok) return NextResponse.json({ error: moduleCheck.error }, { status: moduleCheck.status });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("consolidation_sheets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
