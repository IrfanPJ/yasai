import { NextRequest } from "next/server";
import { servePdfResponse } from "@/lib/pdf-route-handler";

export const dynamic = "force-dynamic";

interface RouteParams {
  // filename is purely cosmetic — it makes browsers' built-in PDF viewers
  // derive the right "Save" name from the URL path. The actual filename
  // served is always recomputed server-side from the DB record.
  params: Promise<{ id: string; filename: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const isDownload = req.nextUrl.searchParams.get("download") === "1";
  return servePdfResponse(id, isDownload);
}
