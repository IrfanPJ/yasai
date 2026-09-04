import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${id}/invoice.${ext}`;

  const { error: upErr } = await serviceClient.storage
    .from("invoice-uploads")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = serviceClient.storage.from("invoice-uploads").getPublicUrl(path);

  const { error } = await serviceClient
    .from("invoices")
    .update({ uploaded_file_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  const { data: inv } = await serviceClient.from("invoices").select("uploaded_file_url").eq("id", id).single();
  if (inv?.uploaded_file_url) {
    const url = new URL(inv.uploaded_file_url);
    const storagePath = url.pathname.split("/invoice-uploads/")[1];
    if (storagePath) await serviceClient.storage.from("invoice-uploads").remove([storagePath]);
  }

  await serviceClient.from("invoices").update({ uploaded_file_url: null, updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ success: true });
}
