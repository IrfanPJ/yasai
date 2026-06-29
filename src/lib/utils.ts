import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern = "dd MMM yyyy") {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

export function formatWeight(weight?: number) {
  if (!weight) return "—";
  return `${weight.toFixed(2)} KG`;
}

export function formatVolume(volume?: number) {
  if (!volume) return "—";
  return `${volume.toFixed(3)} CBM`;
}

export function buildReceiptFilename(consigneeName: string): string {
  const safe = consigneeName.replace(/[\\/:*?"<>|]/g, "").trim() || "Receipt";
  return `Goods Collection Receipt - ${safe}.pdf`;
}

// Embeds the filename as the last URL path segment (not just a query param or
// Content-Disposition header) because browsers' built-in PDF viewers often
// derive their own "Save" filename from the URL path itself for inline PDFs,
// ignoring Content-Disposition — without this, saved files show the raw id.
export function buildPdfPath(id: string, consigneeName: string, download = false): string {
  const filename = encodeURIComponent(buildReceiptFilename(consigneeName));
  return `/api/pdf/${id}/${filename}${download ? "?download=1" : ""}`;
}

export function generateWhatsAppMessage(params: {
  collectionNumber: string;
  pdfLink: string;
  trackingLink: string;
}) {
  return encodeURIComponent(
    `*YASAI Logistics*\n\nCollection Number: *${params.collectionNumber}*\n\nGoods Collection Note:\n${params.pdfLink}\n\nTracking Link:\n${params.trackingLink}\n\n_Thank you._`
  );
}

export function openWhatsApp(message: string) {
  window.open(`https://wa.me/?text=${message}`, "_blank");
}

export function downloadFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}
