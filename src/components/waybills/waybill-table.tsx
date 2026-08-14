"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, FileCheck2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import type { Waybill, WaybillTransportMode } from "@/types";

const TRANSPORT_COLORS: Record<WaybillTransportMode, string> = {
  road: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  air:  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sea:  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

interface Props { data: Waybill[] }

export function WaybillTable({ data }: Props) {
  const [search, setSearch] = useState("");

  const filtered = data.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.waybill_number.toLowerCase().includes(q) ||
      w.shipper_name.toLowerCase().includes(q) ||
      w.consignee_name.toLowerCase().includes(q) ||
      (w.job_number || "").toLowerCase().includes(q) ||
      (w.port_of_discharge || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-0">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search waybills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <FileCheck2 className="h-10 w-10 opacity-20" />
            <p className="text-sm">{search ? "No waybills match your search" : "No waybills yet"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
                <TableHead className="font-semibold">Waybill #</TableHead>
                <TableHead className="font-semibold">Shipper</TableHead>
                <TableHead className="font-semibold">Consignee</TableHead>
                <TableHead className="font-semibold">Route</TableHead>
                <TableHead className="font-semibold">Transport</TableHead>
                <TableHead className="font-semibold">Shipment Date</TableHead>
                <TableHead className="font-semibold">Job #</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => (
                <TableRow key={w.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="font-mono text-sm font-semibold text-[#E67A32]">
                      {w.waybill_number}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{w.shipper_name}</TableCell>
                  <TableCell className="text-sm">{w.consignee_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {w.port_of_loading} → {w.port_of_discharge}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs capitalize ${TRANSPORT_COLORS[w.mode_of_transport]}`}
                    >
                      {w.mode_of_transport}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {w.shipment_date
                      ? (() => { try { return format(new Date(w.shipment_date), "dd MMM yyyy"); } catch { return w.shipment_date; } })()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{w.job_number || "—"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/waybills/${w.id}`}
                      className="flex items-center gap-1 text-xs text-[#071A3A] dark:text-white hover:text-[#E67A32] font-medium"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
