import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCollectionPDF } from "@/lib/pdf";
import { generateQRCode } from "@/lib/qr";
import { getLogoDataUrl } from "@/lib/logo";
import type { GoodsCollectionNote } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goods_collection_notes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
  const trackingUrl = `${appUrl}/track/${data.collection_number}`;

  const [qrDataUrl, logoDataUrl] = await Promise.all([
    generateQRCode(trackingUrl),
    Promise.resolve(getLogoDataUrl()),
  ]);

  const pdfBuffer = await generateCollectionPDF(
    data as GoodsCollectionNote,
    qrDataUrl,
    logoDataUrl,
  );

  // ?download=1  → force browser download (Save PDF)
  // default      → open inline in browser (Print PDF / view)
  const isDownload = req.nextUrl.searchParams.get("download") === "1";
  const disposition = isDownload
    ? `attachment; filename="${data.collection_number}.pdf"`
    : `inline; filename="${data.collection_number}.pdf"`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
