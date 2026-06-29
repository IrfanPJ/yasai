"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, Download, Eye, Pencil, Trash2, MessageCircle,
  Filter, X, FileDown, Plane, Ship, Truck, Printer, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { formatDate, formatWeight, generateWhatsAppMessage, openWhatsApp, downloadFile, buildReceiptFilename, buildPdfPath } from "@/lib/utils";
import type { GoodsCollectionNote, CargoType } from "@/types";
import { STATUS_LABELS, CARGO_TYPE_LABELS } from "@/types";

interface CollectionsTableProps {
  data: GoodsCollectionNote[];
  initialSearch?: string;
  initialCargo?: string;
  initialStatus?: string;
}

const CARGO_ICONS: Record<CargoType, React.ReactNode> = {
  air: <Plane className="h-3.5 w-3.5" />,
  sea: <Ship className="h-3.5 w-3.5" />,
  land: <Truck className="h-3.5 w-3.5" />,
};

export function CollectionsTable({
  data,
  initialSearch = "",
  initialCargo = "all",
  initialStatus = "all",
}: CollectionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [cargoFilter, setCargoFilter] = useState(initialCargo);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        !search ||
        item.collection_number.toLowerCase().includes(search.toLowerCase()) ||
        item.shipper_name.toLowerCase().includes(search.toLowerCase()) ||
        item.consignee_name.toLowerCase().includes(search.toLowerCase()) ||
        item.destination.toLowerCase().includes(search.toLowerCase());

      const matchCargo = cargoFilter === "all" || item.cargo_type === cargoFilter;
      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchSearch && matchCargo && matchStatus;
    });
  }, [data, search, cargoFilter, statusFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Collection deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function handleWhatsApp(item: GoodsCollectionNote) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const msg = generateWhatsAppMessage({
      collectionNumber: item.collection_number,
      pdfLink: item.pdf_url || `${appUrl}${buildPdfPath(item.id, item.consignee_name)}`,
      trackingLink: `${appUrl}/track/${item.collection_number}`,
    });
    openWhatsApp(msg);
  }

  function handlePrintPDF(item: GoodsCollectionNote) {
    window.open(buildPdfPath(item.id, item.consignee_name), "_blank");
  }

  function handleDownloadPDF(item: GoodsCollectionNote) {
    downloadFile(buildPdfPath(item.id, item.consignee_name, true), buildReceiptFilename(item.consignee_name));
  }

  async function handleSharePDF(item: GoodsCollectionNote) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const pdfUrl = item.pdf_url || `${appUrl}${buildPdfPath(item.id, item.consignee_name)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `GCN ${item.collection_number}`,
          text: `Goods Collection Note – ${item.collection_number}`,
          url: pdfUrl,
        });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(pdfUrl);
      toast.success("PDF link copied to clipboard");
    }
  }

  function exportToExcel() {
    const headers = [
      "Collection #", "Shipper", "Consignee", "Destination", "Commodity",
      "Cargo Type", "Weight (KG)", "Volume (CBM)", "Packages", "Status",
      "Doc Ref", "Date",
    ];
    const rows = filtered.map((item) => [
      item.collection_number,
      item.shipper_name,
      item.consignee_name,
      item.destination,
      item.commodity,
      CARGO_TYPE_LABELS[item.cargo_type],
      item.weight_kg,
      item.volume_cbm,
      item.num_packages,
      STATUS_LABELS[item.status],
      item.doc_ref_number,
      formatDate(item.created_at),
    ]);

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `YASAI-Collections-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file exported");
  }

  const clearFilters = () => {
    setSearch("");
    setCargoFilter("all");
    setStatusFilter("all");
  };

  const hasFilters = search || cargoFilter !== "all" || statusFilter !== "all";

  return (
    <>
      <Card className="border-none shadow-sm">
        {/* ── Filter Bar ── */}
        <div className="p-3 md:p-4 border-b flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search — full width on mobile */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by #, shipper, consignee..."
              className="pl-9 h-9 text-sm w-full"
            />
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="h-9 w-full xs:w-36 text-sm flex-1 sm:flex-none sm:w-36">
                <Filter className="h-3.5 w-3.5 mr-1 shrink-0" />
                <SelectValue placeholder="Cargo Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="air">Air Freight</SelectItem>
                <SelectItem value="sea">Sea Freight</SelectItem>
                <SelectItem value="land">Land Freight</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 flex-1 sm:flex-none sm:w-40 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground shrink-0">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Count + Export */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-muted-foreground">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="gap-1.5 h-9 ml-auto sm:ml-0"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* ── Table ── */}
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Collection #</TableHead>
                <TableHead>Shipper</TableHead>
                <TableHead>Consignee</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No collections found.{" "}
                    <Link href="/collections/new" className="text-[#E67A32] hover:underline">
                      Create one
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <Link
                        href={`/collections/${item.id}`}
                        className="font-mono text-xs font-semibold text-[#071A3A] dark:text-[#E67A32] hover:underline"
                      >
                        {item.collection_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-28 truncate">
                      {item.shipper_name}
                    </TableCell>
                    <TableCell className="text-sm max-w-28 truncate">
                      {item.consignee_name}
                    </TableCell>
                    <TableCell className="text-sm">{item.destination}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs">
                        {CARGO_ICONS[item.cargo_type]}
                        {CARGO_TYPE_LABELS[item.cargo_type].split(" ")[0]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatWeight(item.weight_kg)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:opacity-0 sm:group-hover:opacity-100">
                            •••
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild className="gap-2">
                            <Link href={`/collections/${item.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="gap-2">
                            <Link href={`/collections/${item.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handlePrintPDF(item)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print / Save PDF
                          </DropdownMenuItem>
                          {item.pdf_url && (
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleDownloadPDF(item)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleSharePDF(item)}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Share PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleWhatsApp(item)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-red-600 focus:text-red-600"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
