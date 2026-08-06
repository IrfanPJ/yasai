"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  FileDown, Pencil, Trash2, Loader2,
  Ship, MapPin, Calendar, Truck, Package, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { WaybillForm } from "./waybill-form";
import type { Waybill } from "@/types";

const TRANSPORT_COLORS = {
  road: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  air:  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sea:  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { waybill: Waybill }

export function WaybillDetail({ waybill }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPdf] = useState(false);
  const [printing] = useState(false);

  function handlePrint() {
    window.open(`/api/waybills/${waybill.id}/pdf`, "_blank");
  }

  function handleDownloadPdf() {
    const a = document.createElement("a");
    a.href = `/api/waybills/${waybill.id}/pdf?download=1`;
    a.download = `Waybill-${waybill.waybill_number}.pdf`;
    a.click();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/waybills/${waybill.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Waybill deleted");
      router.push("/waybills");
      router.refresh();
    } catch {
      toast.error("Failed to delete waybill");
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-[#071A3A] dark:text-white">Edit Waybill</h2>
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
        <WaybillForm initial={waybill} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]"
        >
          {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Download PDF
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint} disabled={printing} className="gap-2">
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDeleteOpen(true)}
          className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Header Card */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Waybill Number</p>
              <p className="text-2xl font-bold font-mono text-[#E67A32]">{waybill.waybill_number}</p>
            </div>
            <Badge className={`text-sm px-3 py-1 capitalize ${TRANSPORT_COLORS[waybill.mode_of_transport]}`}>
              {waybill.mode_of_transport === "road" ? "🚛" : waybill.mode_of_transport === "air" ? "✈️" : "🚢"} {waybill.mode_of_transport}
            </Badge>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#E67A32] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Port of Loading</p>
                <p className="text-sm font-semibold">{waybill.port_of_loading}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Ship className="h-4 w-4 text-[#E67A32] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Port of Discharge</p>
                <p className="text-sm font-semibold">{waybill.port_of_discharge}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-[#E67A32] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Shipment Date</p>
                <p className="text-sm font-semibold">{fmtDate(waybill.shipment_date)}</p>
              </div>
            </div>
            {waybill.job_number && (
              <div className="flex items-start gap-2">
                <Truck className="h-4 w-4 text-[#E67A32] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">JOB Number</p>
                  <p className="text-sm font-semibold font-mono">{waybill.job_number}</p>
                </div>
              </div>
            )}
          </div>

          {(waybill.remarks || waybill.final_destination) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                {waybill.remarks && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                    <p className="text-sm">{waybill.remarks}</p>
                  </div>
                )}
                {waybill.final_destination && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Final Destination</p>
                    <p className="text-sm">{waybill.final_destination}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipper & Consignee */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Shipper</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{waybill.shipper_name}</p>
            {waybill.shipper_address && (
              <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{waybill.shipper_address}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Consignee</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{waybill.consignee_name}</p>
            {waybill.consignee_address && (
              <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{waybill.consignee_address}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cargo Table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white flex items-center gap-2">
            <Package className="h-4 w-4 text-[#E67A32]" />
            Cargo Items ({waybill.cargo_items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {waybill.cargo_items?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
                    <TableHead className="text-xs">Truck #</TableHead>
                    <TableHead className="text-xs">Seal No</TableHead>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Invoice Value</TableHead>
                    <TableHead className="text-xs">Packages</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Weight</TableHead>
                    <TableHead className="text-xs">Measurement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waybill.cargo_items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm font-mono">{item.truck_number || "—"}</TableCell>
                      <TableCell className="text-sm">{item.seal_no || "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{item.invoice_number || "—"}</TableCell>
                      <TableCell className="text-sm">{item.invoice_currency} {item.invoice_value || "—"}</TableCell>
                      <TableCell className="text-sm">{item.num_packages || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{item.description || "—"}</TableCell>
                      <TableCell className="text-sm">{item.weight || "—"}</TableCell>
                      <TableCell className="text-sm">{item.measurement || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No cargo items</div>
          )}
        </CardContent>
      </Card>

      {/* Footer Details */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Document Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prepared By</p>
            <p className="text-sm font-medium">{waybill.prepared_by || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">No. of Originals</p>
            <p className="text-sm font-medium">{waybill.num_originals ?? 1} SET</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Place of Issue</p>
            <p className="text-sm font-medium">{waybill.place_of_issue || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Issue Date</p>
            <p className="text-sm font-medium">{fmtDate(waybill.issue_date)}</p>
          </div>
          {waybill.delivery_contact && (
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Delivery Contact</p>
              <p className="text-sm font-medium">{waybill.delivery_contact}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Waybill</DialogTitle>
            <DialogDescription>
              Delete <strong>{waybill.waybill_number}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
