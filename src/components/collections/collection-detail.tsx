"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Download, Mail, MessageCircle, Pencil, Printer,
  Trash2, ExternalLink, Copy, Package, MapPin,
  Layers, Info, ChevronDown, Share2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { WarehouseReceivingPanel } from "./warehouse-receiving-panel";
import { DeliveryNoteSection } from "./delivery-note-section";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatWeight, formatVolume,
  generateWhatsAppMessage, openWhatsApp, copyToClipboard, buildReceiptFilename, buildPdfPath,
} from "@/lib/utils";
import type { GoodsCollectionNote, CollectionStatus, UserRole, DeliveryNote } from "@/types";
import { STATUS_LABELS, CARGO_TYPE_LABELS } from "@/types";
import { useRouter } from "next/navigation";

interface CollectionDetailProps {
  collection: GoodsCollectionNote;
  userRole: UserRole;
  deliveryNote: DeliveryNote | null;
}

const STATUS_ORDER: CollectionStatus[] = [
  "collected", "in_warehouse", "in_transit",
  "customs_clearance", "out_for_delivery", "delivered",
];

export function CollectionDetail({ collection, userRole, deliveryNote }: CollectionDetailProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState(collection.email || "");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingPDF, setSavingPDF] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const trackingUrl = `${appUrl}/track/${collection.collection_number}`;

  async function handleStatusChange(status: CollectionStatus) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Collection deleted");
      router.push("/collections");
    } catch {
      toast.error("Failed to delete collection");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleSendEmail() {
    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailAddress,
          collectionId: collection.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      toast.success("Email sent successfully");
      setEmailOpen(false);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  }

  function handleWhatsApp() {
    if (!collection.pdf_url) {
      toast.error("PDF not yet generated");
      return;
    }
    const msg = generateWhatsAppMessage({
      collectionNumber: collection.collection_number,
      pdfLink: collection.pdf_url,
      trackingLink: trackingUrl,
    });
    openWhatsApp(msg);
  }

  function handlePrint() {
    // Open PDF inline in a new browser tab — user can view and print from there
    window.open(buildPdfPath(collection.id, collection.consignee_name), "_blank");
  }

  async function handleSavePDF() {
    setSavingPDF(true);
    try {
      // ?download=1 tells the API to set Content-Disposition: attachment
      // so the browser triggers a file download directly
      const link = document.createElement("a");
      link.href = buildPdfPath(collection.id, collection.consignee_name, true);
      link.download = buildReceiptFilename(collection.consignee_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF download started");
    } catch {
      toast.error("Failed to save PDF");
    } finally {
      setSavingPDF(false);
    }
  }

  async function handleSharePDF() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const pdfUrl = collection.pdf_url || `${appUrl}${buildPdfPath(collection.id, collection.consignee_name)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `GCN ${collection.collection_number}`,
          text: `Goods Collection Note – ${collection.collection_number}`,
          url: pdfUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(pdfUrl);
      toast.success("PDF link copied to clipboard");
    }
  }

  return (
    <>
      {/* ── Action Bar ── */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Info row */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={collection.status} />
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-sm text-muted-foreground font-mono">
            {collection.collection_number}
          </span>
          <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {formatDateTime(collection.created_at)}
          </span>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <Select
            value={collection.status}
            onValueChange={(v) => handleStatusChange(v as CollectionStatus)}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-9 text-sm gap-1.5 flex-1 sm:flex-none sm:min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Edit */}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/collections/${collection.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>

          {/* PDF buttons — visible on sm+ screens */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hidden sm:flex border-[#071A3A] text-[#071A3A] hover:bg-[#071A3A] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#071A3A] transition-colors"
            onClick={handleSavePDF}
            disabled={savingPDF}
          >
            {savingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {savingPDF ? "Saving..." : "Save PDF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hidden sm:flex border-[#E67A32] text-[#E67A32] hover:bg-[#E67A32] hover:text-white transition-colors"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Print PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hidden sm:flex border-[#071A3A] text-[#071A3A] hover:bg-[#071A3A] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#071A3A] transition-colors"
            onClick={handleSharePDF}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share PDF
          </Button>

          {/* More / overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 ml-auto sm:ml-0">
                More
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {/* PDF actions shown here on mobile only */}
              <DropdownMenuItem onClick={handleSavePDF} className="gap-2 sm:hidden">
                <Download className="h-4 w-4" />
                Save PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint} className="gap-2 sm:hidden">
                <Printer className="h-4 w-4" />
                Print PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSharePDF} className="gap-2 sm:hidden">
                <Share2 className="h-4 w-4" />
                Share PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem onClick={() => setEmailOpen(true)} className="gap-2">
                <Mail className="h-4 w-4" />
                Send via Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleWhatsApp} className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Send via WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2">
                <Link href={trackingUrl} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  View Tracking Page
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => copyToClipboard(trackingUrl).then(() => toast.success("Link copied"))}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Tracking Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipper */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
              Shipper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-[#071A3A] dark:text-white mb-1">
              {collection.shipper_name}
            </p>
          </CardContent>
        </Card>

        {/* Consignee */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
              Consignee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-bold text-[#071A3A] dark:text-white">
              {collection.consignee_name}
            </p>
            {collection.contact_person && (
              <p className="text-sm text-muted-foreground">
                Contact: {collection.contact_person}
              </p>
            )}
            {collection.phone && (
              <p className="text-sm text-muted-foreground">{collection.phone}</p>
            )}
            {collection.email && (
              <p className="text-sm text-muted-foreground">{collection.email}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Cargo Details ── */}
      <Card className="border-none shadow-sm mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">
            Cargo Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            <InfoItem
              icon={<MapPin className="h-4 w-4" />}
              label="Destination"
              value={collection.destination}
            />
            <InfoItem
              icon={<Package className="h-4 w-4" />}
              label="Commodity"
              value={collection.commodity}
            />
            <InfoItem
              icon={<Layers className="h-4 w-4" />}
              label="Mode of Transport"
              value={CARGO_TYPE_LABELS[collection.cargo_type]}
            />
            {collection.shipping_mark && (
              <InfoItem
                icon={<Info className="h-4 w-4" />}
                label="Shipping Mark"
                value={collection.shipping_mark}
              />
            )}
            {collection.doc_ref_number && (
              <InfoItem
                icon={<Info className="h-4 w-4" />}
                label="Doc. Reference No."
                value={collection.doc_ref_number}
              />
            )}
            {collection.billing_type && (
              <InfoItem
                icon={<Info className="h-4 w-4" />}
                label="Billing of"
                value={collection.billing_type === "customer" ? "Customer" : "Supplier"}
              />
            )}
          </div>

          {collection.special_instructions && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Special Instructions
                </p>
                <p className="text-sm">{collection.special_instructions}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Package Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <StatCard label="Packages" value={collection.num_packages || "—"} />
        <StatCard label="Package Type" value={collection.package_type || "—"} />
        <StatCard label="Volume" value={formatVolume(collection.volume_cbm)} />
        <StatCard label="Weight" value={formatWeight(collection.weight_kg)} />
      </div>

      {/* ── Warehouse Receiving ── */}
      <WarehouseReceivingPanel collection={collection} userRole={userRole} />

      {/* ── Delivery Note ── */}
      <DeliveryNoteSection collectionId={collection.id} deliveryNote={deliveryNote} />

      {/* ── QR Code + PDF ── */}
      {(collection.qr_url || collection.pdf_url) && (
        <Card className="border-none shadow-sm mt-4">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {collection.qr_url && (
              <img
                src={collection.qr_url}
                alt="QR Code"
                className="w-24 h-24 rounded-lg border"
              />
            )}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Tracking QR Code</p>
              <p className="text-xs text-muted-foreground">
                Scan to view live status at{" "}
                <Link href={trackingUrl} target="_blank" className="text-[#E67A32] hover:underline">
                  {trackingUrl}
                </Link>
              </p>
              {collection.pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={handleSavePDF}
                  disabled={savingPDF}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{collection.collection_number}</strong>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email Dialog ── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send via Email</DialogTitle>
            <DialogDescription>
              Send the Goods Collection Note PDF to an email address.
            </DialogDescription>
          </DialogHeader>
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="recipient@email.com"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#071A3A]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={sending || !emailAddress}>
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-[#071A3A] dark:text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
