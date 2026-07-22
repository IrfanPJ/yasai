"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GoodsCollectionNote } from "@/types";

export function JobOrderForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [destination, setDestination] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [notes, setNotes] = useState("");

  const [gcnSearch, setGcnSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GoodsCollectionNote[]>([]);
  const [linkedGcns, setLinkedGcns] = useState<GoodsCollectionNote[]>([]);
  const [searching, setSearching] = useState(false);

  const totalWeight = linkedGcns.reduce((s, g) => s + (g.weight_kg ?? 0), 0);
  const totalCbm = linkedGcns.reduce((s, g) => s + (g.volume_cbm ?? 0), 0);
  const weightPct = Math.min(100, Math.round((totalWeight / 24000) * 100));
  const cbmPct = Math.min(100, Math.round((totalCbm / 45) * 100));

  useEffect(() => {
    if (!gcnSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/collections?search=${encodeURIComponent(gcnSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const available = (data.data || data || []).filter(
            (g: GoodsCollectionNote) =>
              g.warehouse_report_status === "approved" &&
              !linkedGcns.find((l) => l.id === g.id)
          );
          setSearchResults(available.slice(0, 8));
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [gcnSearch, linkedGcns]);

  function addGcn(gcn: GoodsCollectionNote) {
    setLinkedGcns((prev) => [...prev, gcn]);
    setGcnSearch("");
    setSearchResults([]);
  }

  function removeGcn(id: string) {
    setLinkedGcns((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleSubmit() {
    if (!destination.trim()) { toast.error("Destination is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          truck_number: truckNumber || null,
          driver_name: driverName || null,
          driver_phone: driverPhone || null,
          transporter_name: transporterName || null,
          departure_date: departureDate || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create job order");
      }
      const job = await res.json();

      // Link all GCNs
      for (const gcn of linkedGcns) {
        await fetch(`/api/jobs/${job.id}/gcns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gcn_id: gcn.id }),
        });
      }

      toast.success(`Job order ${job.job_number} created`);
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Basic Info */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Job Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Destination <span className="text-red-500">*</span></Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Riyadh, KSA" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Truck Number</Label>
              <Input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} placeholder="e.g. ABC-1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Departure Date</Label>
              <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Driver Name</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Driver Phone</Label>
              <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+966..." />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs uppercase tracking-wide">Transporter Company</Label>
              <Input value={transporterName} onChange={(e) => setTransporterName(e.target.value)} placeholder="Transporter name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions..." />
          </div>
        </CardContent>
      </Card>

      {/* Link GCNs */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Link GCNs (Warehouse-Approved)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capacity bar */}
          {linkedGcns.length > 0 && (
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Weight: {totalWeight.toFixed(1)} kg / 24,000 kg</span>
                  <span>{weightPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${weightPct >= 90 ? "bg-orange-500" : weightPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${weightPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>CBM: {totalCbm.toFixed(3)} m³ / 45 m³</span>
                  <span>{cbmPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${cbmPct >= 90 ? "bg-orange-500" : cbmPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${cbmPct}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Linked GCN list */}
          {linkedGcns.length > 0 && (
            <div className="space-y-2">
              {linkedGcns.map((gcn) => (
                <div key={gcn.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-[#071A3A] dark:text-white">{gcn.collection_number}</span>
                    <span className="text-muted-foreground text-xs ml-2">{gcn.consignee_name}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {gcn.weight_kg ? `${gcn.weight_kg} kg` : ""} {gcn.volume_cbm ? `· ${gcn.volume_cbm} m³` : ""}
                    </div>
                  </div>
                  <button onClick={() => removeGcn(gcn.id)} className="text-muted-foreground hover:text-red-500 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search GCN by number or consignee..."
              value={gcnSearch}
              onChange={(e) => setGcnSearch(e.target.value)}
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y overflow-hidden">
              {searchResults.map((gcn) => (
                <button
                  key={gcn.id}
                  onClick={() => addGcn(gcn)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-sm">{gcn.collection_number}</span>
                    <span className="text-muted-foreground text-xs ml-2">{gcn.consignee_name}</span>
                    <div className="text-xs text-muted-foreground">
                      {gcn.commodity} · {gcn.weight_kg ? `${gcn.weight_kg} kg` : ""} {gcn.volume_cbm ? `· ${gcn.volume_cbm} m³` : ""}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-[#E67A32]" />
                </button>
              ))}
            </div>
          )}

          {linkedGcns.length === 0 && (
            <p className="text-xs text-muted-foreground">Search and add GCNs with warehouse-approved status. Capacity bars will update automatically.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={saving} className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Job Order
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
