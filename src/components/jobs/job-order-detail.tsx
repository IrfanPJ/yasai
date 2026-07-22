"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, Truck, Package, MapPin,
  Download, Clock, AlertCircle, ChevronDown, ChevronUp,
  Send, ClipboardCheck, Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/lib/utils";
import type { JobOrder, GoodsCollectionNote, JobTransitUpdate, UserRole } from "@/types";
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/types";

interface JobOrderDetailProps {
  job: JobOrder;
  gcns: GoodsCollectionNote[];
  transitUpdates: JobTransitUpdate[];
  userRole: UserRole;
}

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

export function JobOrderDetail({ job, gcns, transitUpdates, userRole }: JobOrderDetailProps) {
  const router = useRouter();
  const isAdmin = userRole === "admin";
  const isOps = ["admin", "operations"].includes(userRole);
  const isWarehouse = ["admin", "operations", "warehouse", "warehouse_supervisor"].includes(userRole);

  // UI state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [transitText, setTransitText] = useState("");
  const [deliveryScheduledAt, setDeliveryScheduledAt] = useState(job.delivery_scheduled_at?.slice(0, 16) || "");
  const [deliveryDriver, setDeliveryDriver] = useState(job.delivery_driver || "");
  const [driverSig, setDriverSig] = useState(false);
  const [gcnsOpen, setGcnsOpen] = useState(false);

  // Loading states
  const [loading, setLoading] = useState<string | null>(null);

  const base = `/api/jobs/${job.id}`;

  const totalWeight = job.total_weight_kg ?? gcns.reduce((s, g) => s + (g.weight_kg ?? 0), 0);
  const totalCbm = job.total_cbm ?? gcns.reduce((s, g) => s + (g.volume_cbm ?? 0), 0);
  const weightPct = Math.min(100, Math.round((totalWeight / 24000) * 100));
  const cbmPct = Math.min(100, Math.round((totalCbm / 45) * 100));

  async function act(key: string, fn: () => Promise<unknown>) {
    setLoading(key);
    try {
      await fn();
      toast.success("Updated successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071A3A] dark:text-white">{job.job_number}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <MapPin className="h-3.5 w-3.5" /> {job.destination}
            {job.departure_date && (
              <> · <Clock className="h-3.5 w-3.5" /> {new Date(job.departure_date).toLocaleDateString("en-GB")}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${JOB_STATUS_COLORS[job.status]} font-semibold`}>
            {JOB_STATUS_LABELS[job.status]}
          </Badge>
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => window.open(`${base}/packing-list/pdf`, "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
            Packing List PDF
          </Button>
        </div>
      </div>

      {/* Capacity + Truck Info */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Weight: {totalWeight.toFixed(1)} kg / 24,000 kg</span>
                  <span className="font-semibold">{weightPct}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${weightPct >= 90 ? "bg-orange-500" : weightPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${weightPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>CBM: {totalCbm.toFixed(3)} m³ / 45 m³</span>
                  <span className="font-semibold">{cbmPct}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${cbmPct >= 90 ? "bg-orange-500" : cbmPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${cbmPct}%` }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {[
                ["Truck", job.truck_number],
                ["Driver", job.driver_name],
                ["Driver Phone", job.driver_phone],
                ["Transporter", job.transporter_name],
              ].map(([l, v]) => v ? (
                <div key={l}>
                  <span className="text-xs text-muted-foreground block">{l}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked GCNs */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setGcnsOpen((o) => !o)}>
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Linked GCNs ({gcns.length})</span>
            {gcnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {gcnsOpen && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {gcns.map((gcn) => (
                <Link key={gcn.id} href={`/collections/${gcn.id}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-semibold text-sm text-[#071A3A] dark:text-white">{gcn.collection_number}</span>
                    <span className="text-muted-foreground text-xs ml-2">{gcn.consignee_name}</span>
                    <div className="text-xs text-muted-foreground">{gcn.commodity}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {gcn.weight_kg ? `${gcn.weight_kg} kg` : ""} {gcn.volume_cbm ? `· ${gcn.volume_cbm} m³` : ""}
                  </div>
                </Link>
              ))}
              {gcns.length === 0 && <p className="text-sm text-muted-foreground">No GCNs linked yet.</p>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── PANEL 1: GM Approval ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> GM Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.gm_approval_status === "approved" && (
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Approved by GM</Badge>
              {job.gm_approved_at && <span className="text-muted-foreground">{formatDateTime(job.gm_approved_at)}</span>}
            </div>
          )}
          {job.gm_approval_status === "rejected" && job.gm_rejection_reason && (
            <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
              <p className="font-medium text-red-700 dark:text-red-300 flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" />Rejected</p>
              <p className="text-red-600 dark:text-red-400 mt-1">{job.gm_rejection_reason}</p>
            </div>
          )}
          {job.gm_approval_status === "pending" && job.status === "pending_approval" && (
            <>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending GM Approval</Badge>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={loading === "approve"} onClick={() => act("approve", () => postAction(`${base}/approve`))}>
                    {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setRejectOpen(true)}>
                    <XCircle className="h-3.5 w-3.5" />Reject
                  </Button>
                </div>
              )}
            </>
          )}
          {(job.status === "draft" || job.gm_approval_status === "rejected") && isOps && (
            <Button size="sm" className="gap-1.5" disabled={loading === "submit"} onClick={() => act("submit", () => postAction(`${base}/submit-approval`))}>
              {loading === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {job.gm_approval_status === "rejected" ? "Resubmit for Approval" : "Submit for GM Approval"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── PANEL 2: Origin Dispatch ── */}
      {job.gm_approval_status === "approved" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
              <Truck className="h-4 w-4" /> Origin Dispatch (Stage 4)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.dispatched_at ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 gap-1"><CheckCircle2 className="h-3 w-3" />Dispatched</Badge>
                <span className="text-muted-foreground">{formatDateTime(job.dispatched_at)}</span>
              </div>
            ) : job.loaded_at ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Loading in Progress</Badge>
                  <span className="text-muted-foreground">{formatDateTime(job.loaded_at)}</span>
                  {job.driver_signature_received && <span className="text-xs text-green-600">Driver signed ✓</span>}
                </div>
                {isWarehouse && (
                  <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" disabled={loading === "dispatch"} onClick={() => act("dispatch", () => postAction(`${base}/dispatch`))}>
                    {loading === "dispatch" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}Confirm Dispatch
                  </Button>
                )}
              </>
            ) : isWarehouse ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="driversig" checked={driverSig} onCheckedChange={(v) => setDriverSig(Boolean(v))} />
                  <Label htmlFor="driversig" className="text-sm font-normal cursor-pointer">Driver signed packing list</Label>
                </div>
                <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" disabled={loading === "load"} onClick={() => act("load", () => postAction(`${base}/load`, { driver_signature_received: driverSig }))}>
                  {loading === "load" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Confirm Loading
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting origin warehouse loading.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── PANEL 3: Transit Monitoring ── */}
      {job.dispatched_at && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
              <Navigation className="h-4 w-4" /> Transit Monitoring (Stage 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transit updates log */}
            {transitUpdates.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transitUpdates.map((u) => (
                  <div key={u.id} className="text-sm bg-gray-50 dark:bg-gray-900/30 rounded-md px-3 py-2">
                    <p>{u.update_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(u.created_at)}</p>
                  </div>
                ))}
              </div>
            )}

            {job.customs_cleared_at ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 gap-1"><CheckCircle2 className="h-3 w-3" />Customs Cleared</Badge>
                <span className="text-muted-foreground">{formatDateTime(job.customs_cleared_at)}</span>
              </div>
            ) : isOps ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={transitText}
                    onChange={(e) => setTransitText(e.target.value)}
                    placeholder="Post a transit update (location, delay, customs status...)"
                    rows={2}
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!transitText.trim() || loading === "transit"} onClick={() => act("transit", async () => {
                    await postAction(`${base}/transit-update`, { update_text: transitText });
                    setTransitText("");
                  })}>
                    {loading === "transit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Add Update
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700" disabled={loading === "customs"} onClick={() => act("customs", () => postAction(`${base}/customs-cleared`))}>
                    {loading === "customs" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Mark Customs Cleared
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting customs clearance update.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── PANEL 4: Destination Delivery ── */}
      {job.customs_cleared_at && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Destination Delivery (Stages 6 &amp; 8)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Schedule delivery */}
            {job.delivery_scheduled_at ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 gap-1"><Clock className="h-3 w-3" />Delivery Scheduled</Badge>
                <span className="text-muted-foreground">{formatDateTime(job.delivery_scheduled_at)}</span>
                {job.delivery_driver && <span>· Driver: {job.delivery_driver}</span>}
              </div>
            ) : isWarehouse ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Delivery Date &amp; Time</Label>
                    <Input type="datetime-local" value={deliveryScheduledAt} onChange={(e) => setDeliveryScheduledAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Local Driver</Label>
                    <Input value={deliveryDriver} onChange={(e) => setDeliveryDriver(e.target.value)} placeholder="Driver name" />
                  </div>
                </div>
                <Button size="sm" className="gap-1.5 bg-cyan-600 hover:bg-cyan-700" disabled={!deliveryScheduledAt || loading === "schedule"} onClick={() => act("schedule", () => postAction(`${base}/schedule-delivery`, { delivery_scheduled_at: deliveryScheduledAt || null, delivery_driver: deliveryDriver || null }))}>
                  {loading === "schedule" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}Schedule Delivery
                </Button>
              </div>
            ) : null}

            {job.delivery_scheduled_at && (
              <>
                <Separator />
                {/* Destination received */}
                {job.destination_received_at ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Goods Received at Destination</Badge>
                    <span className="text-muted-foreground">{formatDateTime(job.destination_received_at)}</span>
                  </div>
                ) : isWarehouse ? (
                  <Button size="sm" variant="outline" disabled={loading === "dest-received"} onClick={() => act("dest-received", () => postAction(`${base}/destination-received`))}>
                    {loading === "dest-received" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Confirm Goods Received at Destination
                  </Button>
                ) : null}

                {/* POD collected */}
                {job.destination_received_at && (
                  job.pod_collected_at ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />POD Collected</Badge>
                      <span className="text-muted-foreground">{formatDateTime(job.pod_collected_at)}</span>
                    </div>
                  ) : isWarehouse ? (
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={loading === "pod"} onClick={() => act("pod", () => postAction(`${base}/pod-collected`))}>
                      {loading === "pod" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}Collect Signed POD
                    </Button>
                  ) : null
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {job.notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm">{job.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job Order</DialogTitle>
            <DialogDescription>This will send it back for revision. Please provide a reason.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain what needs to be corrected..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading === "reject"}>Cancel</Button>
            <Button
              className="gap-1.5 bg-red-600 hover:bg-red-700"
              disabled={loading === "reject" || !rejectReason.trim()}
              onClick={() => act("reject", async () => {
                await postAction(`${base}/reject`, { reason: rejectReason });
                setRejectOpen(false);
                setRejectReason("");
              })}
            >
              {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
