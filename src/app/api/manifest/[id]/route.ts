import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function GET(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const [{ data: sheet, error }, { data: items }] = await Promise.all([
    serviceClient.from("consolidation_sheets").select("*").eq("id", id).single(),
    serviceClient
      .from("consolidation_sheet_items")
      .select("*, gcn:goods_collection_notes(*)")
      .eq("sheet_id", id)
      .order("position"),
  ]);

  if (error || !sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });

  return NextResponse.json({ ...sheet, items: items || [] });
}
