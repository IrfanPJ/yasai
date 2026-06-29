import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateWarehouseReportPDF } from "@/lib/pdf";
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
  if (!data.warehouse_received_at) {
    return NextResponse.json({ error: "Goods have not been received at the warehouse yet" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const userIds = [data.warehouse_received_by, data.warehouse_report_submitted_by, data.warehouse_report_approved_by]
    .filter((v): v is string => Boolean(v));

  const namesById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("user_profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profiles || []) namesById.set(p.id, p.full_name);
  }

  const logoDataUrl = getLogoDataUrl();
  const pdfBuffer = await generateWarehouseReportPDF(
    data as GoodsCollectionNote,
    {
      receivedBy: data.warehouse_received_by ? namesById.get(data.warehouse_received_by) : undefined,
      submittedBy: data.warehouse_report_submitted_by ? namesById.get(data.warehouse_report_submitted_by) : undefined,
      approvedBy: data.warehouse_report_approved_by ? namesById.get(data.warehouse_report_approved_by) : undefined,
    },
    logoDataUrl,
  );

  const isDownload = req.nextUrl.searchParams.get("download") === "1";
  const filename = `${data.collection_number}-warehouse-report.pdf`;
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
