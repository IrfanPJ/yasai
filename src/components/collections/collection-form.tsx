"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, FileText, Save, X, ImagePlus, Trash2 } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { cn } from "@/lib/utils";
import type { GoodsCollectionNote, CargoType, BillingType } from "@/types";

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
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = { ...data, receiver_signature: receiverSig, staff_signature: staffSig, goods_image_url: goodsImage };
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
      toast.success(
        isEdit ? "Collection updated" : `Collection ${result.collection_number} created!`,
        { description: "PDF generated and stored." }
      );
      router.push(`/collections/${result.id}`);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <Field label="Destination" required error={errors.destination?.message}>
            <input
              {...register("destination")}
              placeholder="KSA, UAE, UK..."
              className={cn(inputCls, errors.destination && "border-red-400")}
            />
          </Field>
          <Field label="No. of Packages">
            <input {...register("num_packages")} placeholder="e.g. 1 PLT" className={inputCls} />
          </Field>
          <Field label="Volume (CBM)">
            <input
              {...register("volume_cbm")}
              type="number" step="0.001" min="0"
              placeholder="e.g. 0.60"
              className={inputCls}
            />
          </Field>
          <Field label="Weight (Kgs)">
            <input
              {...register("weight_kg")}
              type="number" step="0.01" min="0"
              placeholder="e.g. 328.00"
              className={inputCls}
            />
          </Field>
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
