import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCollectionPDF } from "@/lib/pdf";
import { generateQRCode } from "@/lib/qr";
import { getLogoDataUrl } from "@/lib/logo";
import { buildReceiptFilename } from "@/lib/utils";
import type { GoodsCollectionNote } from "@/types";

export async function servePdfResponse(id: string, isDownload: boolean) {
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

  // filename is always derived from the DB record server-side — never trust
  // whatever cosmetic filename segment the client put in the URL path.
  const filename = buildReceiptFilename(data.consignee_name);
  const disposition = isDownload
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
