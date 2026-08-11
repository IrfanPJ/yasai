import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateWaybillPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { Waybill } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const isDownload = request.nextUrl.searchParams.get("download") === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("waybills")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Waybill not found" }, { status: 404 });

  // Serve from stored URL if available
  if (data.pdf_url) {
    const filename = `Waybill-${data.waybill_number}.pdf`;
    if (!isDownload) {
      return NextResponse.redirect(data.pdf_url);
    }
    // For download: proxy the stored PDF so we can set Content-Disposition: attachment
    try {
      const stored = await fetch(data.pdf_url);
      if (stored.ok) {
        const bytes = await stored.arrayBuffer();
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      }
    } catch {
      // fall through to on-demand generation
    }
  }

  // Fallback: generate on demand
  try {
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateWaybillPDF(data as Waybill, logoDataUrl);
    const filename = `Waybill-${data.waybill_number}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Waybill PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
