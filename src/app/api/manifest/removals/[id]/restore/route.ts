import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { restoreRemoval } from "@/lib/manifest";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const result = await restoreRemoval(serviceClient, id, user.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json({ success: true });
}
