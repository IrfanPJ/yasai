"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, ClipboardList, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { ConsolidationSheet, ManifestZone } from "@/types";
import { MANIFEST_ZONE_LABELS, CONSOLIDATION_CBM_LIMIT } from "@/types";

const ZONES: ManifestZone[] = ["mainland", "jafza"];

export function ManifestOverview({ sheets }: { sheets: ConsolidationSheet[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {ZONES.map((zone) => {
        const zoneSheets = sheets.filter((s) => s.zone === zone);
        const pending = zoneSheets.find((s) => s.status === "pending");
        const manifests = zoneSheets.filter((s) => s.status === "manifest");
        const pct = pending ? Math.min(100, Math.round((pending.cbm_total / CONSOLIDATION_CBM_LIMIT) * 100)) : 0;

        return (
          <Card key={zone} className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#071A3A] dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-[#E67A32]" />
                {MANIFEST_ZONE_LABELS[zone]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Pending sheet progress */}
              {pending ? (
                <Link
                  href={`/manifest/${pending.id}`}
                  className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-[#E67A32] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{pending.sheet_number}</span>
                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                  </div>
                  <Progress value={pct} className="h-2 mb-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{pending.item_count} GCNs &middot; {pending.pallet_count} pallets</span>
                    <span className="font-semibold text-[#071A3A] dark:text-white">
                      {pending.cbm_total.toFixed(3)} / {CONSOLIDATION_CBM_LIMIT} CBM
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center text-xs text-muted-foreground">
                  No pending sheet yet — one is created automatically when a {MANIFEST_ZONE_LABELS[zone]} GCN is collected.
                </div>
              )}

              {/* Manifest history */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Manifests ({manifests.length})
                </p>
                {manifests.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None converted yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {manifests.slice(0, 6).map((m) => (
                      <Link
                        key={m.id}
                        href={`/manifest/${m.id}`}
                        className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ClipboardList className="h-3.5 w-3.5 text-[#E67A32] shrink-0" />
                          <span className="font-medium text-[#071A3A] dark:text-white truncate">{m.sheet_number}</span>
                          <span className="text-muted-foreground shrink-0">{m.cbm_total.toFixed(3)} CBM</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                          {m.converted_at && <span>{formatDateTime(m.converted_at)}</span>}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
