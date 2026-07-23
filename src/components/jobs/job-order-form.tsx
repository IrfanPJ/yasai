"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X, Search, Truck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { GoodsCollectionNote } from "@/types";

interface TruckDraft {
  key: string;
  truck_number: string;
  trailer_number: string;
  driver_name: string;
  driver_phone: string;
}

function emptyTruck(): TruckDraft {
  return { key: crypto.randomUUID(), truck_number: "", trailer_number: "", driver_name: "", driver_phone: "" };
}

export function JobOrderForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Shipment details
  const [destination, setDestination] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [consigneeName, setConsigneeName] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [notes, setNotes] = useState("");

  // Trucks
  const [trucks, setTrucks] = useState<TruckDraft[]>([emptyTruck()]);

  // GCN linking
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

  function updateTruck(key: string, field: keyof TruckDraft, value: string) {
    setTrucks((prev) => prev.map((t) => t.key === key ? { ...t, [field]: value } : t));
  }

  function removeTruck(key: string) {
    setTrucks((prev) => prev.filter((t) => t.key !== key));
  }

  async function handleSubmit() {
    if (!destination.trim()) { toast.error("Destination is required"); return; }
    setSaving(true);
    try {
      // Create job order
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          customer_name: customerName || null,
          consignee_name: consigneeName || null,
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

      // Link GCNs
      for (const gcn of linkedGcns) {
        await fetch(`/api/jobs/${job.id}/gcns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gcn_id: gcn.id }),
        });
      }

      // Add trucks
      const validTrucks = trucks.filter((t) => t.truck_number || t.driver_name);
      for (const truck of validTrucks) {
        await fetch(`/api/jobs/${job.id}/trucks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            truck_number: truck.truck_number || null,
            trailer_number: truck.trailer_number || null,
            driver_name: truck.driver_name || null,
            driver_phone: truck.driver_phone || null,
          }),
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
      {/* Shipment Details */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Destination <span className="text-red-500">*</span></Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Riyadh, KSA" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Shipper / customer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Consignee Name</Label>
              <Input value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} placeholder="Consignee in KSA" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Transporter Company</Label>
              <Input value={transporterName} onChange={(e) => setTransporterName(e.target.value)} placeholder="Transporter name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Departure Date</Label>
              <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions..." />
          </div>
        </CardContent>
      </Card>

      {/* Trucks */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Trucks
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTrucks((p) => [...p, emptyTruck()])}>
            <Plus className="h-3.5 w-3.5" /> Add Truck
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {trucks.map((truck, i) => (
            <div key={truck.key}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Truck {i + 1}</span>
                  {trucks.length > 1 && (
                    <button onClick={() => removeTruck(truck.key)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Truck Number</Label>
                    <Input value={truck.truck_number} onChange={(e) => updateTruck(truck.key, "truck_number", e.target.value)} placeholder="e.g. ABC-1234" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Trailer Number</Label>
                    <Input value={truck.trailer_number} onChange={(e) => updateTruck(truck.key, "trailer_number", e.target.value)} placeholder="Trailer plate" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Driver Name</Label>
                    <Input value={truck.driver_name} onChange={(e) => updateTruck(truck.key, "driver_name", e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Driver Phone</Label>
                    <Input value={truck.driver_phone} onChange={(e) => updateTruck(truck.key, "driver_phone", e.target.value)} placeholder="+971..." />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Driver passport, ID, and document uploads can be added after the job order is created.</p>
        </CardContent>
      </Card>

      {/* Link GCNs */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Link GCNs (Warehouse-Approved)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {linkedGcns.length > 0 && (
            <div className="space-y-2">
              {linkedGcns.map((gcn) => (
                <div key={gcn.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-[#071A3A] dark:text-white">{gcn.collection_number}</span>
                    <span className="text-muted-foreground text-xs ml-2">{gcn.consignee_name}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {gcn.weight_kg ? `${gcn.weight_kg} kg` : ""}{gcn.volume_cbm ? ` · ${gcn.volume_cbm} m³` : ""}
                    </div>
                  </div>
                  <button onClick={() => setLinkedGcns((prev) => prev.filter((g) => g.id !== gcn.id))} className="text-muted-foreground hover:text-red-500 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
                      {gcn.commodity} · {gcn.weight_kg ? `${gcn.weight_kg} kg` : ""}{gcn.volume_cbm ? ` · ${gcn.volume_cbm} m³` : ""}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-[#E67A32]" />
                </button>
              ))}
            </div>
          )}

          {linkedGcns.length === 0 && (
            <p className="text-xs text-muted-foreground">Search and add GCNs with warehouse-approved status.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={saving} className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Job Order
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
