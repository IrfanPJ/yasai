import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { generateQRCode } from "@/lib/qr";
import { generateCollectionPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { GoodsCollectionNote } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search");
  const cargo = searchParams.get("cargo");
  const status = searchParams.get("status");

  let query = supabase
    .from("goods_collection_notes")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    query = query.or(
      `collection_number.ilike.%${search}%,shipper_name.ilike.%${search}%,consignee_name.ilike.%${search}%`
    );
  }
  if (cargo && cargo !== "all") query = query.eq("cargo_type", cargo);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // 1. Generate collection number
  const { data: numData, error: numError } = await serviceClient.rpc(
    "generate_collection_number"
  );
  if (numError) {
    return NextResponse.json(
      { error: "Failed to generate collection number" },
      { status: 500 }
    );
  }
  const collectionNumber: string = numData;

  // 2. Insert the record
  const { data: gcn, error: insertError } = await serviceClient
    .from("goods_collection_notes")
    .insert({
      ...body,
      collection_number: collectionNumber,
      status: "collected",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (insertError || !gcn) {
    return NextResponse.json(
      { error: insertError?.message || "Insert failed" },
      { status: 500 }
    );
  }

  // 3. Generate QR code
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
  const trackingUrl = `${appUrl}/track/${collectionNumber}`;
  let qrUrl: string | undefined;

  try {
    const qrDataUrl = await generateQRCode(trackingUrl);

    // Upload QR to Supabase Storage
    const qrBase64 = qrDataUrl.split(",")[1];
    if (!qrBase64) throw new Error("Invalid QR data URL");
    const qrBuffer = Buffer.from(qrBase64, "base64");
    const qrPath = `qr/${gcn.id}.png`;
    const { error: qrUploadError } = await serviceClient.storage
      .from("goods-collection-notes")
      .upload(qrPath, qrBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (!qrUploadError) {
      const { data: qrUrlData } = serviceClient.storage
        .from("goods-collection-notes")
        .getPublicUrl(qrPath);
      qrUrl = qrUrlData.publicUrl;
    }
  } catch (qrErr) {
    console.error("QR generation failed:", qrErr);
  }

  // 4. Generate PDF
  let pdfUrl: string | undefined;
  try {
    const fullGcn = { ...gcn, qr_url: qrUrl };
    const qrDataUrl = qrUrl ? await generateQRCode(trackingUrl) : undefined;
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateCollectionPDF(fullGcn as unknown as GoodsCollectionNote, qrDataUrl, logoDataUrl);

    const pdfPath = `pdf/${gcn.id}.pdf`;
    const { error: pdfUploadError } = await serviceClient.storage
      .from("goods-collection-notes")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (!pdfUploadError) {
      const { data: pdfUrlData } = serviceClient.storage
        .from("goods-collection-notes")
        .getPublicUrl(pdfPath);
      pdfUrl = pdfUrlData.publicUrl;
    }
  } catch (pdfErr) {
    console.error("PDF generation failed:", pdfErr);
  }

  // 5. Update record with PDF and QR URLs
  const { data: updated } = await serviceClient
    .from("goods_collection_notes")
    .update({ pdf_url: pdfUrl, qr_url: qrUrl })
    .eq("id", gcn.id)
    .select()
    .single();

  // 6. Log activity
  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "CREATE",
    entity_type: "goods_collection_notes",
    entity_id: gcn.id,
    details: { collection_number: collectionNumber },
  });

  return NextResponse.json(updated || gcn, { status: 201 });
}
