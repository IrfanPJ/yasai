import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateManifestExcel } from "@/lib/manifest-excel";
import type { ConsolidationSheet, ConsolidationSheetItem } from "@/types";

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

  try {
    const buffer = await generateManifestExcel(sheet as ConsolidationSheet, (items || []) as ConsolidationSheetItem[]);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${sheet.sheet_number}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Manifest Excel export error:", err);
    return NextResponse.json({ error: "Excel export failed" }, { status: 500 });
  }
}
