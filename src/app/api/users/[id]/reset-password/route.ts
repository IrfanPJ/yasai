import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  // Get the user's email from their profile
  const { data: profile, error: profileError } = await serviceClient
    .from("user_profiles")
    .select("email")
    .eq("id", id)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Send password reset email via Supabase
  const { error } = await serviceClient.auth.resetPasswordForEmail(profile.email, {
    redirectTo: "https://erp.yasailogistics.com/auth/reset-password",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, email: profile.email });
}
