"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { UserProfile, UserRole, Warehouse } from "@/types";
import { useTheme } from "next-themes";
import {
  Loader2, Shield, User, Building2, Sun, Users,
  UserCheck, UserX, Crown, Eye, Wrench, Warehouse as WarehouseIcon, Calculator,
  Plus, MapPin, Pencil, Check, X, KeyRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsPanelProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  warehouse: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  warehouse_supervisor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  finance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const ROLE_ICONS: Record<UserRole, typeof Crown> = {
  admin: Crown,
  operations: Wrench,
  warehouse: WarehouseIcon,
  warehouse_supervisor: UserCheck,
  finance: Calculator,
  viewer: Eye,
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full access — manage users, settings, and all data",
  operations: "Create, edit, delete collections and manage shipments",
  warehouse: "View and update collection status in warehouse",
  warehouse_supervisor: "Second-check warehouse verification (Warehouse Incharge - 2)",
  finance: "Manage invoices, track payments, and financial reporting",
  viewer: "Read-only access to view collections and reports",
};

export function SettingsPanel({ currentUser, allUsers }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.full_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPasswordAdmin, setNewPasswordAdmin] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  // Warehouses state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [newWhCode, setNewWhCode] = useState("");
  const [newWhName, setNewWhName] = useState("");
  const [newWhCountry, setNewWhCountry] = useState<"UAE" | "KSA">("UAE");
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [editingWh, setEditingWh] = useState<string | null>(null);
  const [editWhName, setEditWhName] = useState("");

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWarehouses(data); })
      .catch(() => {});
  }, []);

  async function handleAddWarehouse() {
    if (!newWhCode.trim() || !newWhName.trim()) return;
    setSavingWarehouse(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newWhCode, name: newWhName, country: newWhCountry }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const wh = await res.json();
      setWarehouses((prev) => [...prev, wh]);
      setNewWhCode(""); setNewWhName(""); setNewWhCountry("UAE");
      toast.success("Warehouse added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add warehouse");
    } finally {
      setSavingWarehouse(false);
    }
  }

  async function handleToggleWarehouse(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setWarehouses((prev) => prev.map((w) => w.id === id ? { ...w, is_active: isActive } : w));
      toast.success(isActive ? "Warehouse activated" : "Warehouse deactivated");
    } catch { toast.error("Failed to update warehouse"); }
  }

  async function handleRenameWarehouse(id: string) {
    if (!editWhName.trim()) return;
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editWhName }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setWarehouses((prev) => prev.map((w) => w.id === id ? updated : w));
      setEditingWh(null);
      toast.success("Warehouse renamed");
    } catch { toast.error("Failed to rename warehouse"); }
  }

  async function handleUpdateUserWarehouse(userId: string, warehouseId: string) {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouse_id: warehouseId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Warehouse assigned");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign warehouse");
    } finally {
      setUpdatingUser(null);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ full_name: fullName })
        .eq("id", currentUser.id);
      if (error) throw error;
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleUpdateUserRole(userId: string, role: UserRole) {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      toast.success(`Role updated to ${role}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingUser(null);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }
      toast.success(`User ${isActive ? "activated" : "deactivated"}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUpdatingUser(null);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || !newPasswordAdmin) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPasswordAdmin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      toast.success(`Password updated for ${resetTarget.name}`);
      setResetTarget(null);
      setNewPasswordAdmin("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  }

  const activeUsers = allUsers.filter((u) => u.is_active);
  const inactiveUsers = allUsers.filter((u) => !u.is_active);

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Shield className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="warehouses" className="gap-2">
              <WarehouseIcon className="h-4 w-4" />
              Warehouses
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={currentUser?.email} disabled className="opacity-70" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input value={currentUser?.role} disabled className="opacity-70 capitalize" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword}
                className="gap-2"
              >
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                />
              </div>
              <Separator />
              <div className="flex gap-3">
                {["light", "dark", "system"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                      theme === t
                        ? "border-[#071A3A] bg-[#071A3A] text-white"
                        : "border-border hover:border-[#071A3A]/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Company ── */}
        <TabsContent value="company">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company Name</Label>
                  <Input defaultValue="YASAI Logistics Company" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input defaultValue="+966 55 932 6687" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue="info@yasailogistics.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input defaultValue="www.yasailogistics.com" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>UAE Address</Label>
                  <Input defaultValue="H.H Shaikh Saud Bin Saqar, Al Muteena Dubai – UAE" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>KSA Address</Label>
                  <Input defaultValue="7579 Ibn Al Mallah, Nahda, Riyadh, KSA" />
                </div>
              </div>
              <Button>Save Company Info</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users & Roles (Admin only) ── */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            {/* Role Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["admin", "operations", "warehouse", "warehouse_supervisor", "finance", "viewer"] as UserRole[]).map((role) => {
                const RoleIcon = ROLE_ICONS[role];
                const count = allUsers.filter((u) => u.role === role).length;
                return (
                  <Card key={role} className="border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${ROLE_COLORS[role]}`}>
                          <RoleIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-[#071A3A] dark:text-white">{count}</p>
                          <p className="text-xs text-muted-foreground capitalize">{role}s</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Active Users */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#E67A32]" />
                      Active Users
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {activeUsers.length} active user{activeUsers.length !== 1 ? "s" : ""} — assign roles to control access
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Current Role</TableHead>
                      <TableHead className="font-semibold">Change Role</TableHead>
                      <TableHead className="font-semibold">Warehouse</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="font-semibold text-center">Password</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeUsers.map((u) => {
                      const RoleIcon = ROLE_ICONS[u.role] ?? Eye;
                      const isSelf = u.id === currentUser?.id;
                      const isUpdating = updatingUser === u.id;

                      return (
                        <TableRow key={u.id} className={isSelf ? "bg-[#FFF7ED]/50 dark:bg-orange-950/10" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-[#071A3A] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {(u.full_name || u.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-[#071A3A] dark:text-white">
                                  {u.full_name || "No name set"}
                                  {isSelf && (
                                    <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E67A32] text-white">
                                      YOU
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={`${ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer} gap-1 text-xs font-semibold`}
                              >
                                <RoleIcon className="h-3 w-3" />
                                {u.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isSelf ? (
                              <p className="text-xs text-muted-foreground italic">Cannot change own role</p>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={u.role}
                                  onValueChange={(v) => handleUpdateUserRole(u.id, v as UserRole)}
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="h-8 text-xs w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(["admin", "operations", "warehouse", "warehouse_supervisor", "finance", "viewer"] as UserRole[]).map((role) => {
                                      const Icon = ROLE_ICONS[role];
                                      return (
                                        <SelectItem key={role} value={role}>
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-3 w-3" />
                                            <span className="capitalize">{role}</span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {["warehouse", "warehouse_supervisor"].includes(u.role) ? (
                              <Select
                                value={u.warehouse_id || "none"}
                                onValueChange={(v) => handleUpdateUserWarehouse(u.id, v === "none" ? "" : v)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="h-8 text-xs w-36">
                                  <SelectValue placeholder="Assign..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— Not assigned —</SelectItem>
                                  {warehouses.filter((w) => w.is_active).map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                      <span className="font-mono font-semibold">{w.code}</span>
                                      <span className="ml-1.5 text-muted-foreground">{w.name}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isSelf ? (
                              <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Switch
                                checked={u.is_active}
                                onCheckedChange={(v) => handleToggleActive(u.id, v)}
                                disabled={isUpdating}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-orange-600"
                                onClick={() => { setResetTarget({ id: u.id, name: u.full_name || u.email }); setNewPasswordAdmin(""); }}
                                title="Reset password"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                                Reset
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Role Descriptions */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#071A3A] dark:text-white" />
                  Role Permissions
                </CardTitle>
                <CardDescription>
                  Understanding what each role can do in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(["admin", "operations", "warehouse", "warehouse_supervisor", "finance", "viewer"] as UserRole[]).map((role) => {
                    const RoleIcon = ROLE_ICONS[role];
                    return (
                      <div
                        key={role}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
                      >
                        <div className={`p-2 rounded-lg ${ROLE_COLORS[role]} flex-shrink-0`}>
                          <RoleIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold capitalize text-[#071A3A] dark:text-white">
                            {role}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Inactive Users */}
            {inactiveUsers.length > 0 && (
              <Card className="border-none shadow-sm border-l-4 border-l-yellow-400">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <UserX className="h-4 w-4" />
                    Deactivated Users ({inactiveUsers.length})
                  </CardTitle>
                  <CardDescription>
                    These users cannot log in. Toggle the switch to reactivate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {inactiveUsers.map((u) => {
                        const isUpdating = updatingUser === u.id;
                        return (
                          <TableRow key={u.id} className="opacity-60">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
                                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{u.full_name || "No name set"}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={() => handleToggleActive(u.id, true)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                                Reactivate
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── Warehouses (Admin only) ── */}
        {isAdmin && (
          <TabsContent value="warehouses" className="space-y-6">
            {/* Add warehouse */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#E67A32]" /> Add Warehouse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Code</Label>
                    <Input
                      value={newWhCode}
                      onChange={(e) => setNewWhCode(e.target.value.toUpperCase())}
                      placeholder="e.g. UW04"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs uppercase tracking-wide">Name</Label>
                    <Input
                      value={newWhName}
                      onChange={(e) => setNewWhName(e.target.value)}
                      placeholder="e.g. UAE Warehouse 4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Country</Label>
                    <Select value={newWhCountry} onValueChange={(v) => setNewWhCountry(v as "UAE" | "KSA")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UAE">UAE</SelectItem>
                        <SelectItem value="KSA">KSA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="mt-3 gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]"
                  disabled={savingWarehouse || !newWhCode.trim() || !newWhName.trim()}
                  onClick={handleAddWarehouse}
                >
                  {savingWarehouse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Warehouse
                </Button>
              </CardContent>
            </Card>

            {/* Warehouse list grouped by country */}
            {(["UAE", "KSA"] as const).map((country) => {
              const list = warehouses.filter((w) => w.country === country);
              if (list.length === 0) return null;
              return (
                <Card key={country} className="border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5" /> {country} Warehouses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
                          <TableHead className="font-semibold w-24">Code</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold text-center w-24">Active</TableHead>
                          <TableHead className="w-24" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((w) => (
                          <TableRow key={w.id} className={w.is_active ? "" : "opacity-50"}>
                            <TableCell className="font-mono font-bold text-[#071A3A] dark:text-white">{w.code}</TableCell>
                            <TableCell>
                              {editingWh === w.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    className="h-7 text-sm"
                                    value={editWhName}
                                    onChange={(e) => setEditWhName(e.target.value)}
                                    autoFocus
                                  />
                                  <button onClick={() => handleRenameWarehouse(w.id)} className="text-green-600 hover:text-green-700">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setEditingWh(null)} className="text-muted-foreground hover:text-red-500">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <span>{w.name}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={w.is_active}
                                onCheckedChange={(v) => handleToggleWarehouse(w.id, v)}
                              />
                            </TableCell>
                            <TableCell>
                              {editingWh !== w.id && (
                                <button
                                  onClick={() => { setEditingWh(w.id); setEditWhName(w.name); }}
                                  className="text-muted-foreground hover:text-[#071A3A] dark:hover:text-white"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}
      </Tabs>

      {/* ── Reset Password Dialog ── */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => { if (!o) { setResetTarget(null); setNewPasswordAdmin(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPasswordAdmin}
              onChange={(e) => setNewPasswordAdmin(e.target.value)}
              placeholder="Minimum 6 characters"
              onKeyDown={(e) => { if (e.key === "Enter") handleResetPassword(); }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setResetTarget(null); setNewPasswordAdmin(""); }}
              disabled={resettingPassword}
            >
              Cancel
            </Button>
            <Button
              disabled={resettingPassword || newPasswordAdmin.length < 6}
              onClick={handleResetPassword}
              className="gap-1.5"
            >
              {resettingPassword
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <KeyRound className="h-3.5 w-3.5" />}
              Set Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
