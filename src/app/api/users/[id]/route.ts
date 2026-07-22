import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_ROLES: UserRole[] = ["admin", "operations", "warehouse", "warehouse_supervisor", "finance", "viewer"];

// Admin-only: Update a user's role or active status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: targetUserId } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // 1. Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify the requester is an admin
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  // 3. Prevent self-demotion
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot modify your own account via this endpoint" }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Validate role if provided
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }
    updates.role = body.role;
  }

  // Validate is_active if provided
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
    }
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // 4. Update with service client (bypasses RLS)
  const { data, error } = await serviceClient
    .from("user_profiles")
    .update(updates)
    .eq("id", targetUserId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 5. Log activity
  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "UPDATE_USER",
    entity_type: "user_profiles",
    entity_id: targetUserId,
    details: { fields: Object.keys(updates), values: updates },
  });

  return NextResponse.json(data);
}

// Admin-only: Delete (deactivate) a user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: targetUserId } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Deactivate instead of hard delete
  const { error } = await serviceClient
    .from("user_profiles")
    .update({ is_active: false })
    .eq("id", targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "DEACTIVATE_USER",
    entity_type: "user_profiles",
    entity_id: targetUserId,
  });

  return NextResponse.json({ success: true });
}
