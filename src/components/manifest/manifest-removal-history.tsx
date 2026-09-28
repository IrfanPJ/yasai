"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2, Loader2, Clock, ArrowRight, CheckCircle2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { ConsolidationSheetRemoval, ManifestZone, UserRole } from "@/types";
import { MANIFEST_ZONE_LABELS } from "@/types";

interface Props {
  removals: ConsolidationSheetRemoval[];
  userRole: UserRole;
}

const EDIT_ROLES: UserRole[] = ["admin", "operations", "warehouse", "warehouse_supervisor"];
const ZONES: ManifestZone[] = ["mainland", "jafza"];

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {ZONES.map((zone) => {
        const zoneRemovals = removals.filter((r) => r.zone === zone);
        return (
          <Card key={zone} className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#071A3A] dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-[#E67A32]" />
                {MANIFEST_ZONE_LABELS[zone]}
                <span className="text-xs font-normal text-muted-foreground">({zoneRemovals.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {zoneRemovals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing removed in this zone yet.</p>
              ) : (
                zoneRemovals.map((r) => {
                  const status = statusOf(r);
                  const canRestoreThis = canRestore && status === "queued" && r.original_sheet?.status === "pending";

                  return (
                    <div key={r.id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/collections/${r.gcn_id}`} className="font-semibold text-sm text-[#071A3A] dark:text-white hover:underline">
                              {r.gcn?.collection_number || "—"}
                            </Link>
                            {status === "queued" && (
                              <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300">
                                <Clock className="h-3 w-3" /> Queued
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
                          <span className="text-[11px] text-muted-foreground shrink-0">Locked — will join the next sheet</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
