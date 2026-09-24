"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, FileText, Save, X, ImagePlus, Trash2, Plus } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { cn } from "@/lib/utils";
import type { GoodsCollectionNote, CargoType, BillingType, DeliveryNoteItem, PalletDimension, PackageLineItem, PackageType } from "@/types";
import { PACKAGE_TYPE_LABELS, PACKAGE_TYPE_SHORT } from "@/types";

const schema = z.object({
  shipper_name: z.string().min(1, "Required"),
  consignee_name: z.string().min(1, "Required"),
  destination: z.string().min(1, "Required"),
  commodity: z.string().min(1, "Required"),
  cargo_type: z.enum(["air", "sea", "land"]),
  shipping_mark: z.string().optional(),
  doc_ref_number: z.string().optional(),
  special_instructions: z.string().optional(),
  num_packages: z.string().optional(),
  volume_cbm: z.coerce.number().optional(),
  weight_kg: z.coerce.number().optional(),
  billing_type: z.enum(["customer", "supplier"]).optional(),
});

const PACKAGE_TYPES: PackageType[] = ["pallet", "piece", "carton", "box"];

type FormData = z.infer<typeof schema>;

interface CollectionFormProps {
  defaultValues?: Partial<GoodsCollectionNote>;
  collectionId?: string;
  isEdit?: boolean;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#071A3A]">
      <div className="w-1 h-4 rounded-sm bg-[#E67A32]" />
      <span className="text-xs font-bold tracking-widest text-white uppercase">
        {children}
      </span>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-[#071A3A] dark:text-gray-300 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#E67A32] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md " +
  "bg-white dark:bg-[#0d1a35] text-gray-900 dark:text-white " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#071A3A] dark:focus:ring-[#E67A32] " +
  "transition-all";

const selectCls = inputCls + " appearance-none cursor-pointer";

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 800, MAX_H = 600;
        let w = img.width, h = img.height;
        if (w > MAX_W) { h = Math.round((h * MAX_W) / w); w = MAX_W; }
        if (h > MAX_H) { w = Math.round((w * MAX_H) / h); h = MAX_H; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CollectionForm({
  defaultValues,
  collectionId,
  isEdit = false,
}: CollectionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiverSig, setReceiverSig] = useState<string | undefined>(defaultValues?.receiver_signature);
  const [staffSig, setStaffSig] = useState<string | undefined>(defaultValues?.staff_signature);
  const [goodsImage, setGoodsImage] = useState<string | undefined>(defaultValues?.goods_image_url);
  const [imageUploading, setImageUploading] = useState(false);

  // Delivery Note
  const [dnEnabled, setDnEnabled] = useState(false);
  const [dnForm, setDnForm] = useState({
    doc_number: "", doc_date: "", job_number: "", shipper: "",
    ref_number: "", destination: "", customer_name: "", customer_address: "",
    customer_phone: "", customer_email: "", notes: "", receiver_name: "", received_date: "",
  });
  const [dnItems, setDnItems] = useState<DeliveryNoteItem[]>([
    { item_description: "", qty: "", unit: "", total_pallets: "", remark: "" },
  ]);

  function setDn(k: keyof typeof dnForm, v: string) {
    setDnForm(p => ({ ...p, [k]: v }));
  }
  function setDnItem(i: number, k: keyof DeliveryNoteItem, v: string) {
    setDnItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  }
  function addDnItem() { setDnItems(p => [...p, { item_description: "", qty: "", unit: "", total_pallets: "", remark: "" }]); }
  function removeDnItem(i: number) { setDnItems(p => p.filter((_, idx) => idx !== i)); }

  // Package lines — a GCN can mix types (e.g. 3 pallets + 20 pieces + 5 cartons).
  // Pallet lines compute their own CBM from per-pallet L×W×H; other types are
  // entered manually since there's no per-unit dimension model for them.
  function emptyPallet(): PalletDimension { return { length_m: 0, width_m: 0, height_m: 0 }; }
  function palletVolumeCbm(p: PalletDimension) {
    return (p.length_m || 0) * (p.width_m || 0) * (p.height_m || 0);
  }
  function emptyLine(type: PackageType = "pallet"): PackageLineItem {
    return {
      package_type: type,
      quantity: 1,
      weight_kg: 0,
      volume_cbm: 0,
      pallet_dimensions: type === "pallet" ? [emptyPallet()] : undefined,
    };
  }
  // Legacy records (saved before mixed package lines existed) only have the old
  // flat pallet_dimensions/weight_kg/volume_cbm fields — reconstruct one line
  // from those so editing an old GCN starts from its real saved totals, not zero.
  function legacyLine(): PackageLineItem | null {
    if (!defaultValues) return null;
    const hasLegacyData =
      (defaultValues.pallet_dimensions && defaultValues.pallet_dimensions.length > 0) ||
      !!defaultValues.weight_kg || !!defaultValues.volume_cbm || !!defaultValues.num_packages;
    if (!hasLegacyData) return null;
    const dims = defaultValues.pallet_dimensions && defaultValues.pallet_dimensions.length > 0
      ? defaultValues.pallet_dimensions
      : [emptyPallet()];
    return {
      package_type: "pallet",
      quantity: dims.length,
      weight_kg: defaultValues.weight_kg || 0,
      volume_cbm: defaultValues.volume_cbm || 0,
      pallet_dimensions: dims,
    };
  }
  const hasPackageItems = !!(defaultValues?.package_items && defaultValues.package_items.length > 0);
  const initialLines: PackageLineItem[] = hasPackageItems
    ? defaultValues!.package_items!
    : (isEdit ? (legacyLine() ? [legacyLine()!] : [emptyLine()]) : [emptyLine()]);
  const [packageLines, setPackageLines] = useState<PackageLineItem[]>(initialLines);

  function updateLine(i: number, patch: Partial<PackageLineItem>) {
    setPackageLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, ...patch } : line)));
  }
  function setLineType(i: number, type: PackageType) {
    const isPallet = type === "pallet";
    updateLine(i, {
      package_type: type,
      pallet_dimensions: isPallet ? [emptyPallet()] : undefined,
      quantity: isPallet ? 1 : packageLines[i].quantity || 1,
      volume_cbm: isPallet ? 0 : packageLines[i].volume_cbm,
    });
  }
  function setLineQuantity(i: number, qty: number) {
    const line = packageLines[i];
    if (line.package_type === "pallet") {
      const dims = line.pallet_dimensions || [];
      const newDims = qty > dims.length
        ? [...dims, ...Array.from({ length: qty - dims.length }, emptyPallet)]
        : dims.slice(0, qty);
      updateLine(i, {
        quantity: qty,
        pallet_dimensions: newDims,
        volume_cbm: newDims.reduce((s, p) => s + palletVolumeCbm(p), 0),
      });
    } else {
      updateLine(i, { quantity: qty });
    }
  }
  function updateLinePalletDim(i: number, palletIdx: number, field: keyof PalletDimension, value: number) {
    const line = packageLines[i];
    const newDims = (line.pallet_dimensions || []).map((p, idx) => (idx === palletIdx ? { ...p, [field]: value } : p));
    updateLine(i, { pallet_dimensions: newDims, volume_cbm: newDims.reduce((s, p) => s + palletVolumeCbm(p), 0) });
  }
  function addLine() {
    setPackageLines((prev) => [...prev, emptyLine("pallet")]);
  }
  function removeLine(i: number) {
    setPackageLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalWeightKg = packageLines.reduce((s, l) => s + (Number(l.weight_kg) || 0), 0);
  const totalVolumeCbm = packageLines.reduce((s, l) => s + (Number(l.volume_cbm) || 0), 0);
  const packagesSummary = (() => {
    const byType = new Map<PackageType, number>();
    for (const l of packageLines) {
      if (!l.quantity) continue;
      byType.set(l.package_type, (byType.get(l.package_type) || 0) + Number(l.quantity));
    }
    return Array.from(byType.entries()).map(([t, q]) => `${q} ${PACKAGE_TYPE_SHORT[t]}`).join(", ");
  })();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shipper_name: defaultValues?.shipper_name || "",
      consignee_name: defaultValues?.consignee_name || "",
      destination: defaultValues?.destination || "",
      commodity: defaultValues?.commodity || "",
      cargo_type: defaultValues?.cargo_type || "land",
      shipping_mark: defaultValues?.shipping_mark || "",
      doc_ref_number: defaultValues?.doc_ref_number || "",
      special_instructions: defaultValues?.special_instructions || "",
      num_packages: defaultValues?.num_packages || "",
      volume_cbm: defaultValues?.volume_cbm,
      weight_kg: defaultValues?.weight_kg,
      billing_type: defaultValues?.billing_type,
    },
  });

  const cargoType = watch("cargo_type");
  const billingType = watch("billing_type");

  useEffect(() => {
    setValue("weight_kg", Number(totalWeightKg.toFixed(3)));
    setValue("volume_cbm", Number(totalVolumeCbm.toFixed(3)));
    setValue("num_packages", packagesSummary);
  }, [totalWeightKg, totalVolumeCbm, packagesSummary, setValue]);

  async function handleGoodsImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const compressed = await compressImage(file);
      setGoodsImage(compressed);
    } catch {
      // ignore compression errors silently
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

  function handleClear() {
    reset();
    setReceiverSig(undefined);
    setStaffSig(undefined);
    setGoodsImage(undefined);
    setPackageLines([emptyLine()]);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        package_items: packageLines,
        receiver_signature: receiverSig,
        staff_signature: staffSig,
        goods_image_url: goodsImage,
      };
      const url = isEdit ? `/api/collections/${collectionId}` : "/api/collections";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const result = await res.json();
      const savedId: string = result.id;

      // Save delivery note if enabled
      if (dnEnabled && savedId) {
        await fetch(`/api/collections/${savedId}/delivery-note`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dnForm, items: dnItems }),
        });
      }

      toast.success(
        isEdit ? "Collection updated" : `Collection ${result.collection_number} created!`,
        { description: "PDF generated and stored." }
      );
      router.push(`/collections/${savedId}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "/");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#0d1a35]">

        {/* ── Card title ── */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-[#071A3A] dark:text-white">
            {isEdit ? "Edit Collection Receipt" : "Create Collection Receipt"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Fill in the details to generate a Goods Collection Note
          </p>
        </div>

        {/* ── Row 1: Receipt # + Date ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Field label="Receipt Number">
            <input
              readOnly
              value={isEdit ? (defaultValues?.collection_number || "") : ""}
              placeholder="Auto-generated"
              className={cn(inputCls, "bg-gray-50 dark:bg-[#071A3A]/60 text-gray-500 cursor-not-allowed")}
            />
          </Field>
          <Field label="Date">
            <input
              readOnly
              value={today}
              className={cn(inputCls, "bg-gray-50 dark:bg-[#071A3A]/60 text-gray-500 cursor-not-allowed")}
            />
          </Field>
        </div>

        {/* ── Row 2: Shipper + Consignee ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Field label="Shipper" required error={errors.shipper_name?.message}>
            <input
              {...register("shipper_name")}
              placeholder="Company or individual name"
              className={cn(inputCls, errors.shipper_name && "border-red-400")}
            />
          </Field>
          <Field label="Consignee" required error={errors.consignee_name?.message}>
            <input
              {...register("consignee_name")}
              placeholder="Company or individual name"
              className={cn(inputCls, errors.consignee_name && "border-red-400")}
            />
          </Field>
        </div>

        {/* ── CARGO DETAILS ── */}
        <SectionHeader>Cargo Details</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Field label="Cargo Particulars" required error={errors.commodity?.message}>
            <input
              {...register("commodity")}
              placeholder="Spare parts, Electronics..."
              className={cn(inputCls, errors.commodity && "border-red-400")}
            />
          </Field>
          <Field label="Shipping Mark">
            <input {...register("shipping_mark")} placeholder="Marks & numbers" className={inputCls} />
          </Field>
          <Field label="Mode of Transport" required error={errors.cargo_type?.message}>
            <select
              value={cargoType}
              onChange={(e) => setValue("cargo_type", e.target.value as CargoType)}
              className={selectCls}
            >
              <option value="land">Land Freight</option>
              <option value="sea">Sea Freight</option>
              <option value="air">Air Freight</option>
            </select>
          </Field>
          <Field label="Doc. Ref. No.">
            <input {...register("doc_ref_number")} placeholder="Invoice / BL / AWB" className={inputCls} />
          </Field>
        </div>

        {/* ── SHIPPING DETAILS ── */}
        <SectionHeader>Shipping Details</SectionHeader>
        <div className="grid grid-cols-1 gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Field label="Destination" required error={errors.destination?.message}>
            <input
              {...register("destination")}
              placeholder="KSA, UAE, UK..."
              className={cn(inputCls, errors.destination && "border-red-400")}
            />
          </Field>
        </div>

        {/* ── PACKAGE LINES ── */}
        <SectionHeader>Packages</SectionHeader>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 space-y-4">
          {packageLines.map((line, i) => (
            <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                <Field label="Package Type">
                  <select
                    value={line.package_type}
                    onChange={(e) => setLineType(i, e.target.value as PackageType)}
                    className={selectCls}
                  >
                    {PACKAGE_TYPES.map((t) => (
                      <option key={t} value={t}>{PACKAGE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity">
                  {line.package_type === "pallet" ? (
                    <select
                      value={line.quantity}
                      onChange={(e) => setLineQuantity(i, Number(e.target.value))}
                      className={selectCls}
                    >
                      {Array.from({ length: 20 }, (_, n) => n + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number" min="0" step="1"
                      value={line.quantity || ""}
                      onChange={(e) => setLineQuantity(i, Number(e.target.value))}
                      placeholder="Qty"
                      className={inputCls}
                    />
                  )}
                </Field>
                {line.package_type !== "pallet" && (
                  <>
                    <Field label="Weight (Kgs)">
                      <input
                        type="number" step="0.01" min="0"
                        value={line.weight_kg || ""}
                        onChange={(e) => updateLine(i, { weight_kg: Number(e.target.value) })}
                        placeholder="e.g. 120.00"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Volume (CBM)">
                      <input
                        type="number" step="0.001" min="0"
                        value={line.volume_cbm || ""}
                        onChange={(e) => updateLine(i, { volume_cbm: Number(e.target.value) })}
                        placeholder="e.g. 1.250"
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}
                {packageLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="flex items-center justify-center gap-1.5 h-[38px] px-3 rounded-md border border-red-200 dark:border-red-900 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Line
                  </button>
                )}
              </div>

              {line.package_type === "pallet" && (
                <div className="space-y-2 pt-1">
                  <Field label="Weight (Kgs) — this line's total">
                    <input
                      type="number" step="0.01" min="0"
                      value={line.weight_kg || ""}
                      onChange={(e) => updateLine(i, { weight_kg: Number(e.target.value) })}
                      placeholder="e.g. 328.00"
                      className={cn(inputCls, "max-w-xs")}
                    />
                  </Field>
                  {(line.pallet_dimensions || []).map((pallet, pIdx) => (
                    <div key={pIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                      <Field label={`Pallet ${pIdx + 1} — Length (m)`}>
                        <input
                          type="number" step="0.01" min="0"
                          value={pallet.length_m || ""}
                          onChange={(e) => updateLinePalletDim(i, pIdx, "length_m", Number(e.target.value))}
                          placeholder="m"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Width (m)">
                        <input
                          type="number" step="0.01" min="0"
                          value={pallet.width_m || ""}
                          onChange={(e) => updateLinePalletDim(i, pIdx, "width_m", Number(e.target.value))}
                          placeholder="m"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Height (m)">
                        <input
                          type="number" step="0.01" min="0"
                          value={pallet.height_m || ""}
                          onChange={(e) => updateLinePalletDim(i, pIdx, "height_m", Number(e.target.value))}
                          placeholder="m"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Volume">
                        <div className={cn(inputCls, "bg-gray-50 dark:bg-[#071A3A]/60 text-gray-500")}>
                          {palletVolumeCbm(pallet).toFixed(3)} m³
                        </div>
                      </Field>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs text-[#E67A32] hover:text-[#d06820] font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Add Package Line
          </button>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-xs text-muted-foreground">
              {packagesSummary || "No packages added yet"}
            </div>
            <div className="text-sm font-semibold text-[#071A3A] dark:text-white">
              Total: {totalWeightKg.toFixed(2)} Kg &middot; {totalVolumeCbm.toFixed(3)} CBM
            </div>
          </div>
        </div>

        {/* ── BILLING & INSTRUCTIONS ── */}
        <SectionHeader>Billing &amp; Instructions</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Field label="Billing of">
            <select
              value={billingType || ""}
              onChange={(e) => setValue("billing_type", e.target.value as BillingType)}
              className={selectCls}
            >
              <option value="">Select</option>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>
          </Field>
          <Field label="Special Instructions">
            <input
              {...register("special_instructions")}
              placeholder="e.g. Fragile, Handle with care"
              className={inputCls}
            />
          </Field>
        </div>

        {/* ── GOODS IMAGE ── */}
        <SectionHeader>Goods Image</SectionHeader>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          {goodsImage ? (
            <div className="flex items-start gap-4">
              <img
                src={goodsImage}
                alt="Goods"
                className="h-32 w-auto max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-900"
              />
              <div className="flex flex-col gap-2 justify-start mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Image attached</p>
                <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-fit">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Replace
                  <input type="file" accept="image/*" className="hidden" onChange={handleGoodsImageChange} />
                </label>
                <button
                  type="button"
                  onClick={() => setGoodsImage(undefined)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all w-fit"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 w-full h-28 rounded-lg border-2 border-dashed cursor-pointer transition-all",
              imageUploading
                ? "border-[#E67A32] bg-orange-50 dark:bg-orange-950/20"
                : "border-gray-200 dark:border-gray-700 hover:border-[#E67A32] hover:bg-orange-50 dark:hover:bg-orange-950/10"
            )}>
              {imageUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#E67A32]" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Click to upload a photo of the goods
                  </span>
                  <span className="text-[11px] text-gray-400">JPG, PNG, WEBP — auto-compressed</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleGoodsImageChange} disabled={imageUploading} />
            </label>
          )}
        </div>

        {/* ── DELIVERY NOTE ── */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dnEnabled}
              onChange={e => setDnEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#E67A32]"
            />
            <span className="text-sm font-semibold text-[#071A3A] dark:text-white">Add Delivery Note</span>
            <span className="text-xs text-muted-foreground">(optional — generates a separate delivery receipt)</span>
          </label>
        </div>

        {dnEnabled && (
          <div className="border-b border-gray-100 dark:border-gray-800">
            <SectionHeader>Delivery Note</SectionHeader>

            {/* Doc info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              {(["doc_number", "doc_date", "job_number", "shipper", "ref_number", "destination"] as const).map(k => (
                <Field key={k} label={k === "doc_number" ? "Doc Number" : k === "doc_date" ? "Date" : k === "job_number" ? "Job Number" : k === "ref_number" ? "Ref Number" : k.charAt(0).toUpperCase() + k.slice(1)}>
                  <input
                    className={inputCls}
                    type={k === "doc_date" ? "date" : "text"}
                    value={dnForm[k]}
                    onChange={e => setDn(k, e.target.value)}
                    placeholder={k === "doc_number" ? "DLO-YSI-26-0001" : k === "job_number" ? "YSIKSA009/LTL" : k === "destination" ? "DAMMAM" : ""}
                  />
                </Field>
              ))}
            </div>

            {/* Customer details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <Field label="Customer Name">
                <input className={inputCls} value={dnForm.customer_name} onChange={e => setDn("customer_name", e.target.value)} placeholder="M/s. Company Name" />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={dnForm.customer_phone} onChange={e => setDn("customer_phone", e.target.value)} placeholder="+966 50 120 3503" />
              </Field>
              <Field label="Address">
                <textarea className={inputCls} rows={2} value={dnForm.customer_address} onChange={e => setDn("customer_address", e.target.value)} placeholder="Street, City, Country" />
              </Field>
              <Field label="Email">
                <input className={inputCls} value={dnForm.customer_email} onChange={e => setDn("customer_email", e.target.value)} placeholder="contact@company.com" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Remarks / Notes">
                  <textarea className={inputCls} rows={2} value={dnForm.notes} onChange={e => setDn("notes", e.target.value)} placeholder="Additional notes or remarks" />
                </Field>
              </div>
            </div>

            {/* Items */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#071A3A] dark:text-white mb-2">Items</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[540px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#071A3A]/40">
                      {["#", "Item Description", "QTY", "UNIT", "Pallets", "Remark", ""].map(h => (
                        <th key={h} className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200 first:w-8 last:w-7">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dnItems.map((it, i) => (
                      <tr key={i}>
                        <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center text-muted-foreground">{i + 1}</td>
                        <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                          <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded" value={it.item_description} onChange={e => setDnItem(i, "item_description", e.target.value)} placeholder="Description" />
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                          <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none text-center rounded" value={String(it.qty)} onChange={e => setDnItem(i, "qty", e.target.value)} placeholder="1" />
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                          <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none text-center rounded" value={it.unit} onChange={e => setDnItem(i, "unit", e.target.value)} placeholder="NOS" />
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                          <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none text-center rounded" value={String(it.total_pallets)} onChange={e => setDnItem(i, "total_pallets", e.target.value)} placeholder="1" />
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                          <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none rounded" value={it.remark} onChange={e => setDnItem(i, "remark", e.target.value)} placeholder="Remark" />
                        </td>
                        <td className="border border-gray-200 dark:border-gray-700 px-1 py-1 text-center">
                          {dnItems.length > 1 && (
                            <button type="button" onClick={() => removeDnItem(i)} className="text-red-400 hover:text-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addDnItem} className="mt-2 flex items-center gap-1 text-xs text-[#E67A32] hover:text-[#d06820] font-medium">
                <Plus className="h-3 w-3" /> Add Row
              </button>
            </div>

            {/* Receiver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4">
              <Field label="Receiver Name">
                <input className={inputCls} value={dnForm.receiver_name} onChange={e => setDn("receiver_name", e.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Received Date">
                <input className={inputCls} type="date" value={dnForm.received_date} onChange={e => setDn("received_date", e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ── SIGNATURES ── */}
        <SectionHeader>Signatures</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <SignaturePad label="Staff Signature" value={staffSig} onChange={setStaffSig} />
          <SignaturePad label="Receiver's Signature" value={receiverSig} onChange={setReceiverSig} />
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 py-4 bg-gray-50 dark:bg-[#071A3A]/40">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E67A32] hover:bg-[#d06820] text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Generating..."}</>
            ) : (
              <><FileText className="h-4 w-4" />{isEdit ? "Save Changes" : "Generate PDF"}</>
            )}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#071A3A] dark:border-gray-600 text-[#071A3A] dark:text-white text-sm font-semibold hover:bg-[#071A3A] hover:text-white transition-all disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save Receipt
          </button>

          {!isEdit && (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Clear Form
            </button>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </form>
  );
}
