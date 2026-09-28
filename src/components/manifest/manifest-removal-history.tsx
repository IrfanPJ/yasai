"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2, Loader2, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { ConsolidationSheetRemoval, UserRole } from "@/types";
import { MANIFEST_ZONE_LABELS } from "@/types";

interface Props {
  removals: ConsolidationSheetRemoval[];
  userRole: UserRole;
}

const EDIT_ROLES: UserRole[] = ["admin", "operations", "warehouse", "warehouse_supervisor"];

function statusOf(r: ConsolidationSheetRemoval) {
  if (r.restored_at) return "restored" as const;
  if (r.requeued_sheet_id) return "requeued" as const;
  return "queued" as const;
}

export function ManifestRemovalHistory({ removals: initial, userRole }: Props) {
  const router = useRouter();
  const [removals, setRemovals] = useState(initial);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const canRestore = EDIT_ROLES.includes(userRole);

  async function restore(id: string) {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/manifest/removals/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Restored to the original sheet");
      setRemovals((prev) => prev.map((r) => (r.id === id ? { ...r, restored_at: new Date().toISOString() } : r)));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setRestoringId(null);
    }
  }

  if (removals.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Nothing removed yet — removals from pending consolidation sheets will show up here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {removals.map((r) => {
        const status = statusOf(r);
        const canRestoreThis = canRestore && status === "queued" && r.original_sheet?.status === "pending";

        return (
          <Card key={r.id} className="border-none shadow-sm">
            <CardContent className="py-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/collections/${r.gcn_id}`} className="font-semibold text-sm text-[#071A3A] dark:text-white hover:underline">
                    {r.gcn?.collection_number || "—"}
                  </Link>
                  <Badge variant="outline" className="text-[10px]">{MANIFEST_ZONE_LABELS[r.zone]}</Badge>
                  {status === "queued" && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300">
                      <Clock className="h-3 w-3" /> Queued — waiting for next sheet
                    </Badge>
                  )}
                  {status === "requeued" && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-blue-700 border-blue-300">
                      <ArrowRight className="h-3 w-3" />
                      Picked up by {r.requeued_sheet?.sheet_number || "a newer sheet"}
                    </Badge>
                  )}
                  {status === "restored" && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-green-700 border-green-300">
                      <CheckCircle2 className="h-3 w-3" /> Restored
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.gcn?.consignee_name} &middot; removed from {r.original_sheet?.sheet_number || "—"}
                  {r.original_sheet?.status === "manifest" && " (now a manifest)"}
                  {" "}&middot; {formatDateTime(r.removed_at)}
                  {" "}&middot; {r.pallet_count} plt, {Number(r.cbm).toFixed(3)} CBM
                </p>
              </div>

              {canRestoreThis && (
                <Button
                  size="sm" variant="outline" className="gap-1.5 shrink-0"
                  disabled={restoringId === r.id}
                  onClick={() => restore(r.id)}
                >
                  {restoringId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                  Restore
                </Button>
              )}
              {status === "queued" && r.original_sheet?.status === "manifest" && (
                <span className="text-[11px] text-muted-foreground shrink-0">Original sheet locked — will join the next one</span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
