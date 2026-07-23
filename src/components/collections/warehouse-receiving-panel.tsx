"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Warehouse, CheckCircle2, XCircle, Download, MapPin, Pencil, RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import type { GoodsCollectionNote, UserRole } from "@/types";

interface WarehouseReceivingPanelProps {
  collection: GoodsCollectionNote;
  userRole: UserRole;
}

const WAREHOUSE_ROLES: UserRole[] = ["admin", "operations", "warehouse", "warehouse_supervisor"];
const APPROVER_ROLES: UserRole[] = ["admin", "operations"];

async function postAction(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function WarehouseReceivingPanel({ collection, userRole }: WarehouseReceivingPanelProps) {
  const router = useRouter();
  const canManageWarehouse = WAREHOUSE_ROLES.includes(userRole);
  const canApprove = APPROVER_ROLES.includes(userRole);

  const [storageLocation, setStorageLocation] = useState(collection.storage_location || "");
  const [palletized, setPalletized] = useState(collection.palletized);
  const [notes, setNotes] = useState(collection.warehouse_report_notes || "");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const [editingReceiving, setEditingReceiving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [recalling, setRecalling] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const base = `/api/collections/${collection.id}/warehouse`;

  async function handleReceive() {
    if (!storageLocation.trim()) {
      toast.error("Storage location is required");
      return;
    }
    setReceiving(true);
    try {
      await postAction(`${base}/receive`, { storage_location: storageLocation, palletized });
      toast.success("Goods marked as received");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as received");
    } finally {
      setReceiving(false);
    }
  }

  async function handleUndoReceiving() {
    setUndoing(true);
    try {
      await postAction(`${base}/undo-receiving`);
      toast.success("Receiving undone — status reset to Collected");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to undo receiving");
    } finally {
      setUndoing(false);
    }
  }

  async function handleRecallReport() {
    setRecalling(true);
    try {
      await postAction(`${base}/recall-report`);
      toast.success("Report recalled — you can now edit and resubmit");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to recall report");
    } finally {
      setRecalling(false);
    }
  }

  async function handleSaveReceiving() {
    if (!storageLocation.trim()) {
      toast.error("Storage location is required");
      return;
    }
    setSaving(true);
    try {
      await postAction(`${base}/update-receiving`, { storage_location: storageLocation, palletized });
      toast.success("Receiving details updated");
      setEditingReceiving(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitReport() {
    setSubmitting(true);
    try {
      await postAction(`${base}/submit-report`, { notes });
      toast.success("Report submitted for approval");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await postAction(`${base}/approve-report`);
      toast.success("Report approved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve report");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    setRejecting(true);
    try {
      await postAction(`${base}/reject-report`, { reason: rejectReason });
      toast.success("Report rejected and sent back for correction");
      setRejectOpen(false);
      setRejectReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject report");
    } finally {
      setRejecting(false);
    }
  }

  function handleDownloadReport() {
    window.open(`/api/collections/${collection.id}/warehouse-report/pdf`, "_blank");
  }

  const reportStatus = collection.warehouse_report_status;

  return (
    <>
      <Card className="border-none shadow-sm mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Warehouse Receiving
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Receiving ── */}
          {collection.warehouse_received_at ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Received
                </Badge>
                <span className="text-muted-foreground">{formatDateTime(collection.warehouse_received_at)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {collection.storage_location}
                </span>
                <span className="text-muted-foreground">·</span>
                <span>{collection.palletized ? "Palletized" : "Not palletized"}</span>
                {canManageWarehouse && reportStatus !== "approved" && !editingReceiving && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingReceiving(true)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    {reportStatus === "not_submitted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-red-600"
                        onClick={handleUndoReceiving}
                        disabled={undoing}
                      >
                        {undoing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        Undo
                      </Button>
                    )}
                  </>
                )}
              </div>

              {editingReceiving && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide">Storage Location</Label>
                      <Input
                        value={storageLocation}
                        onChange={(e) => setStorageLocation(e.target.value)}
                        placeholder="e.g. Zone B - Rack 4"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox
                        id="palletized-edit"
                        checked={palletized}
                        onCheckedChange={(v) => setPalletized(Boolean(v))}
                      />
                      <Label htmlFor="palletized-edit" className="text-sm font-normal cursor-pointer">
                        Goods palletized
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveReceiving} disabled={saving} size="sm" className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStorageLocation(collection.storage_location || "");
                        setPalletized(collection.palletized);
                        setEditingReceiving(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : canManageWarehouse ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide">Storage Location</Label>
                  <Input
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="e.g. Zone B - Rack 4"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="palletized"
                    checked={palletized}
                    onCheckedChange={(v) => setPalletized(Boolean(v))}
                  />
                  <Label htmlFor="palletized" className="text-sm font-normal cursor-pointer">
                    Goods palletized
                  </Label>
                </div>
              </div>
              <Button onClick={handleReceive} disabled={receiving} size="sm" className="gap-1.5">
                {receiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Mark Received
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Awaiting warehouse receiving.</p>
          )}

          {/* ── Report ── */}
          {collection.warehouse_received_at && (
            <>
              <Separator />
              <div className="space-y-3">
                {reportStatus === "rejected" && collection.warehouse_report_rejection_reason && (
                  <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
                    <p className="font-medium text-red-700 dark:text-red-300 flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5" />
                      Rejected — needs correction
                    </p>
                    <p className="text-red-600 dark:text-red-400 mt-1">{collection.warehouse_report_rejection_reason}</p>
                  </div>
                )}

                {reportStatus === "approved" && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Report Approved
                    </Badge>
                    {collection.warehouse_report_approved_at && (
                      <span className="text-muted-foreground">{formatDateTime(collection.warehouse_report_approved_at)}</span>
                    )}
                  </div>
                )}

                {reportStatus === "submitted" && (
                  <div className="space-y-2">
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 gap-1">
                      Pending Approval
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {canApprove && (
                        <>
                          <Button onClick={handleApprove} disabled={approving} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                            {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approve
                          </Button>
                          <Button onClick={() => setRejectOpen(true)} disabled={rejecting} size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                      {canManageWarehouse && (
                        <Button onClick={handleRecallReport} disabled={recalling} size="sm" variant="outline" className="gap-1.5">
                          {recalling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                          Recall Report
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {(reportStatus === "not_submitted" || reportStatus === "rejected") && canManageWarehouse && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide">Report Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes for the approver..."
                      rows={2}
                    />
                    <Button onClick={handleSubmitReport} disabled={submitting} size="sm" className="gap-1.5">
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {reportStatus === "rejected" ? "Resubmit Report" : "Submit Report"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Download ── */}
          {collection.warehouse_received_at && (
            <>
              <Separator />
              <Button onClick={handleDownloadReport} size="sm" variant="outline" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download Report PDF
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Reject Dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Warehouse Report</DialogTitle>
            <DialogDescription>
              This will send the report back to the warehouse for correction. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain what needs to be corrected..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={rejecting} className="gap-1.5 bg-red-600 hover:bg-red-700">
              {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
