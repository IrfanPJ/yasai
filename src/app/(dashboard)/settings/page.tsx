import { Header } from "@/components/layout/header";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Use service client to fetch all users (bypasses RLS)
  const isAdmin = profile?.role === "admin";
  const { data: allUsers } = isAdmin
    ? await serviceClient
        .from("user_profiles")
        .select("*")
        .order("created_at")
    : { data: [] };

  return (
    <>
      <Header title="Settings" subtitle="Manage your account and system preferences" />
      <div className="flex-1 p-4 lg:p-6">
        <SettingsPanel
          currentUser={profile as UserProfile}
          allUsers={(allUsers || []) as UserProfile[]}
        />
      </div>
    </>
  );
}
