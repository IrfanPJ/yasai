import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateDeliveryNotePDF } from "@/lib/pdf";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: collectionId } = await params;
  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: dn, error } = await serviceClient
    .from("delivery_notes")
    .select("*")
    .eq("collection_id", collectionId)
    .single();

  if (error || !dn) {
    return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateDeliveryNotePDF(dn);
    const safe = (dn.customer_name || "Delivery")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();
    const filename = `Delivery Note - ${safe}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Delivery note PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
