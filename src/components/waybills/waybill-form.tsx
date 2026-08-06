"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Waybill, WaybillCargoItem, WaybillTransportMode } from "@/types";

const EMPTY_ITEM = (): WaybillCargoItem => ({
  truck_number: "",
  seal_no: "",
  invoice_number: "",
  invoice_value: "",
  invoice_currency: "AED",
  num_packages: "",
  description: "",
  weight: "",
  measurement: "",
});

interface Props {
  initial?: Waybill;
}

export function WaybillForm({ initial }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [shipperName, setShipperName] = useState(initial?.shipper_name || "");
  const [shipperAddress, setShipperAddress] = useState(initial?.shipper_address || "");
  const [consigneeName, setConsigneeName] = useState(initial?.consignee_name || "");
  const [consigneeAddress, setConsigneeAddress] = useState(initial?.consignee_address || "");

  const [portOfLoading, setPortOfLoading] = useState(initial?.port_of_loading || "DUBAI, UAE");
  const [portOfDischarge, setPortOfDischarge] = useState(initial?.port_of_discharge || "");
  const [shipmentDate, setShipmentDate] = useState(initial?.shipment_date || "");
  const [mode, setMode] = useState<WaybillTransportMode>(initial?.mode_of_transport || "road");
  const [remarks, setRemarks] = useState(initial?.remarks || "");
  const [jobNumber, setJobNumber] = useState(initial?.job_number || "");
  const [finalDestination, setFinalDestination] = useState(initial?.final_destination || "");

  const [items, setItems] = useState<WaybillCargoItem[]>(
    initial?.cargo_items?.length ? initial.cargo_items : [EMPTY_ITEM()]
  );

  const [preparedBy, setPreparedBy] = useState(initial?.prepared_by || "");
  const [numOriginals, setNumOriginals] = useState(String(initial?.num_originals ?? 1));
  const [placeOfIssue, setPlaceOfIssue] = useState(initial?.place_of_issue || "Dubai");
  const [issueDate, setIssueDate] = useState(initial?.issue_date || "");
  const [deliveryContact, setDeliveryContact] = useState(initial?.delivery_contact || "");

  function updateItem(index: number, field: keyof WaybillCargoItem, value: string) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addItem() { setItems((prev) => [...prev, EMPTY_ITEM()]); }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)); }

  async function handleSubmit() {
    if (!shipperName.trim()) { toast.error("Shipper name is required"); return; }
    if (!consigneeName.trim()) { toast.error("Consignee name is required"); return; }
    if (!portOfDischarge.trim()) { toast.error("Port of discharge is required"); return; }
    if (!shipmentDate) { toast.error("Shipment date is required"); return; }

    setSaving(true);
    try {
      const payload = {
        shipper_name: shipperName.trim(),
        shipper_address: shipperAddress.trim() || null,
        consignee_name: consigneeName.trim(),
        consignee_address: consigneeAddress.trim() || null,
        port_of_loading: portOfLoading.trim(),
        port_of_discharge: portOfDischarge.trim(),
        shipment_date: shipmentDate,
        mode_of_transport: mode,
        remarks: remarks.trim() || null,
        job_number: jobNumber.trim() || null,
        final_destination: finalDestination.trim() || null,
        cargo_items: items.filter((i) => i.description || i.invoice_number || i.truck_number),
        prepared_by: preparedBy.trim() || null,
        num_originals: parseInt(numOriginals) || 1,
        place_of_issue: placeOfIssue.trim() || null,
        issue_date: issueDate || null,
        delivery_contact: deliveryContact.trim() || null,
      };

      const url = initial ? `/api/waybills/${initial.id}` : "/api/waybills";
      const method = initial ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save waybill");

      toast.success(initial ? "Waybill updated" : "Waybill created");
      router.push(`/waybills/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save waybill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Shipper & Consignee */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Shipper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={shipperName} onChange={(e) => setShipperName(e.target.value)} placeholder="Shipper company name" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={shipperAddress} onChange={(e) => setShipperAddress(e.target.value)} placeholder="Street, City, Country" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Consignee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} placeholder="Consignee company name" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} placeholder="Street, City, Country" rows={2} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routing */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Routing & Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Port of Loading</Label>
            <Input value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Port of Discharge <span className="text-red-500">*</span></Label>
            <Input value={portOfDischarge} onChange={(e) => setPortOfDischarge(e.target.value)} placeholder="e.g. JEDDAH, KSA" />
          </div>
          <div className="space-y-1.5">
            <Label>Shipment Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mode of Transport</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as WaybillTransportMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="road">Road</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="sea">Sea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>JOB Number</Label>
            <Input value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="e.g. KSA52281" />
          </div>
          <div className="space-y-1.5">
            <Label>Final Destination</Label>
            <Input value={finalDestination} onChange={(e) => setFinalDestination(e.target.value)} placeholder="For merchant's reference" />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. LTL" />
          </div>
        </CardContent>
      </Card>

      {/* Cargo Items */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Cargo Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addItem} className="gap-1 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 border rounded-lg space-y-3 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Truck Number</Label>
                  <Input value={item.truck_number} onChange={(e) => updateItem(idx, "truck_number", e.target.value)} className="h-7 text-xs" placeholder="e.g. 26100" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Seal No / Marks</Label>
                  <Input value={item.seal_no} onChange={(e) => updateItem(idx, "seal_no", e.target.value)} className="h-7 text-xs" placeholder="e.g. XXXXX" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Invoice Number</Label>
                  <Input value={item.invoice_number} onChange={(e) => updateItem(idx, "invoice_number", e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Invoice Value</Label>
                  <div className="flex gap-1">
                    <Select value={item.invoice_currency || "AED"} onValueChange={(v) => updateItem(idx, "invoice_currency", v)}>
                      <SelectTrigger className="h-7 text-xs w-16 flex-shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={item.invoice_value} onChange={(e) => updateItem(idx, "invoice_value", e.target.value)} className="h-7 text-xs" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">No. of Packages</Label>
                  <Input value={item.num_packages} onChange={(e) => updateItem(idx, "num_packages", e.target.value)} className="h-7 text-xs" placeholder="e.g. 1 PLT" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Description of Goods</Label>
                  <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="h-7 text-xs" placeholder="e.g. AUTO SPAREPARTS" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight</Label>
                  <Input value={item.weight} onChange={(e) => updateItem(idx, "weight", e.target.value)} className="h-7 text-xs" placeholder="e.g. 210.543 KGS" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Measurement (CBM)</Label>
                  <Input value={item.measurement} onChange={(e) => updateItem(idx, "measurement", e.target.value)} className="h-7 text-xs" placeholder="e.g. 1.2 CBM" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer Details */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Document Footer</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Prepared By</Label>
            <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="e.g. Mr. Asish" />
          </div>
          <div className="space-y-1.5">
            <Label>Number of Originals</Label>
            <Input type="number" min="1" max="10" value={numOriginals} onChange={(e) => setNumOriginals(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Place of Issue</Label>
            <Input value={placeOfIssue} onChange={(e) => setPlaceOfIssue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Issue Date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Delivery Contact</Label>
            <Input value={deliveryContact} onChange={(e) => setDeliveryContact(e.target.value)} placeholder="Phone / email for delivery queries" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e] min-w-32">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Save Changes" : "Create Waybill"}
        </Button>
      </div>
    </div>
  );
}
