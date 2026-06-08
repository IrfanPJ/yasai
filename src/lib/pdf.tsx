import type { GoodsCollectionNote } from "@/types";
import { format } from "date-fns";

const NAVY   = "#0B1F3F";
const ORANGE = "#E67A32";
const BORDER = "#D1D5DB";
const HDR_BG = "#F3F4F6";
const LIGHT_ORANGE = "#FFF7ED";
const ORANGE_BG = "#F97316";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Transport mode pill */
function modePill(label: string, icon: string, isActive: boolean): string {
  if (isActive) {
    return `<div style="display:inline-flex;align-items:center;gap:4px;background:${NAVY};color:white;
      padding:3px 8px;border-radius:4px;font-size:6pt;font-weight:bold;">
      <span style="font-size:8px;">${icon}</span>${label}
    </div>`;
  }
  return `<div style="display:inline-flex;align-items:center;gap:4px;background:white;color:#333;
    padding:3px 8px;border-radius:4px;font-size:6pt;font-weight:bold;border:1px solid #ccc;">
    <span style="font-size:8px;">${icon}</span>${label}
  </div>`;
}

/* Billing pill */
function billingPill(label: string, isActive: boolean): string {
  if (isActive) {
    return `<div style="display:inline-flex;align-items:center;gap:3px;background:white;color:${NAVY};
      padding:2px 8px;border-radius:4px;font-size:6.5pt;font-weight:bold;border:1.5px solid ${NAVY};">
      ${label} <span style="display:inline-flex;align-items:center;justify-content:center;width:12px;height:12px;
      background:${ORANGE};border-radius:2px;color:white;font-size:8px;">✓</span>
    </div>`;
  }
  return `<div style="display:inline-flex;align-items:center;gap:3px;background:white;color:#666;
    padding:2px 8px;border-radius:4px;font-size:6.5pt;font-weight:bold;border:1px solid #ccc;">
    ${label}
  </div>`;
}

/* Section header icon */
function headerIcon(icon: string): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;
    background:${LIGHT_ORANGE};border-radius:50%;flex-shrink:0;margin-right:4px;">
    <span style="font-size:8px;color:${ORANGE};">${icon}</span>
  </span>`;
}

function buildPdfHtml(
  data: GoodsCollectionNote,
  qrDataUrl?: string,
  logoDataUrl?: string,
): string {
  const date = format(new Date(data.created_at), "d-M-yy");
  const cargoLabel =
    data.cargo_type === "air"  ? "Air Freight"
    : data.cargo_type === "sea" ? "Sea Freight"
    : "Land Freight";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A5 landscape; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    color: #222;
    width: 210mm;
    height: 148mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #FAFAFA;
  }

  /* ── LETTERHEAD ── */
  .lh {
    display: flex;
    align-items: center;
    padding: 8px 14px;
    background: white;
    border-bottom: 2.5px solid ${ORANGE};
  }
  .lh-logo {
    display: flex;
    align-items: center;
    padding-right: 12px;
    border-right: 2.5px solid ${ORANGE};
    min-width: 90px;
    height: 48px;
  }
  .lh-logo img { height: 42px; width: auto; object-fit: contain; }
  .lh-center {
    flex: 1;
    padding: 0 14px;
  }
  .lh-title-en {
    font-size: 12pt;
    font-weight: 900;
    color: ${NAVY};
    letter-spacing: 0.5px;
  }
  .lh-subtitle {
    font-size: 7pt;
    color: #888;
    margin-top: 1px;
  }
  .lh-ar {
    font-size: 10pt;
    font-weight: bold;
    color: ${NAVY};
    direction: rtl;
    text-align: right;
    min-width: 160px;
  }

  /* Contact row */
  .contact-row {
    display: flex;
    align-items: center;
    padding: 3px 14px;
    background: white;
    gap: 14px;
    font-size: 6pt;
    color: #666;
    border-bottom: 1px solid #eee;
  }
  .contact-row .ci {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .contact-row .ci-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    background: ${ORANGE};
    border-radius: 50%;
    color: white;
    font-size: 7px;
    flex-shrink: 0;
  }
  .contact-row .web-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    background: ${NAVY};
    border-radius: 50%;
    color: white;
    font-size: 7px;
    flex-shrink: 0;
  }

  /* Badge */
  .badge-row {
    display: flex;
    justify-content: flex-end;
    padding: 0 14px;
    margin-top: -18px;
    position: relative;
    z-index: 2;
  }
  .doc-badge {
    background: ${ORANGE};
    color: white;
    font-size: 9.5pt;
    font-weight: 900;
    padding: 5px 18px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* ── CONTENT AREA ── */
  .content {
    flex: 1;
    padding: 6px 14px 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Doc No + Shipper/Consignee row */
  .top-row {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }
  .doc-no-card {
    background: ${LIGHT_ORANGE};
    border: 1.5px solid ${ORANGE};
    border-radius: 6px;
    padding: 5px 10px;
    min-width: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .doc-no-label {
    font-size: 6pt;
    color: #666;
    font-weight: 600;
  }
  .doc-no-value {
    font-size: 11pt;
    font-weight: 900;
    color: ${ORANGE};
    letter-spacing: 0.3px;
  }

  .ship-con-wrap {
    flex: 1;
    display: flex;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
    background: white;
  }
  .ship-cell, .con-cell {
    flex: 1;
    padding: 0;
  }
  .ship-cell { border-right: 1.5px solid ${BORDER}; }
  .sc-hdr {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: ${HDR_BG};
    border-bottom: 1px solid ${BORDER};
    font-size: 7pt;
    font-weight: 800;
    color: ${NAVY};
    text-transform: uppercase;
  }
  .sc-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: ${LIGHT_ORANGE};
    border-radius: 50%;
    flex-shrink: 0;
  }
  .sc-icon span { font-size: 10px; color: ${ORANGE}; }
  .sc-val {
    padding: 5px 8px;
    font-size: 8pt;
    min-height: 26px;
  }

  /* ── MAIN TABLE ── */
  .gcn {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
    background: white;
  }
  .gcn td, .gcn th {
    border: 1px solid ${BORDER};
    padding: 0;
    vertical-align: top;
  }

  /* Section header cells */
  .sec-hdr {
    background: ${HDR_BG};
    padding: 3px 6px;
    display: flex;
    align-items: center;
    font-size: 6.5pt;
    font-weight: 800;
    color: ${NAVY};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid ${BORDER};
  }
  .sec-val {
    padding: 4px 8px;
    font-size: 8pt;
    color: #333;
    min-height: 22px;
  }
  .sec-val-bold {
    padding: 4px 8px;
    font-size: 9pt;
    font-weight: 700;
    color: #111;
  }

  /* Transport pills container */
  .transport-pills {
    display: flex;
    gap: 4px;
    padding: 4px 4px;
    align-items: center;
    justify-content: center;
  }

  /* Billing pills container */
  .billing-pills {
    display: flex;
    gap: 6px;
    padding: 4px 6px;
    align-items: center;
    justify-content: center;
  }

  /* ── BOTTOM ROW (Packages/Volume/Weight/Signatures) ── */
  .btm-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
    background: white;
  }
  .btm-table td {
    border: 1px solid ${BORDER};
    padding: 0;
    vertical-align: top;
  }
  .btm-hdr {
    background: ${HDR_BG};
    padding: 3px 6px;
    display: flex;
    align-items: center;
    font-size: 6.5pt;
    font-weight: 800;
    color: ${NAVY};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid ${BORDER};
  }

  .orange-cell {
    background: ${ORANGE};
    color: white;
  }
  .orange-cell .btm-hdr {
    background: rgba(0,0,0,0.12);
    color: white;
  }
  .orange-val {
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .orange-num {
    font-size: 14pt;
    font-weight: 900;
    color: white;
  }
  .orange-unit {
    font-size: 8pt;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    margin-top: 4px;
  }
  .orange-icon {
    opacity: 0.3;
    font-size: 24px;
    margin-left: auto;
  }

  .sig-td { min-height: 48px; vertical-align: top; }
  .sig-img { width: 80px; height: 36px; object-fit: contain; display: block; margin: 4px; }
  .sig-line { border-bottom: 1px solid #CCC; margin: 34px 8px 0; }

  /* ── FOOTER ── */
  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${NAVY};
    padding: 6px 14px;
    margin-top: auto;
  }
  .footer-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .footer-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pin {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid ${ORANGE};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pin span { font-size: 10px; color: ${ORANGE}; }
  .f-co-en { font-size: 7pt; font-weight: bold; color: white; }
  .f-ad-en { font-size: 5.5pt; color: #AAA; line-height: 1.4; margin-top: 1px; }
  .f-co-ar { font-size: 8pt; font-weight: bold; color: white; text-align: right; direction: rtl; }
  .f-ad-ar { font-size: 5.5pt; color: #AAA; text-align: right; direction: rtl; line-height: 1.4; margin-top: 1px; }

  .qr-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.08);
    padding: 4px 10px;
    border-radius: 6px;
  }
  .qr-box {
    background: white;
    padding: 3px;
    border-radius: 4px;
  }
  .qr-img { width: 36px; height: 36px; display: block; }
  .qr-text {
    text-align: left;
  }
  .qr-lbl {
    font-size: 6pt;
    color: #AAA;
    font-weight: 600;
  }
  .qr-num {
    font-size: 7pt;
    color: ${ORANGE};
    font-weight: 800;
    margin-top: 1px;
  }
</style>
</head>
<body>

  <!-- LETTERHEAD -->
  <div class="lh">
    <div class="lh-logo">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="YASAI">` : ""}
    </div>
    <div class="lh-center">
      <div class="lh-title-en">YASAI LOGISTICS COMPANY</div>
      <div class="lh-subtitle">Freight &amp; Logistics Solutions</div>
    </div>
    <div class="lh-ar">شركة ياساي للوجستيات ش.ذ.م.م</div>
  </div>

  <!-- Contact Row -->
  <div class="contact-row">
    <div class="ci"><span class="ci-icon">●</span> H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai – UAE</div>
    <div class="ci"><span class="ci-icon">✆</span> +966 55 932 6687</div>
    <div class="ci"><span class="ci-icon">✉</span> info@yasailogistics.com</div>
    <div class="ci"><span class="web-icon">⊕</span> www.yasailogistics.com</div>
  </div>

  <!-- Badge -->
  <div class="badge-row">
    <div class="doc-badge">Goods Collection Note</div>
  </div>

  <div class="content">

    <!-- Row 1: Doc No + Shipper/Consignee -->
    <div class="top-row">
      <div class="doc-no-card">
        <div class="doc-no-label">Document No.</div>
        <div class="doc-no-value">${esc(data.collection_number)}</div>
      </div>
      <div class="ship-con-wrap">
        <div class="ship-cell">
          <div class="sc-hdr">
            <div class="sc-icon"><span>👤</span></div>
            SHIPPER
          </div>
          <div class="sc-val">${esc(data.shipper_name)}</div>
        </div>
        <div class="con-cell">
          <div class="sc-hdr">
            <div class="sc-icon"><span>👤</span></div>
            CONSIGNEE
          </div>
          <div class="sc-val">
            ${esc(data.consignee_name)}
            ${data.contact_person ? `<div style="font-size:6pt;color:#888;margin-top:1px;">Contact: ${esc(data.contact_person)}</div>` : ""}
            ${data.phone ? `<div style="font-size:6pt;color:#888;">Tel: ${esc(data.phone)}</div>` : ""}
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Cargo Particulars / Shipping Mark / Cargo Type / Mode of Transport -->
    <table class="gcn">
      <tr>
        <td style="width:18%">
          <div class="sec-hdr">${headerIcon("📦")} CARGO PARTICULARS</div>
          <div class="sec-val">${esc(data.commodity)}</div>
        </td>
        <td style="width:18%">
          <div class="sec-hdr">${headerIcon("🏷")} SHIPPING MARK</div>
          <div class="sec-val">${esc(data.shipping_mark) || "–"}</div>
        </td>
        <td style="width:14%">
          <div class="sec-hdr">${headerIcon("📋")} CARGO TYPE</div>
          <div class="sec-val">${esc(cargoLabel)}</div>
        </td>
        <td style="width:22%">
          <div class="sec-hdr">${headerIcon("🚛")} MODE OF TRANSPORT</div>
          <div class="transport-pills">
            ${modePill("LAND FREIGHT", "🚛", data.cargo_type === "land")}
            ${modePill("SEA FREIGHT", "🚢", data.cargo_type === "sea")}
            ${modePill("AIR FREIGHT", "✈", data.cargo_type === "air")}
          </div>
        </td>
      </tr>
    </table>

    <!-- Row 2b: Date row (separate small cell within the cargo row) -->
    <!-- Integrated into Row 2 as an extra cell -->

    <!-- Row 3: Cargo row with Date -->
    <table class="gcn">
      <tr>
        <td style="width:10%">
          <div class="sec-hdr">${headerIcon("📅")} DATE</div>
          <div class="sec-val-bold">${esc(date)}</div>
        </td>
        <td style="width:18%">
          <div class="sec-hdr">${headerIcon("📍")} DESTINATION</div>
          <div class="sec-val-bold">${esc(data.destination)}</div>
        </td>
        <td style="width:20%">
          <div class="sec-hdr">${headerIcon("📦")} COMMODITY</div>
          <div class="sec-val">${esc(data.commodity)}</div>
        </td>
        <td style="width:14%">
          <div class="sec-hdr">${headerIcon("📄")} DOC. REF. NO.</div>
          <div class="sec-val">${esc(data.doc_ref_number) || "–"}</div>
        </td>
        <td style="width:20%">
          <div class="sec-hdr">${headerIcon("📝")} SPECIAL INSTRUCTIONS</div>
          <div class="sec-val">${esc(data.special_instructions) || "–"}</div>
        </td>
        <td style="width:18%">
          <div class="sec-hdr">${headerIcon("💰")} BILLING OF</div>
          <div class="billing-pills">
            ${billingPill("CUSTOMER", data.billing_type === "customer")}
            ${billingPill("SUPPLIER", data.billing_type === "supplier")}
          </div>
        </td>
      </tr>
    </table>

    <!-- Row 4: Packages / Volume / Weight / Signatures -->
    <table class="btm-table">
      <tr>
        <td style="width:16%">
          <div class="btm-hdr">${headerIcon("📦")} NO. OF PACKAGES</div>
          <div class="sec-val-bold">${esc(data.num_packages) || "–"}</div>
        </td>
        <td class="orange-cell" style="width:17%">
          <div class="btm-hdr">${headerIcon("📐")} VOLUME (CBM)</div>
          <div class="orange-val">
            <div>
              <div class="orange-num">${data.volume_cbm ? Number(data.volume_cbm).toFixed(2) : "–"}</div>
            </div>
            <div class="orange-icon">📦</div>
          </div>
        </td>
        <td class="orange-cell" style="width:17%">
          <div class="btm-hdr">${headerIcon("⚖")} WEIGHT (KGS)</div>
          <div class="orange-val">
            <div>
              <div class="orange-num">${data.weight_kg ? Number(data.weight_kg).toFixed(2) : "–"}</div>
              <div class="orange-unit">KGS</div>
            </div>
            <div class="orange-icon">⚖</div>
          </div>
        </td>
        <td style="width:25%">
          <div class="btm-hdr">${headerIcon("✍")} SIGNATURE</div>
          <div class="sig-td">
            ${data.staff_signature
              ? `<img src="${data.staff_signature}" class="sig-img" alt="Sig">`
              : `<div class="sig-line"></div>`}
          </div>
        </td>
        <td style="width:25%">
          <div class="btm-hdr">${headerIcon("✍")} RECEIVER'S NAME AND SIGNATURE</div>
          <div class="sig-td">
            ${data.receiver_signature
              ? `<img src="${data.receiver_signature}" class="sig-img" alt="Sig">`
              : `<div class="sig-line"></div>`}
          </div>
        </td>
      </tr>
    </table>

  </div>

  <!-- FOOTER with QR -->
  <div class="bottom">
    <div class="footer-left">
      <div class="pin"><span>●</span></div>
      <div>
        <div class="f-co-en">YASAI LOGISTICS COMPANY</div>
        <div class="f-ad-en">H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai – UAE</div>
      </div>
    </div>

    ${qrDataUrl ? `
    <div class="qr-wrap">
      <div class="qr-box"><img src="${qrDataUrl}" class="qr-img" alt="QR"></div>
      <div class="qr-text">
        <div class="qr-lbl">Scan to track</div>
        <div class="qr-num">${esc(data.collection_number)}</div>
      </div>
    </div>` : ""}

    <div class="footer-right">
      <div>
        <div class="f-co-ar">شركة ياساي اللوجستية</div>
        <div class="f-ad-ar">٧٥٧٩، ابن الملاح نهضة منطقة<br>الرياض، المملكة العربية السعودية</div>
      </div>
      <div class="pin"><span>●</span></div>
    </div>
  </div>

</body>
</html>`;
}

export async function generateCollectionPDF(
  data: GoodsCollectionNote,
  qrDataUrl?: string,
  logoDataUrl?: string,
): Promise<Buffer> {
  const html = buildPdfHtml(data, qrDataUrl, logoDataUrl);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      width: "210mm",
      height: "148mm",
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
