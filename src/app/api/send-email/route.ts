import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCollectionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, collectionId } = await request.json();

  if (!to || !collectionId) {
    return NextResponse.json(
      { error: "Missing required fields: to, collectionId" },
      { status: 400 }
    );
  }

  const { data: gcn, error } = await supabase
    .from("goods_collection_notes")
    .select("*")
    .eq("id", collectionId)
    .single();

  if (error || !gcn) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
  const trackingUrl = `${appUrl}/track/${gcn.collection_number}`;

  try {
    await sendCollectionEmail({
      to,
      collectionNumber: gcn.collection_number,
      shipperName: gcn.shipper_name,
      consigneeName: gcn.consignee_name,
      pdfUrl: gcn.pdf_url || `${appUrl}/api/pdf/${gcn.id}`,
      trackingUrl,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
