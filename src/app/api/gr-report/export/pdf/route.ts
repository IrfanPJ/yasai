import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateGrReportPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import { rangeLabelFromParams } from "@/lib/gr-report";
import type { GrReportEntry } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const isDownload = searchParams.get("download") !== "0";

  const serviceClient = createServiceClient();
  let query = serviceClient.from("gr_report_entries").select("*").order("entry_date", { ascending: false });
  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const rangeLabel = rangeLabelFromParams(from, to);
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateGrReportPDF((data || []) as GrReportEntry[], rangeLabel, logoDataUrl);
    const filename = `GR-Report-${rangeLabel.replace(/\s+/g, "-")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GR Report PDF export error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
