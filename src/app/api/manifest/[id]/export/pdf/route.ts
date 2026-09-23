import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateManifestPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { ConsolidationSheet, ConsolidationSheetItem } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const isDownload = req.nextUrl.searchParams.get("download") === "1";

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
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateManifestPDF(sheet as ConsolidationSheet, (items || []) as ConsolidationSheetItem[], logoDataUrl);
    const filename = `${sheet.sheet_number}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Manifest PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
