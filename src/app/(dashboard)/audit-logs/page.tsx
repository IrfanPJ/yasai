import { Header } from "@/components/layout/header";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs" };

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  EXPORT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default async function AuditLogsPage() {
  const serviceClient = createServiceClient();

  // Fetch logs via service role to bypass RLS, then separately fetch user names
  const { data: logs } = await serviceClient
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  // Collect unique user ids and look up their profiles
  const userIds = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean))];
  const profileMap: Record<string, { full_name?: string; email?: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  const data = (logs ?? []).map((l) => ({ ...l, user: profileMap[l.user_id] ?? null }));

  return (
    <>
      <Header
        title="Audit Logs"
        subtitle="Track all system activity and changes"
      />
      <div className="flex-1 p-4 lg:p-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">
                          {(log.user as { full_name?: string })?.full_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(log.user as { email?: string })?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            ACTION_COLORS[log.action] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.entity_type && (
                          <div className="font-medium">{log.entity_type}</div>
                        )}
                        {log.entity_id && (
                          <div className="text-xs text-muted-foreground font-mono truncate max-w-24">
                            {log.entity_id}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-40">
                        {log.details
                          ? JSON.stringify(log.details).substring(0, 60) + "..."
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.ip_address || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
