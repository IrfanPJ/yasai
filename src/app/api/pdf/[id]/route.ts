import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCollectionPDF } from "@/lib/pdf";
import { generateQRCode } from "@/lib/qr";
import type { GoodsCollectionNote } from "@/types";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Read the official Yasai logo from disk and return as a base64 data URL.
 * @react-pdf/renderer cannot fetch images from http://localhost during SSR,
 * so we embed the file directly via the filesystem.
 */
function getLogoDataUrl(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "yasai-logo-logistics.jpeg");
    const buffer = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
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

  return new NextResponse(pdfBuffer as unknown as Uint8Array, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
