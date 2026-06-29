import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

type RoleCheckResult =
  | { ok: true; user: { id: string }; serviceClient: ReturnType<typeof createServiceClient> }
  | { ok: false; error: string; status: 401 | 403 };

export async function requireRole(allowedRoles: UserRole[]): Promise<RoleCheckResult> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized", status: 401 };

  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  return { ok: true, user, serviceClient };
}
