import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generatePackingListPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { GoodsCollectionNote, JobOrder } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const [{ data: job, error }, { data: gcnLinks }] = await Promise.all([
    serviceClient.from("job_orders").select("*").eq("id", id).single(),
    serviceClient
      .from("job_order_gcns")
      .select("gcn:goods_collection_notes(*)")
      .eq("job_order_id", id),
  ]);

  if (error || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const gcns = (gcnLinks || []).map((r: { gcn: unknown }) => r.gcn as GoodsCollectionNote);

  try {
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generatePackingListPDF(job as JobOrder, gcns, logoDataUrl);
    const filename = `Packing List - ${(job as JobOrder).job_number}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Packing list PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
