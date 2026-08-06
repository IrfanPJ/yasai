import type { GoodsCollectionNote, DeliveryNote, DeliveryNoteItem, JobOrder, Invoice, InvoiceLineItem, Waybill, WaybillCargoItem } from "@/types";
import { format } from "date-fns";

const NAVY         = "#0B1F3F";
const ORANGE       = "#E67A32";
const BORDER       = "#D1D5DB";
const HDR_BG       = "#F3F4F6";
const LIGHT_ORANGE = "#FFF7ED";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Receipt helper components ── */

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

function billingPill(label: string, isActive: boolean): string {
  if (isActive) {
    return `<div style="display:inline-flex;align-items:center;gap:3px;background:white;color:${NAVY};
      padding:2px 8px;border-radius:4px;font-size:6.5pt;font-weight:bold;border:1.5px solid ${NAVY};">
      ${label} <span style="display:inline-flex;align-items:center;justify-content:center;width:12px;height:12px;
      background:${ORANGE};border-radius:2px;color:white;font-size:8px;">&#10003;</span>
    </div>`;
  }
  return `<div style="display:inline-flex;align-items:center;gap:3px;background:white;color:#666;
    padding:2px 8px;border-radius:4px;font-size:6.5pt;font-weight:bold;border:1px solid #ccc;">
    ${label}
  </div>`;
}

function headerIcon(icon: string): string {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;
    background:${LIGHT_ORANGE};border-radius:50%;flex-shrink:0;margin-right:4px;">
    <span style="font-size:8px;color:${ORANGE};">${icon}</span>
  </span>`;
}

/* ── Terms & Conditions helper components ── */

function tcPara(text: string): string {
  return `<p class="tc-p">${text}</p>`;
}

function tcBullet(text: string): string {
  return `<div class="tc-bullet">&#8226;&#160;${text}</div>`;
}

function tcLettered(letter: string, text: string): string {
  return `<div class="tc-lettered">(${letter})&#160;${text}</div>`;
}

function tcSection(num: string, title: string, body: string): string {
  return `<div class="tc-sec"><div class="tc-sec-title">${num}. ${title}</div>${body}</div>`;
}

function buildTCContent(): string {
  return [
    tcSection("1", "Packaging", [
      tcPara("The Sender is solely liable for ensuring all shipments are packed to survive transit and arrive at the destination in good condition. YASAI logistics bears no liability for any loss or damage caused by poor or weak packaging."),
      tcPara("Packaging can be arranged on request and charged at the rate in force at the time."),
      tcPara("Each package must be clearly marked with the full address, consignee name, and a valid phone number. YASAI logistics will not be held liable for delays or non-delivery due to missing or unclear labels on packages."),
    ].join("")),

    tcSection("2", "Shipment Insurance", [
      tcPara("On written request and payment of the applicable premium, YASAI logistics will arrange insurance on behalf of the Shipper or Consignee to cover the full value of the shipment or consignment."),
      tcPara("YASAI urges all clients to insure their cargo. No claims will be accepted for cargo that is not insured."),
    ].join("")),

    tcSection("3", "Liability for Loss &amp; Damage", [
      tcPara("YASAI&#39;s liability for any loss or damage in transit is subject to the insurance terms in Section 2. No claims will be processed for cargo that is not insured."),
      tcPara("YASAI shall not be held liable for any loss or damage arising from:"),
      tcBullet("Fire"),
      tcBullet("Any cause not due to the wilful neglect or fault of YASAI or its employees"),
      tcPara("The Customer grants YASAI the right to arrange carriage by any route or mode of transport and to sign contracts on the Customer&#39;s behalf. The Customer shall be bound by all terms in such contracts under law and trade customs in force."),
      tcPara("YASAI may join goods with those of other clients and is not bound to store or ship goods apart from others unless otherwise agreed in writing."),
    ].join("")),

    tcSection("4", "Prohibited &amp; Restricted Shipments", [
      tcPara("YASAI does not accept the following for shipment:"),
      tcBullet("Hazardous or dangerous goods"),
      tcBullet("Currency or monetary instruments"),
      tcBullet("Jewellery and precious items"),
      tcBullet("Goods banned or restricted under law or customs rules of the origin, transit, or destination country"),
      tcPara("All packages must hold only items that have been declared. Undeclared goods are the sole liability of the Consignor, who must cover YASAI for all costs or penalties arising from such items."),
      tcPara("Each item must show its country of origin clearly. Failure to do so may lead to delays, fines, or seizure of goods, for which the Customer, Consignor, and Consignee are jointly and fully liable."),
    ].join("")),

    tcSection("5", "Claims Procedure", [
      tcPara("All claims must be filed with YASAI in writing within the time limits set below:"),
      tcLettered("a", "Damage or shortage claims must be lodged within 3 days of delivery at the destination."),
      tcLettered("b", "All other claims must be filed within 7 days from the date of delivery at the origin."),
      tcLettered("c", "YASAI will not be liable for missing or short contents found within sealed or pre-packed cargo."),
    ].join("")),

    tcSection("6", "Lien &amp; Detention of Goods", [
      tcPara("All goods held by YASAI are subject to a lien for any sums owed by the Sender, Owner, or Consignee to the Company for those goods."),
      tcPara("If any sum stays unpaid within 15 days of a written notice to the party&#39;s last known address, YASAI may sell the goods by auction or otherwise at its sole discretion and at the full cost of the defaulting party."),
    ].join("")),

    tcSection("7", "Customer Declaration", [
      tcPara("By using the services of YASAI, the Customer accepts and agrees to the terms set out below:"),
      tcPara("YASAI and its affiliates will carry all shipments, whether LCL or FTL, in good faith and based solely on the goods description in the Customer&#39;s invoice or documents."),
      tcPara("If cargo is found to hold contraband or banned items, by intent or error, YASAI is entitled to full compensation for all losses, fines, and penalties and may take legal action against the Customer to protect its interests."),
    ].join("")),

    tcSection("8", "Required Documentation", [
      tcPara("All consignments must be sent with the following documents:"),
      tcBullet("A Delivery Order listing the full contents of each package"),
      tcBullet("An Original Commercial Invoice"),
      tcBullet("The Consignee&#39;s full name, delivery address, and a valid phone number"),
      tcPara("Customers must ensure all packages hold only the declared items. Any gap between the declared and actual contents is the sole liability of the Consignor, who must cover YASAI for all losses."),
      tcPara("All cargo must comply with import and export rules of the destination country. YASAI may exercise a lien on goods to recover losses from breach of these rules."),
    ].join("")),

    tcSection("9", "Contact &amp; Support", [
      tcPara("For urgent queries, service issues, or complaints, please contact our operations team at:"),
      `<div class="tc-contact-box">
        <div class="tc-contact-row">&#128222;&#160;+966 55 932 6687</div>
        <div class="tc-contact-row">&#9993;&#160;info@yasailogistics.com</div>
        <div class="tc-contact-row">&#127760;&#160;www.yasailogistics.com</div>
        <div class="tc-tagline">Trusted Name in Cargo Consolidation</div>
      </div>`,
    ].join("")),
  ].join("");
}

/* ── Main HTML builder ── */

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { margin: 0; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    color: #222;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: #FAFAFA;
    display: flex;
    flex-direction: column;
  }

  /* ── RECEIPT WRAPPER ── */
  .receipt-wrapper {
    width: 210mm;
    flex-shrink: 0;
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
    font-family: 'Noto Naskh Arabic', Arial, sans-serif;
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
    padding: 6px 14px 6px;
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

  .transport-pills {
    display: flex;
    gap: 4px;
    padding: 4px 4px;
    align-items: center;
    justify-content: center;
  }
  .billing-pills {
    display: flex;
    gap: 6px;
    padding: 4px 6px;
    align-items: center;
    justify-content: center;
  }

  /* ── BOTTOM ROW ── */
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
  .goods-img { width: calc(100% - 8px); max-height: 58px; object-fit: cover; display: block; margin: 3px 4px; border-radius: 2px; }
  .no-goods-img { font-size: 5.5pt; color: #CCC; text-align: center; padding: 18px 4px; }

  /* ── FOOTER ── */
  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${NAVY};
    padding: 6px 14px;
    flex-shrink: 0;
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
  .f-co-ar { font-size: 8pt; font-weight: bold; color: white; text-align: right; direction: rtl; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
  .f-ad-ar { font-size: 5.5pt; color: #AAA; text-align: right; direction: rtl; line-height: 1.4; margin-top: 1px; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
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
  .qr-text { text-align: left; }
  .qr-lbl { font-size: 6pt; color: #AAA; font-weight: 600; }
  .qr-num { font-size: 7pt; color: ${ORANGE}; font-weight: 800; margin-top: 1px; }

  /* ── TERMS & CONDITIONS ── */
  .tc-wrapper {
    flex: 1;
    overflow: hidden;
    background: white;
    padding: 4px 14px 4px;
    border-top: 2.5px solid ${ORANGE};
    display: flex;
    flex-direction: column;
  }
  .tc-header {
    text-align: center;
    padding-bottom: 3px;
    margin-bottom: 4px;
    border-bottom: 1px solid ${BORDER};
    flex-shrink: 0;
  }
  .tc-main-title {
    font-size: 9pt;
    font-weight: 900;
    color: ${NAVY};
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .tc-subtitle {
    font-size: 6pt;
    color: #666;
    font-style: italic;
    margin-top: 1px;
  }
  .tc-columns {
    column-count: 3;
    column-gap: 12px;
    flex: 1;
    overflow: hidden;
  }
  .tc-sec {
    break-inside: avoid-column;
    margin-bottom: 4px;
  }
  .tc-sec-title {
    font-size: 6.5pt;
    font-weight: 800;
    color: ${NAVY};
    padding: 1px 4px;
    margin-bottom: 2px;
    background: ${HDR_BG};
    border-left: 2px solid ${ORANGE};
    display: block;
  }
  .tc-p {
    font-size: 6pt;
    color: #333;
    line-height: 1.25;
    text-align: justify;
    margin-bottom: 2px;
  }
  .tc-bullet {
    font-size: 6pt;
    color: #333;
    line-height: 1.25;
    padding-left: 7px;
    margin-bottom: 1px;
  }
  .tc-lettered {
    font-size: 6pt;
    color: #333;
    line-height: 1.25;
    padding-left: 7px;
    margin-bottom: 1px;
  }
  .tc-contact-box {
    border: 1px solid ${BORDER};
    border-radius: 3px;
    padding: 3px 5px;
    background: ${HDR_BG};
    margin-top: 2px;
  }
  .tc-contact-row {
    font-size: 6pt;
    color: ${NAVY};
    font-weight: bold;
    line-height: 1.5;
  }
  .tc-tagline {
    font-size: 5.5pt;
    color: ${ORANGE};
    font-style: italic;
    margin-top: 2px;
    text-align: center;
    border-top: 1px solid ${BORDER};
    padding-top: 2px;
  }
</style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- RECEIPT SECTION (A5 landscape block, top of A4)    -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="receipt-wrapper">

    <!-- LETTERHEAD -->
    <div class="lh">
      <div class="lh-logo">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="YASAI">` : ""}
      </div>
      <div class="lh-center">
        <div class="lh-title-en">YASAI LOGISTICS COMPANY</div>
        <div class="lh-subtitle">Freight &amp; Logistics Solutions</div>
      </div>
      <div class="lh-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1575;&#1578;</div>
    </div>

    <!-- Contact Row -->
    <div class="contact-row">
      <div class="ci"><span class="ci-icon">&#9679;</span> H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
      <div class="ci"><span class="ci-icon">&#9990;</span> +966 55 932 6687</div>
      <div class="ci"><span class="ci-icon">&#9993;</span> info@yasailogistics.com</div>
      <div class="ci"><span class="web-icon">&#8853;</span> www.yasailogistics.com</div>
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
              <div class="sc-icon"><span>&#128100;</span></div>
              SHIPPER
            </div>
            <div class="sc-val">${esc(data.shipper_name)}</div>
          </div>
          <div class="con-cell">
            <div class="sc-hdr">
              <div class="sc-icon"><span>&#128100;</span></div>
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
            <div class="sec-hdr">${headerIcon("&#128230;")} CARGO PARTICULARS</div>
            <div class="sec-val">${esc(data.commodity)}</div>
          </td>
          <td style="width:18%">
            <div class="sec-hdr">${headerIcon("&#127991;")} SHIPPING MARK</div>
            <div class="sec-val">${esc(data.shipping_mark) || "&#8211;"}</div>
          </td>
          <td style="width:14%">
            <div class="sec-hdr">${headerIcon("&#128203;")} CARGO TYPE</div>
            <div class="sec-val">${esc(cargoLabel)}</div>
          </td>
          <td style="width:22%">
            <div class="sec-hdr">${headerIcon("&#128667;")} MODE OF TRANSPORT</div>
            <div class="transport-pills">
              ${modePill("LAND FREIGHT", "&#128667;", data.cargo_type === "land")}
              ${modePill("SEA FREIGHT", "&#128674;", data.cargo_type === "sea")}
              ${modePill("AIR FREIGHT", "&#9992;", data.cargo_type === "air")}
            </div>
          </td>
        </tr>
      </table>

      <!-- Row 3: Date / Destination / Commodity / Doc Ref / Instructions / Billing -->
      <table class="gcn">
        <tr>
          <td style="width:10%">
            <div class="sec-hdr">${headerIcon("&#128197;")} DATE</div>
            <div class="sec-val-bold">${esc(date)}</div>
          </td>
          <td style="width:18%">
            <div class="sec-hdr">${headerIcon("&#128205;")} DESTINATION</div>
            <div class="sec-val-bold">${esc(data.destination)}</div>
          </td>
          <td style="width:20%">
            <div class="sec-hdr">${headerIcon("&#128230;")} COMMODITY</div>
            <div class="sec-val">${esc(data.commodity)}</div>
          </td>
          <td style="width:14%">
            <div class="sec-hdr">${headerIcon("&#128196;")} DOC. REF. NO.</div>
            <div class="sec-val">${esc(data.doc_ref_number) || "&#8211;"}</div>
          </td>
          <td style="width:20%">
            <div class="sec-hdr">${headerIcon("&#128221;")} SPECIAL INSTRUCTIONS</div>
            <div class="sec-val">${esc(data.special_instructions) || "&#8211;"}</div>
          </td>
          <td style="width:18%">
            <div class="sec-hdr">${headerIcon("&#128176;")} BILLING OF</div>
            <div class="billing-pills">
              ${billingPill("CUSTOMER", data.billing_type === "customer")}
              ${billingPill("SUPPLIER", data.billing_type === "supplier")}
            </div>
          </td>
        </tr>
      </table>

      <!-- Row 4: Packages / Volume / Weight / Goods Image / Signatures -->
      <table class="btm-table">
        <tr>
          <td style="width:11%">
            <div class="btm-hdr">${headerIcon("&#128230;")} NO. OF PACKAGES</div>
            <div class="sec-val-bold">${esc(data.num_packages) || "&#8211;"}</div>
          </td>
          <td class="orange-cell" style="width:13%">
            <div class="btm-hdr">${headerIcon("&#128208;")} VOLUME (CBM)</div>
            <div class="orange-val">
              <div>
                <div class="orange-num">${data.volume_cbm ? Number(data.volume_cbm).toFixed(2) : "&#8211;"}</div>
              </div>
              <div class="orange-icon">&#128230;</div>
            </div>
          </td>
          <td class="orange-cell" style="width:13%">
            <div class="btm-hdr">${headerIcon("&#9878;")} WEIGHT (KGS)</div>
            <div class="orange-val">
              <div>
                <div class="orange-num">${data.weight_kg ? Number(data.weight_kg).toFixed(2) : "&#8211;"}</div>
                <div class="orange-unit">KGS</div>
              </div>
              <div class="orange-icon">&#9878;</div>
            </div>
          </td>
          <td style="width:26%">
            <div class="btm-hdr">${headerIcon("&#128247;")} GOODS IMAGE</div>
            <div class="sig-td">
              ${data.goods_image_url
                ? `<img src="${data.goods_image_url}" class="goods-img" alt="Goods">`
                : `<div class="no-goods-img">No image</div>`}
            </div>
          </td>
          <td style="width:18%">
            <div class="btm-hdr">${headerIcon("&#9997;")} SIGNATURE</div>
            <div class="sig-td">
              ${data.staff_signature
                ? `<img src="${data.staff_signature}" class="sig-img" alt="Sig">`
                : `<div class="sig-line"></div>`}
            </div>
          </td>
          <td style="width:19%">
            <div class="btm-hdr">${headerIcon("&#9997;")} RECEIVER&#39;S SIGNATURE</div>
            <div class="sig-td">
              ${data.receiver_signature
                ? `<img src="${data.receiver_signature}" class="sig-img" alt="Sig">`
                : `<div class="sig-line"></div>`}
            </div>
          </td>
        </tr>
      </table>

    </div>

  </div>
  <!-- end .receipt-wrapper -->

  <!-- ═══════════════════════════════════════════════════ -->
  <!-- TERMS & CONDITIONS SECTION                          -->
  <!-- ═══════════════════════════════════════════════════ -->
  <div class="tc-wrapper">
    <div class="tc-header">
      <div class="tc-main-title">TERMS &amp; CONDITIONS</div>
      <div class="tc-subtitle">Standard Conditions Governing All Shipments and Cargo Services</div>
    </div>
    <div class="tc-columns">
      ${buildTCContent()}
    </div>
  </div>

  <!-- FOOTER with QR -->
  <div class="bottom">
    <div class="footer-left">
      <div class="pin"><span>&#9679;</span></div>
      <div>
        <div class="f-co-en">YASAI LOGISTICS COMPANY</div>
        <div class="f-ad-en">H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
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
        <div class="f-co-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1575;&#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1577;</div>
        <div class="f-ad-ar">&#1607;&#1607; &#1575;&#1604;&#1588;&#1610;&#1582; &#1587;&#1593;&#1608;&#1583; &#1576;&#1606; &#1589;&#1602;&#1585;&#1548; &#1575;&#1604;&#1605;&#1578;&#1610;&#1606;&#1577;&#1548; &#1583;&#1576;&#1610; &#8211; &#1575;&#1604;&#1573;&#1605;&#1575;&#1585;&#1575;&#1578;</div>
      </div>
      <div class="pin"><span>&#9679;</span></div>
    </div>
  </div>

</body>
</html>`;
}

async function launchBrowser() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const puppeteer = await import("puppeteer-core");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromium = (await import("@sparticuz/chromium")).default as any;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  const puppeteer = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
}

async function renderHtmlToPdf(html: string, scale = 1): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      scale,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateCollectionPDF(
  data: GoodsCollectionNote,
  qrDataUrl?: string,
  logoDataUrl?: string,
): Promise<Buffer> {
  const html = buildPdfHtml(data, qrDataUrl, logoDataUrl);
  return renderHtmlToPdf(html);
}

interface WarehouseReportNames {
  receivedBy?: string;
  submittedBy?: string;
  approvedBy?: string;
}

function buildWarehouseReportHtml(
  data: GoodsCollectionNote,
  names: WarehouseReportNames,
  logoDataUrl?: string,
): string {
  const fmt = (d?: string) => (d ? format(new Date(d), "d MMM yyyy, h:mm a") : "&#8211;");

  const reportStatusBlock = (() => {
    switch (data.warehouse_report_status) {
      case "approved":
        return `<div class="wr-status wr-status-approved">APPROVED</div>
          <div class="wr-row"><span class="wr-label">Approved By</span><span class="wr-val">${esc(names.approvedBy) || "&#8211;"}</span></div>
          <div class="wr-row"><span class="wr-label">Approved At</span><span class="wr-val">${fmt(data.warehouse_report_approved_at)}</span></div>`;
      case "rejected":
        return `<div class="wr-status wr-status-rejected">REJECTED &#8211; PENDING CORRECTION</div>
          <div class="wr-row"><span class="wr-label">Reason</span><span class="wr-val">${esc(data.warehouse_report_rejection_reason) || "&#8211;"}</span></div>`;
      case "submitted":
        return `<div class="wr-status wr-status-pending">PENDING APPROVAL</div>`;
      default:
        return `<div class="wr-status wr-status-pending">NOT YET SUBMITTED</div>`;
    }
  })();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #222;
    width: 210mm;
    padding: 0;
  }
  .wr-lh {
    display: flex;
    align-items: center;
    padding: 14px 20px;
    background: white;
    border-bottom: 2.5px solid ${ORANGE};
  }
  .wr-lh img { height: 42px; width: auto; object-fit: contain; margin-right: 14px; }
  .wr-lh-title { font-size: 13pt; font-weight: 900; color: ${NAVY}; }
  .wr-lh-sub { font-size: 8pt; color: #888; margin-top: 1px; }
  .wr-badge-row { display: flex; justify-content: flex-end; padding: 10px 20px 0; }
  .wr-badge {
    background: ${ORANGE}; color: white; font-size: 11pt; font-weight: 900;
    padding: 6px 20px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .wr-body { padding: 10px 20px 20px; }
  .wr-section { margin-top: 14px; border: 1.5px solid ${BORDER}; border-radius: 6px; overflow: hidden; }
  .wr-section-hdr {
    background: ${HDR_BG}; padding: 6px 10px; font-size: 8.5pt; font-weight: 800;
    color: ${NAVY}; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid ${BORDER};
  }
  .wr-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #F0F0F0; font-size: 9pt; }
  .wr-row:last-child { border-bottom: none; }
  .wr-label { color: #666; }
  .wr-val { color: #111; font-weight: 700; text-align: right; }
  .wr-status { font-size: 10pt; font-weight: 900; padding: 8px 12px; letter-spacing: 0.4px; }
  .wr-status-approved { background: #ECFDF5; color: #065F46; }
  .wr-status-rejected { background: #FEF2F2; color: #991B1B; }
  .wr-status-pending { background: ${LIGHT_ORANGE}; color: ${ORANGE}; }
  .wr-goods-img { max-width: 160px; max-height: 110px; object-fit: cover; border-radius: 4px; margin: 10px 12px; display: block; }
  .wr-notes { padding: 8px 12px; font-size: 8.5pt; color: #444; line-height: 1.4; }
  .wr-footer { background: ${NAVY}; padding: 10px 20px; text-align: center; font-size: 7.5pt; color: #AAA; margin-top: 20px; }
</style>
</head>
<body>
  <div class="wr-lh">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="YASAI">` : ""}
    <div>
      <div class="wr-lh-title">YASAI LOGISTICS COMPANY</div>
      <div class="wr-lh-sub">Freight &amp; Logistics Solutions</div>
    </div>
  </div>
  <div class="wr-badge-row"><div class="wr-badge">Warehouse Receiving Report</div></div>

  <div class="wr-body">
    <div class="wr-section">
      <div class="wr-section-hdr">${headerIcon("&#128196;")} Goods Collection Reference</div>
      <div class="wr-row"><span class="wr-label">Document No.</span><span class="wr-val">${esc(data.collection_number)}</span></div>
      <div class="wr-row"><span class="wr-label">Shipper</span><span class="wr-val">${esc(data.shipper_name)}</span></div>
      <div class="wr-row"><span class="wr-label">Consignee</span><span class="wr-val">${esc(data.consignee_name)}</span></div>
      <div class="wr-row"><span class="wr-label">Commodity</span><span class="wr-val">${esc(data.commodity)}</span></div>
      <div class="wr-row"><span class="wr-label">Destination</span><span class="wr-val">${esc(data.destination)}</span></div>
      <div class="wr-row"><span class="wr-label">Packages / Volume / Weight</span><span class="wr-val">${esc(data.num_packages) || "&#8211;"} &nbsp;/&nbsp; ${data.volume_cbm ? Number(data.volume_cbm).toFixed(2) : "&#8211;"} CBM &nbsp;/&nbsp; ${data.weight_kg ? Number(data.weight_kg).toFixed(2) : "&#8211;"} KGS</span></div>
    </div>

    <div class="wr-section">
      <div class="wr-section-hdr">${headerIcon("&#127974;")} Warehouse Receiving Details</div>
      <div class="wr-row"><span class="wr-label">Received By</span><span class="wr-val">${esc(names.receivedBy) || "&#8211;"}</span></div>
      <div class="wr-row"><span class="wr-label">Received At</span><span class="wr-val">${fmt(data.warehouse_received_at)}</span></div>
      <div class="wr-row"><span class="wr-label">Storage Location</span><span class="wr-val">${esc(data.storage_location) || "&#8211;"}</span></div>
      <div class="wr-row"><span class="wr-label">Palletized</span><span class="wr-val">${data.palletized ? "Yes" : "No"}</span></div>
      ${data.goods_image_url ? `<img src="${data.goods_image_url}" class="wr-goods-img" alt="Goods">` : ""}
    </div>

    <div class="wr-section">
      <div class="wr-section-hdr">${headerIcon("&#9997;")} Report Status</div>
      ${reportStatusBlock}
      <div class="wr-row"><span class="wr-label">Submitted By</span><span class="wr-val">${esc(names.submittedBy) || "&#8211;"}</span></div>
      <div class="wr-row"><span class="wr-label">Submitted At</span><span class="wr-val">${fmt(data.warehouse_report_submitted_at)}</span></div>
      ${data.warehouse_report_notes ? `<div class="wr-notes"><strong>Notes:</strong> ${esc(data.warehouse_report_notes)}</div>` : ""}
    </div>
  </div>

  <div class="wr-footer">YASAI LOGISTICS COMPANY &nbsp;&#8211;&nbsp; Trusted Name in Cargo Consolidation</div>
</body>
</html>`;
}

export async function generateWarehouseReportPDF(
  data: GoodsCollectionNote,
  names: WarehouseReportNames,
  logoDataUrl?: string,
): Promise<Buffer> {
  const html = buildWarehouseReportHtml(data, names, logoDataUrl);
  return renderHtmlToPdf(html);
}

/* ═══════════════════════════════════════════════════════
   DELIVERY NOTE PDF
   ═══════════════════════════════════════════════════════ */

function buildDeliveryNoteHtml(dn: DeliveryNote, logoDataUrl?: string): string {
  const fmtDate = (d?: string | null) => {
    if (!d) return "&#8211;";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
  };

  const TOTAL_ROWS = 10;
  const items: DeliveryNoteItem[] = Array.isArray(dn.items) ? dn.items : [];
  const emptyRowsNeeded = Math.max(0, TOTAL_ROWS - items.length);

  const itemRows = items.map((it, i) => `
    <tr>
      <td class="dn-td dn-center" style="width:5%">${i + 1}</td>
      <td class="dn-td">${esc(it.item_description)}</td>
      <td class="dn-td dn-center" style="width:8%">${esc(it.qty)}</td>
      <td class="dn-td dn-center" style="width:9%">${esc(it.unit)}</td>
      <td class="dn-td dn-center" style="width:12%">${esc(it.total_pallets)}</td>
      <td class="dn-td" style="width:17%">${esc(it.remark)}</td>
    </tr>`).join("");

  const emptyRows = Array.from({ length: emptyRowsNeeded }, () => `
    <tr style="height:20px">
      <td class="dn-td"></td>
      <td class="dn-td"></td>
      <td class="dn-td"></td>
      <td class="dn-td"></td>
      <td class="dn-td"></td>
      <td class="dn-td"></td>
    </tr>`).join("");

  const infoRow = (label: string, value: string | null) =>
    `<div class="dn-info-row">
      <span class="dn-info-label">${label}</span>
      <span class="dn-info-val">${value ? esc(value) : "&#8211;"}</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #111;
    background: white;
    height: 297mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── LETTERHEAD ── */
  .lh {
    display: flex;
    align-items: center;
    padding: 8px 14px 6px;
    border-bottom: 2.5px solid ${ORANGE};
    background: white;
    flex-shrink: 0;
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
  .lh-center { flex: 1; padding: 0 14px; }
  .lh-title-en { font-size: 12pt; font-weight: 900; color: ${NAVY}; letter-spacing: 0.5px; }
  .lh-subtitle { font-size: 7pt; color: #888; margin-top: 1px; }
  .lh-ar { font-size: 10pt; font-weight: bold; color: ${NAVY}; direction: rtl; text-align: right; min-width: 160px; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }

  /* ── CONTACT ROW ── */
  .contact-row {
    display: flex; align-items: center; padding: 3px 14px;
    background: white; gap: 14px; font-size: 6pt; color: #666;
    border-bottom: 1px solid #eee; flex-shrink: 0;
  }
  .contact-row .ci { display: flex; align-items: center; gap: 3px; }
  .ci-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 12px; height: 12px; background: ${ORANGE}; border-radius: 50%;
    color: white; font-size: 7px; flex-shrink: 0;
  }
  .web-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 12px; height: 12px; background: ${NAVY}; border-radius: 50%;
    color: white; font-size: 7px; flex-shrink: 0;
  }

  /* ── BADGE ── */
  .badge-row {
    display: flex; justify-content: flex-end;
    padding: 0 14px; margin-top: -18px; position: relative; z-index: 2;
    flex-shrink: 0;
  }
  .doc-badge {
    background: ${ORANGE}; color: white; font-size: 9.5pt; font-weight: 900;
    padding: 5px 18px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;
  }

  /* ── CONTENT ── */
  .dn-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 8px 14px 6px;
    gap: 6px;
    overflow: hidden;
  }

  /* ── TOP INFO ROW ── */
  .dn-top-grid {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  /* Customer card */
  .dn-cust-card {
    flex: 1.4;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
  }
  .dn-card-hdr {
    background: ${NAVY};
    color: white;
    font-size: 6.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 3px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .dn-card-body { padding: 6px 8px; }
  .dn-cust-name { font-size: 10pt; font-weight: 900; color: ${NAVY}; margin-bottom: 3px; }
  .dn-cust-line { font-size: 7.5pt; color: #444; line-height: 1.6; }

  /* Doc details card */
  .dn-doc-card {
    flex: 1;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
  }
  .dn-info-row {
    display: flex;
    align-items: baseline;
    padding: 2.5px 8px;
    border-bottom: 1px solid ${BORDER};
    gap: 4px;
  }
  .dn-info-row:last-child { border-bottom: none; }
  .dn-info-label {
    font-size: 6.5pt;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 68px;
    flex-shrink: 0;
  }
  .dn-info-val { font-size: 8pt; font-weight: 600; color: ${NAVY}; }

  /* Notes card */
  .dn-notes-card {
    flex: 0.7;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
  }
  .dn-notes-body { padding: 6px 8px; font-size: 7.5pt; color: #444; line-height: 1.5; }

  /* ── ITEMS TABLE ── */
  .dn-table-wrap {
    flex: 1;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
  }
  .dn-table {
    width: 100%;
    border-collapse: collapse;
  }
  .dn-th {
    background: ${NAVY};
    color: white;
    font-size: 7pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding: 5px 6px;
    text-align: center;
    border-right: 1px solid rgba(255,255,255,0.15);
  }
  .dn-th:first-child { text-align: center; }
  .dn-th:nth-child(2) { text-align: left; }
  .dn-td {
    border: 1px solid ${BORDER};
    padding: 4px 6px;
    font-size: 8pt;
    vertical-align: top;
    color: #222;
  }
  .dn-center { text-align: center; }
  tr:nth-child(even) .dn-td { background: ${HDR_BG}; }

  /* ── RECEIVER SIGN-OFF ── */
  .dn-signoff {
    flex-shrink: 0;
    border: 1.5px solid ${BORDER};
    border-radius: 6px;
    overflow: hidden;
  }
  .dn-signoff-hdr {
    background: ${LIGHT_ORANGE};
    border-bottom: 1.5px solid ${ORANGE};
    padding: 4px 10px;
    font-size: 7.5pt;
    font-weight: 700;
    color: ${NAVY};
  }
  .dn-signoff-body {
    display: flex;
    padding: 8px 10px 10px;
    gap: 0;
  }
  .dn-sig-block { flex: 1; font-size: 8pt; color: #444; }
  .dn-sig-line {
    display: block;
    border-bottom: 1px solid #999;
    margin-top: 16px;
    margin-right: 20px;
  }
  .dn-sig-label { font-size: 7pt; color: #888; margin-top: 3px; }

  /* ── FOOTER ── */
  .dn-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${NAVY};
    padding: 6px 14px;
    flex-shrink: 0;
  }
  .dn-footer-left { display: flex; align-items: center; gap: 6px; }
  .dn-footer-right { display: flex; align-items: center; gap: 6px; }
  .pin {
    width: 18px; height: 18px; border-radius: 50%;
    border: 1.5px solid ${ORANGE};
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .pin span { font-size: 10px; color: ${ORANGE}; }
  .f-co-en { font-size: 7pt; font-weight: bold; color: white; }
  .f-ad-en { font-size: 5.5pt; color: #AAA; line-height: 1.4; margin-top: 1px; }
  .f-co-ar { font-size: 8pt; font-weight: bold; color: white; text-align: right; direction: rtl; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
  .f-ad-ar { font-size: 5.5pt; color: #AAA; text-align: right; direction: rtl; line-height: 1.4; margin-top: 1px; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }

  /* Doc ref strip */
  .dn-doc-ref {
    display: flex;
    justify-content: space-between;
    background: ${HDR_BG};
    padding: 2px 14px;
    font-size: 6.5pt;
    color: #666;
    flex-shrink: 0;
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
    <div class="lh-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1575;&#1578;</div>
  </div>

  <!-- CONTACT ROW -->
  <div class="contact-row">
    <div class="ci"><span class="ci-icon"><svg width="7" height="7" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="3.5" r="2" fill="white"/><path d="M1 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg></span> H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
    <div class="ci"><span class="ci-icon"><svg width="7" height="7" viewBox="0 0 10 10" fill="white"><path d="M2 1.5h1.5l.8 2-1.2.8a6 6 0 002.6 2.6l.8-1.2 2 .8V9a.5.5 0 01-.5.5C3.4 9.5.5 6.6.5 3A.5.5 0 011 2.5L2 1.5z"/></svg></span> +966 55 932 6687</div>
    <div class="ci"><span class="ci-icon"><svg width="7" height="7" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="2.5" width="9" height="6" rx="1" stroke="white" stroke-width="1"/><path d="M0.5 3l4.5 3 4.5-3" stroke="white" stroke-width="1" stroke-linecap="round"/></svg></span> info@yasailogistics.com</div>
    <div class="ci"><span class="web-icon"><svg width="7" height="7" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="white" stroke-width="1"/><path d="M5 1c-1.5 1.5-2 2.5-2 4s.5 2.5 2 4" stroke="white" stroke-width="0.8"/><path d="M5 1c1.5 1.5 2 2.5 2 4s-.5 2.5-2 4" stroke="white" stroke-width="0.8"/><line x1="1.2" y1="5" x2="8.8" y2="5" stroke="white" stroke-width="0.8"/></svg></span> www.yasailogistics.com</div>
  </div>

  <!-- BADGE -->
  <div class="badge-row">
    <div class="doc-badge">Delivery Note</div>
  </div>

  <!-- CONTENT -->
  <div class="dn-content">

    <!-- Top: Customer + Doc Info + Notes -->
    <div class="dn-top-grid">

      <!-- Customer card -->
      <div class="dn-cust-card">
        <div class="dn-card-hdr"><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:rgba(255,255,255,0.15);border-radius:50%;flex-shrink:0;margin-right:5px;"><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="3.5" r="2" fill="white"/><path d="M1 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg></span> Customer Details</div>
        <div class="dn-card-body">
          <div class="dn-cust-name">${esc(dn.customer_name) || "&#8211;"}</div>
          ${dn.customer_address ? `<div class="dn-cust-line">${esc(dn.customer_address).replace(/\n/g, "<br>")}</div>` : ""}
          ${dn.customer_phone ? `<div class="dn-cust-line">Tel: ${esc(dn.customer_phone)}</div>` : ""}
          ${dn.customer_email ? `<div class="dn-cust-line">Email: ${esc(dn.customer_email)}</div>` : ""}
        </div>
      </div>

      <!-- Doc details card -->
      <div class="dn-doc-card">
        <div class="dn-card-hdr"><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:rgba(255,255,255,0.15);border-radius:50%;flex-shrink:0;margin-right:5px;"><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="0.5" width="7" height="9" rx="1" stroke="white" stroke-width="1"/><line x1="3.5" y1="3.5" x2="6.5" y2="3.5" stroke="white" stroke-width="0.9"/><line x1="3.5" y1="5.5" x2="6.5" y2="5.5" stroke="white" stroke-width="0.9"/><line x1="3.5" y1="7.5" x2="5.5" y2="7.5" stroke="white" stroke-width="0.9"/></svg></span> Document Info</div>
        ${infoRow("Date", fmtDate(dn.doc_date))}
        ${infoRow("Doc No", dn.doc_number)}
        ${infoRow("Job", dn.job_number)}
        ${infoRow("Shipper", dn.shipper)}
        ${infoRow("Ref", dn.ref_number)}
        ${infoRow("Destination", dn.destination)}
      </div>

      <!-- Notes card -->
      <div class="dn-notes-card">
        <div class="dn-card-hdr"><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:rgba(255,255,255,0.15);border-radius:50%;flex-shrink:0;margin-right:5px;"><svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 7.5L6.5 2.5 8 4 3 9 1.5 9z" stroke="white" stroke-width="0.9" stroke-linejoin="round"/><line x1="5.5" y1="3.5" x2="7" y2="5" stroke="white" stroke-width="0.9"/></svg></span> Remarks</div>
        <div class="dn-notes-body">${dn.notes ? esc(dn.notes).replace(/\n/g, "<br>") : "&#8211;"}</div>
      </div>

    </div>

    <!-- Items table -->
    <div class="dn-table-wrap">
      <table class="dn-table">
        <thead>
          <tr>
            <th class="dn-th" style="width:5%">No</th>
            <th class="dn-th" style="text-align:left">Item Description</th>
            <th class="dn-th" style="width:8%">QTY</th>
            <th class="dn-th" style="width:9%">UNIT</th>
            <th class="dn-th" style="width:12%">TOTAL<br>PALLETS</th>
            <th class="dn-th" style="width:17%;text-align:left">REMARK</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${emptyRows}
        </tbody>
      </table>
    </div>

    <!-- Receiver sign-off -->
    <div class="dn-signoff">
      <div class="dn-signoff-hdr">The above goods received in good condition</div>
      <div class="dn-signoff-body">
        <div class="dn-sig-block">
          <div class="dn-sig-line"></div>
          <div class="dn-sig-label">Receiver's Name</div>
        </div>
        <div class="dn-sig-block">
          <div class="dn-sig-line"></div>
          <div class="dn-sig-label">Signature</div>
        </div>
        <div class="dn-sig-block">
          <div class="dn-sig-line"></div>
          <div class="dn-sig-label">Date</div>
        </div>
      </div>
    </div>

  </div>

  <!-- DOC REF STRIP -->
  <div class="dn-doc-ref">
    <span>Doc No: YSI-KSA-WMS-FRM-03</span>
    <span>Rev No. 00</span>
  </div>

  <!-- FOOTER -->
  <div class="dn-footer">
    <div class="dn-footer-left">
      <div class="pin"><span>&#9679;</span></div>
      <div>
        <div class="f-co-en">YASAI LOGISTICS COMPANY</div>
        <div class="f-ad-en">H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
      </div>
    </div>
    <div class="dn-footer-right">
      <div>
        <div class="f-co-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1577;</div>
        <div class="f-ad-ar">&#1607;&#1607; &#1575;&#1604;&#1588;&#1610;&#1582; &#1587;&#1593;&#1608;&#1583; &#1576;&#1606; &#1589;&#1602;&#1585;&#1548; &#1575;&#1604;&#1605;&#1578;&#1610;&#1606;&#1577;&#1548; &#1583;&#1576;&#1610; &#8211; &#1575;&#1604;&#1573;&#1605;&#1575;&#1585;&#1575;&#1578;</div>
      </div>
      <div class="pin"><span>&#9679;</span></div>
    </div>
  </div>

</body>
</html>`;
}

export async function generateDeliveryNotePDF(dn: DeliveryNote, logoDataUrl?: string): Promise<Buffer> {
  const html = buildDeliveryNoteHtml(dn, logoDataUrl);
  return renderHtmlToPdf(html);
}

function buildPackingListHtml(job: JobOrder, gcns: GoodsCollectionNote[], logoDataUrl?: string): string {
  const fmtDate = (d?: string | null) => {
    if (!d) return "&#8211;";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
  };

  const totalWeight = gcns.reduce((s, g) => s + (g.weight_kg ?? 0), 0);
  const totalCbm = gcns.reduce((s, g) => s + (g.volume_cbm ?? 0), 0);
  const MAX_WEIGHT = 24000;
  const MAX_CBM = 45;
  const weightPct = Math.min(100, Math.round((totalWeight / MAX_WEIGHT) * 100));
  const cbmPct = Math.min(100, Math.round((totalCbm / MAX_CBM) * 100));

  const gcnRows = gcns.map((g, i) => `
    <tr>
      <td class="td ctr">${i + 1}</td>
      <td class="td">${esc(g.consignee_name)}</td>
      <td class="td">${esc(g.commodity)}</td>
      <td class="td ctr">${esc(g.num_packages ?? "")}</td>
      <td class="td ctr">${g.weight_kg != null ? g.weight_kg.toFixed(2) : "&#8211;"}</td>
      <td class="td ctr">${g.volume_cbm != null ? g.volume_cbm.toFixed(3) : "&#8211;"}</td>
      <td class="td">${esc(g.storage_location ?? "")}</td>
      <td class="td">${esc(g.collection_number)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 landscape; margin: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #111;
    background: white;
    width: 297mm;
    height: 210mm;
    display: flex;
    flex-direction: row;
    overflow: hidden;
  }
  .stripe {
    width: 28px; background: ${ORANGE}; display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start; flex-shrink: 0; padding-top: 14px;
  }
  .stripe-logo { width: 22px; height: 22px; margin-bottom: 10px; }
  .stripe-logo img { width: 100%; height: 100%; object-fit: contain; }
  .stripe-text {
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 9.5pt; font-weight: 900; color: white;
    letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; margin-top: 8px;
  }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .hdr { background: ${NAVY}; padding: 7px 14px 5px; flex-shrink: 0; }
  .hdr-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .hdr-company { font-size: 11pt; font-weight: 900; color: white; }
  .hdr-sub { font-size: 6.5pt; color: rgba(255,255,255,0.6); margin-top: 1px; }
  .hdr-ar { font-size: 8.5pt; font-weight: bold; color: rgba(255,255,255,0.85); direction: rtl; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
  .hdr-contact { display: flex; gap: 14px; font-size: 5.5pt; color: rgba(255,255,255,0.6); border-top: 1px solid rgba(255,255,255,0.12); padding-top: 3px; }
  .hdr-ci { display: flex; align-items: center; gap: 3px; }
  .hdr-dot { width: 9px; height: 9px; border-radius: 50%; background: ${ORANGE}; display: inline-flex; align-items: center; justify-content: center; font-size: 5px; color: white; flex-shrink: 0; }
  .title-row { display: flex; align-items: stretch; border-bottom: 3px solid ${ORANGE}; flex-shrink: 0; }
  .doc-title { flex: 1; padding: 6px 14px; font-size: 16pt; font-weight: 900; color: ${NAVY}; letter-spacing: 1px; text-transform: uppercase; }
  .doc-meta { display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding: 6px 14px; gap: 2px; border-left: 2px solid ${ORANGE}; background: #fffaf6; min-width: 220px; }
  .doc-meta-row { display: flex; gap: 8px; align-items: baseline; }
  .doc-meta-lbl { font-size: 6pt; color: #999; text-transform: uppercase; letter-spacing: 0.4px; }
  .doc-meta-val { font-size: 8.5pt; font-weight: 800; color: ${NAVY}; }
  .body { flex: 1; display: flex; flex-direction: column; padding: 8px 14px 6px; gap: 7px; overflow: hidden; }
  .cap-row { display: flex; gap: 16px; flex-shrink: 0; }
  .cap-block { flex: 1; }
  .cap-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #888; margin-bottom: 2px; }
  .cap-bar-bg { background: #e5e7eb; border-radius: 3px; height: 6px; overflow: hidden; }
  .cap-bar-fill { height: 100%; border-radius: 3px; }
  .cap-val { font-size: 7pt; color: #555; margin-top: 2px; }
  .tbl-wrap { flex: 1; border: 1px solid ${BORDER}; overflow: hidden; }
  .tbl { width: 100%; border-collapse: collapse; }
  .th { background: ${NAVY}; color: white; font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; padding: 5px 7px; text-align: center; border-right: 1px solid rgba(255,255,255,0.12); }
  .th:nth-child(2), .th:nth-child(3), .th:last-child { text-align: left; }
  .td { border: 1px solid ${BORDER}; padding: 4px 7px; font-size: 8pt; vertical-align: middle; color: #222; }
  .ctr { text-align: center; }
  .total-row .td { background: ${NAVY}; color: white; font-weight: 800; font-size: 8.5pt; }
  tr:nth-child(even) .td { background: #f9f9f9; }
  .total-row:nth-child(even) .td { background: ${NAVY}; }
  .sig-row { display: flex; gap: 20px; flex-shrink: 0; padding-top: 6px; border-top: 1px solid ${BORDER}; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1px solid #bbb; height: 18px; margin-bottom: 3px; }
  .sig-lbl { font-size: 6.5pt; color: #999; text-transform: uppercase; letter-spacing: 0.4px; }
  .doc-ref { display: flex; justify-content: space-between; padding: 2px 14px; font-size: 6pt; color: #aaa; border-top: 1px solid #eee; flex-shrink: 0; }
  .footer { display: flex; justify-content: space-between; align-items: center; background: ${NAVY}; padding: 5px 14px; flex-shrink: 0; }
  .f-left { display: flex; align-items: center; gap: 6px; }
  .f-right { display: flex; align-items: center; gap: 6px; }
  .fpin { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid ${ORANGE}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fpin span { font-size: 8px; color: ${ORANGE}; }
  .f-co { font-size: 6pt; font-weight: bold; color: white; }
  .f-ad { font-size: 4.5pt; color: #AAA; margin-top: 1px; }
  .f-ar { font-size: 6.5pt; font-weight: bold; color: white; text-align: right; direction: rtl; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
  .f-ad-ar { font-size: 4.5pt; color: #AAA; text-align: right; direction: rtl; margin-top: 1px; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
</style>
</head>
<body>

<div class="stripe">
  <div class="stripe-logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="">` : ""}</div>
  <div class="stripe-text">Packing List</div>
</div>

<div class="main">
  <div class="hdr">
    <div class="hdr-top">
      <div><div class="hdr-company">YASAI LOGISTICS COMPANY</div><div class="hdr-sub">Freight &amp; Logistics Solutions</div></div>
      <div class="hdr-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1575;&#1578;</div>
    </div>
    <div class="hdr-contact">
      <div class="hdr-ci"><span class="hdr-dot">&#9679;</span> H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
      <div class="hdr-ci"><span class="hdr-dot">&#9990;</span> +966 55 932 6687</div>
      <div class="hdr-ci"><span class="hdr-dot">&#9993;</span> info@yasailogistics.com</div>
      <div class="hdr-ci"><span class="hdr-dot">&#8853;</span> www.yasailogistics.com</div>
    </div>
  </div>

  <div class="title-row">
    <div class="doc-title">Packing List</div>
    <div class="doc-meta">
      <div class="doc-meta-row"><span class="doc-meta-lbl">Job No</span><span class="doc-meta-val">${esc(job.job_number)}</span></div>
      <div class="doc-meta-row"><span class="doc-meta-lbl">Destination</span><span class="doc-meta-val">${esc(job.destination)}</span></div>
      <div class="doc-meta-row"><span class="doc-meta-lbl">Departure</span><span class="doc-meta-val">${fmtDate(job.departure_date)}</span></div>
      <div class="doc-meta-row"><span class="doc-meta-lbl">Truck</span><span class="doc-meta-val">${esc(job.truck_number ?? "")}</span></div>
      <div class="doc-meta-row"><span class="doc-meta-lbl">Driver</span><span class="doc-meta-val">${esc(job.driver_name ?? "")}</span></div>
      <div class="doc-meta-row"><span class="doc-meta-lbl">Transporter</span><span class="doc-meta-val">${esc(job.transporter_name ?? "")}</span></div>
    </div>
  </div>

  <div class="body">
    <!-- Capacity bars -->
    <div class="cap-row">
      <div class="cap-block">
        <div class="cap-label">Weight: ${totalWeight.toFixed(1)} kg / 24,000 kg (${weightPct}%)</div>
        <div class="cap-bar-bg"><div class="cap-bar-fill" style="width:${weightPct}%;background:${weightPct >= 90 ? "#E67A32" : "#22c55e"}"></div></div>
      </div>
      <div class="cap-block">
        <div class="cap-label">CBM: ${totalCbm.toFixed(3)} m³ / 45 m³ (${cbmPct}%)</div>
        <div class="cap-bar-bg"><div class="cap-bar-fill" style="width:${cbmPct}%;background:${cbmPct >= 90 ? "#E67A32" : "#22c55e"}"></div></div>
      </div>
    </div>

    <!-- Items table -->
    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th class="th" style="width:4%">No</th>
            <th class="th" style="width:18%">Consignee</th>
            <th class="th" style="width:16%">Commodity</th>
            <th class="th" style="width:7%">Packages</th>
            <th class="th" style="width:10%">Weight (kg)</th>
            <th class="th" style="width:9%">CBM</th>
            <th class="th" style="width:14%">Storage Location</th>
            <th class="th">GCN #</th>
          </tr>
        </thead>
        <tbody>
          ${gcnRows}
          <tr class="total-row">
            <td class="td" colspan="3"><strong>TOTAL</strong></td>
            <td class="td ctr"><strong>${gcns.length} GCN</strong></td>
            <td class="td ctr"><strong>${totalWeight.toFixed(2)}</strong></td>
            <td class="td ctr"><strong>${totalCbm.toFixed(3)}</strong></td>
            <td class="td" colspan="2"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sign-off -->
    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Warehouse Incharge — Loaded by</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Truck Driver — Received by</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Operations — Authorised by</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Date &amp; Time</div></div>
    </div>
  </div>

  <div class="doc-ref"><span>Packing List — ${esc(job.job_number)}</span><span>Generated ${format(new Date(), "dd/MM/yyyy HH:mm")}</span></div>

  <div class="footer">
    <div class="f-left">
      <div class="fpin"><span>&#9679;</span></div>
      <div><div class="f-co">YASAI LOGISTICS COMPANY</div><div class="f-ad">H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div></div>
    </div>
    <div class="f-right">
      <div><div class="f-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1577;</div><div class="f-ad-ar">&#1607;&#1607; &#1575;&#1604;&#1588;&#1610;&#1582; &#1587;&#1593;&#1608;&#1583; &#1576;&#1606; &#1589;&#1602;&#1585;&#1548; &#1583;&#1576;&#1610; &#8211; &#1575;&#1604;&#1573;&#1605;&#1575;&#1585;&#1575;&#1578;</div></div>
      <div class="fpin"><span>&#9679;</span></div>
    </div>
  </div>
</div>

</body>
</html>`;
}

export async function generatePackingListPDF(job: JobOrder, gcns: GoodsCollectionNote[], logoDataUrl?: string): Promise<Buffer> {
  const html = buildPackingListHtml(job, gcns, logoDataUrl);
  return renderHtmlToPdf(html);
}

// ══════════════════════════════════════════════════════════════
// INVOICE PDF (Stage 7 — Finance)
// ══════════════════════════════════════════════════════════════

function buildInvoiceHtml(invoice: Invoice, logoDataUrl?: string): string {
  const fmtDate = (d?: string | null) => {
    if (!d) return "&#8211;";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
  };

  const lineItems: InvoiceLineItem[] = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  const itemRows = lineItems.map((item, i) => `
    <tr>
      <td class="td ctr num">${i + 1}</td>
      <td class="td">${esc(item.description)}</td>
      <td class="td ctr">${item.qty}</td>
      <td class="td ctr">${invoice.currency} ${item.unit_price.toFixed(2)}</td>
      <td class="td ctr">${invoice.currency} ${item.amount.toFixed(2)}</td>
    </tr>`).join("");

  const emptyRows = Math.max(0, 5 - lineItems.length);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
    color: #111;
    background: white;
    width: 210mm;
    height: 297mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .lh { display: flex; align-items: center; padding: 10px 18px 8px; border-bottom: 2.5px solid ${ORANGE}; background: white; flex-shrink: 0; }
  .lh-logo { display: flex; align-items: center; padding-right: 14px; border-right: 2.5px solid ${ORANGE}; min-width: 70px; height: 46px; }
  .lh-logo img { height: 40px; width: auto; object-fit: contain; }
  .lh-center { flex: 1; padding: 0 14px; }
  .lh-title { font-size: 11pt; font-weight: 900; color: ${NAVY}; }
  .lh-sub { font-size: 6.5pt; color: #888; margin-top: 1px; }
  .lh-ar { font-size: 9pt; font-weight: bold; color: ${NAVY}; direction: rtl; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
  .contact-row { display: flex; align-items: center; padding: 3px 18px; gap: 14px; font-size: 5.5pt; color: #666; border-bottom: 1px solid #eee; flex-shrink: 0; }
  .ci { display: flex; align-items: center; gap: 3px; }
  .ci-dot { width: 10px; height: 10px; border-radius: 50%; background: ${ORANGE}; display: inline-flex; align-items: center; justify-content: center; font-size: 6px; color: white; flex-shrink: 0; }
  .inv-title-row { display: flex; align-items: stretch; background: ${NAVY}; padding: 10px 18px; flex-shrink: 0; }
  .inv-title { flex: 1; }
  .inv-title-main { font-size: 20pt; font-weight: 900; color: white; letter-spacing: 2px; }
  .inv-title-sub { font-size: 7.5pt; color: rgba(255,255,255,0.6); margin-top: 2px; letter-spacing: 1px; }
  .inv-meta { display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .inv-meta-row { display: flex; gap: 8px; align-items: baseline; }
  .inv-meta-lbl { font-size: 6.5pt; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.4px; min-width: 70px; }
  .inv-meta-val { font-size: 9pt; font-weight: 700; color: white; }
  .bill-row { display: flex; gap: 0; border: 1px solid ${BORDER}; margin: 10px 18px 0; flex-shrink: 0; }
  .bill-col { flex: 1; padding: 10px 14px; border-right: 1px solid ${BORDER}; }
  .bill-col:last-child { border-right: none; }
  .bill-label { font-size: 6.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${ORANGE}; border-bottom: 1px solid #ffe0c8; padding-bottom: 3px; margin-bottom: 6px; }
  .bill-name { font-size: 11pt; font-weight: 900; color: ${NAVY}; margin-bottom: 3px; }
  .bill-line { font-size: 8.5pt; color: #555; line-height: 1.65; }
  .body { flex: 1; display: flex; flex-direction: column; padding: 10px 18px 6px; gap: 8px; overflow: hidden; }
  .tbl-wrap { flex: 1; border: 1px solid ${BORDER}; overflow: hidden; }
  .tbl { width: 100%; border-collapse: collapse; }
  .th { background: ${NAVY}; color: white; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.12); letter-spacing: 0.4px; }
  .th:nth-child(2) { text-align: left; }
  .td { border: 1px solid ${BORDER}; padding: 5px 8px; font-size: 9pt; vertical-align: middle; }
  .ctr { text-align: center; }
  .num { font-size: 8pt; color: #999; }
  tr:nth-child(even) .td { background: #f9f9f9; }
  .totals { flex-shrink: 0; border: 1px solid ${BORDER}; align-self: flex-end; min-width: 260px; }
  .tot-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid ${BORDER}; font-size: 9pt; }
  .tot-row:last-child { border-bottom: none; }
  .tot-label { color: #666; }
  .tot-val { font-weight: 600; color: ${NAVY}; }
  .tot-grand { background: ${NAVY}; }
  .tot-grand .tot-label, .tot-grand .tot-val { color: white; font-weight: 800; font-size: 10pt; }
  .payment-box { flex-shrink: 0; padding: 8px 12px; background: #f8fafc; border: 1px solid ${BORDER}; font-size: 8pt; color: #555; line-height: 1.6; }
  .payment-title { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${NAVY}; margin-bottom: 4px; }
  .inv-footer-bar { display: flex; justify-content: space-between; padding: 3px 18px; font-size: 6.5pt; color: #aaa; border-top: 1px solid #eee; flex-shrink: 0; }
  .footer { display: flex; justify-content: space-between; align-items: center; background: ${NAVY}; padding: 6px 14px; flex-shrink: 0; }
  .f-left { display: flex; align-items: center; gap: 6px; }
  .f-right { display: flex; align-items: center; gap: 6px; }
  .fpin { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid ${ORANGE}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fpin span { font-size: 9px; color: ${ORANGE}; }
  .f-co { font-size: 6.5pt; font-weight: bold; color: white; }
  .f-ad { font-size: 5pt; color: #AAA; margin-top: 1px; }
  .f-ar { font-size: 7.5pt; font-weight: bold; color: white; text-align: right; direction: rtl; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
  .f-ad-ar { font-size: 5pt; color: #AAA; text-align: right; direction: rtl; margin-top: 1px; font-family: 'Noto Naskh Arabic', Arial, sans-serif; }
</style>
</head>
<body>

<!-- Letterhead -->
<div class="lh">
  <div class="lh-logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="YASAI">` : ""}</div>
  <div class="lh-center">
    <div class="lh-title">YASAI LOGISTICS COMPANY</div>
    <div class="lh-sub">Freight &amp; Logistics Solutions</div>
  </div>
  <div class="lh-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1575;&#1578;</div>
</div>
<div class="contact-row">
  <div class="ci"><span class="ci-dot">&#9679;</span> H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
  <div class="ci"><span class="ci-dot">&#9990;</span> +966 55 932 6687</div>
  <div class="ci"><span class="ci-dot">&#9993;</span> info@yasailogistics.com</div>
  <div class="ci"><span class="ci-dot">&#8853;</span> www.yasailogistics.com</div>
</div>

<!-- Invoice title + meta -->
<div class="inv-title-row">
  <div class="inv-title">
    <div class="inv-title-main">TAX INVOICE</div>
    <div class="inv-title-sub">YASAI LOGISTICS COMPANY — KSA &amp; UAE OPERATIONS</div>
  </div>
  <div class="inv-meta">
    <div class="inv-meta-row"><span class="inv-meta-lbl">Invoice No</span><span class="inv-meta-val">${esc(invoice.invoice_number)}</span></div>
    <div class="inv-meta-row"><span class="inv-meta-lbl">Issue Date</span><span class="inv-meta-val">${fmtDate(invoice.issued_at)}</span></div>
    <div class="inv-meta-row"><span class="inv-meta-lbl">Due Date</span><span class="inv-meta-val">${fmtDate(invoice.due_date)}</span></div>
    <div class="inv-meta-row"><span class="inv-meta-lbl">Currency</span><span class="inv-meta-val">${esc(invoice.currency)}</span></div>
  </div>
</div>

<!-- Bill To -->
<div class="bill-row">
  <div class="bill-col">
    <div class="bill-label">Bill To</div>
    <div class="bill-name">${esc(invoice.customer_name)}</div>
    ${invoice.customer_address ? `<div class="bill-line">${esc(invoice.customer_address).replace(/\n/g, "<br>")}</div>` : ""}
    ${invoice.customer_email ? `<div class="bill-line">${esc(invoice.customer_email)}</div>` : ""}
  </div>
  <div class="bill-col">
    <div class="bill-label">Bill From</div>
    <div class="bill-name">YASAI LOGISTICS COMPANY</div>
    <div class="bill-line">H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div>
    <div class="bill-line">info@yasailogistics.com &nbsp;|&nbsp; +966 55 932 6687</div>
  </div>
</div>

<!-- Body -->
<div class="body">
  <!-- Line items -->
  <div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th class="th" style="width:5%">No</th>
          <th class="th">Description</th>
          <th class="th" style="width:8%">QTY</th>
          <th class="th" style="width:16%">Unit Price</th>
          <th class="th" style="width:16%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${Array.from({ length: emptyRows }, () => `<tr style="height:24px"><td class="td"></td><td class="td"></td><td class="td"></td><td class="td"></td><td class="td"></td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals">
    <div class="tot-row"><span class="tot-label">Subtotal</span><span class="tot-val">${invoice.currency} ${invoice.subtotal.toFixed(2)}</span></div>
    ${invoice.tax_rate > 0 ? `<div class="tot-row"><span class="tot-label">VAT (${invoice.tax_rate}%)</span><span class="tot-val">${invoice.currency} ${invoice.tax_amount.toFixed(2)}</span></div>` : ""}
    <div class="tot-row tot-grand"><span class="tot-label">TOTAL DUE</span><span class="tot-val">${invoice.currency} ${invoice.total_amount.toFixed(2)}</span></div>
  </div>

  <!-- Payment instructions -->
  <div class="payment-box">
    <div class="payment-title">Payment Instructions</div>
    <div>${invoice.payment_notes || "Please transfer the total amount to the bank account details provided separately. Reference: " + esc(invoice.invoice_number)}</div>
  </div>
</div>

<div class="inv-footer-bar">
  <span>Invoice No: ${esc(invoice.invoice_number)}</span>
  <span>This is a computer-generated document. No signature required.</span>
  <span>Generated ${format(new Date(), "dd/MM/yyyy")}</span>
</div>

<div class="footer">
  <div class="f-left">
    <div class="fpin"><span>&#9679;</span></div>
    <div><div class="f-co">YASAI LOGISTICS COMPANY</div><div class="f-ad">H.H Shaikh Saud Bin Saqar, Al Muteena, Dubai &#8211; UAE</div></div>
  </div>
  <div class="f-right">
    <div><div class="f-ar">&#1588;&#1585;&#1603;&#1577; &#1610;&#1575;&#1587;&#1575;&#1610; &#1604;&#1604;&#1608;&#1580;&#1587;&#1578;&#1610;&#1577;</div><div class="f-ad-ar">&#1607;&#1607; &#1575;&#1604;&#1588;&#1610;&#1582; &#1587;&#1593;&#1608;&#1583; &#1576;&#1606; &#1589;&#1602;&#1585;&#1548; &#1583;&#1576;&#1610; &#8211; &#1575;&#1604;&#1573;&#1605;&#1575;&#1585;&#1575;&#1578;</div></div>
    <div class="fpin"><span>&#9679;</span></div>
  </div>
</div>

</body>
</html>`;
}

export async function generateInvoicePDF(invoice: Invoice, logoDataUrl?: string): Promise<Buffer> {
  const html = buildInvoiceHtml(invoice, logoDataUrl);
  return renderHtmlToPdf(html);
}

// ── Waybill PDF ──────────────────────────────────────────────────

function buildWaybillHtml(wb: Waybill, logoDataUrl?: string): string {
  const logoTag = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:40px;object-fit:contain;" />`
    : `<div style="font-size:13pt;font-weight:800;color:${NAVY};">YASAI</div>`;

  const fmtD = (d?: string | null) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
  };

  const modeLabel = wb.mode_of_transport === "road" ? "Road"
    : wb.mode_of_transport === "air" ? "Air" : "Sea";

  const items: WaybillCargoItem[] = Array.isArray(wb.cargo_items) ? wb.cargo_items : [];

  // Pad to at least 6 rows so the table body fills the section
  const MIN_ROWS = 6;
  const padded = [...items];
  while (padded.length < MIN_ROWS) padded.push({});

  const cargoRows = padded.map((item) => `
    <tr>
      <td>${esc(item.truck_number)}</td>
      <td>${esc(item.seal_no)}</td>
      <td>${esc(item.invoice_number)}</td>
      <td>${esc(item.invoice_currency || (item.invoice_value ? "AED" : ""))}&nbsp;${esc(item.invoice_value)}</td>
      <td style="text-align:center;">${esc(item.num_packages)}</td>
      <td>${esc(item.description)}</td>
      <td>${esc(item.weight)}</td>
      <td>${esc(item.measurement)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 297mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #111;
    background: white;
  }
  .page {
    width: 210mm;
    height: 297mm;
    display: flex;
    flex-direction: column;
    padding: 6mm 7mm;
  }

  /* ── Header ── */
  .hdr {
    display: flex;
    align-items: stretch;
    border: 1.5px solid #222;
    flex-shrink: 0;
  }
  .hdr-logo {
    width: 48mm;
    border-right: 1.5px solid #222;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hdr-title {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5px 8px;
    border-right: 1.5px solid #222;
  }
  .hdr-title .dt { font-size: 13pt; font-weight: 800; color: ${NAVY}; letter-spacing: 0.3px; }
  .hdr-title .sub { font-size: 7pt; color: #666; margin-top: 1px; }
  .hdr-wb {
    width: 50mm;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
  }
  .hdr-wb .lbl { font-size: 6.5pt; color: #777; }
  .hdr-wb .num { font-size: 12pt; font-weight: 800; color: ${ORANGE}; letter-spacing: 0.5px; margin-top: 1px; }

  /* ── Info grid (Shipper | Consignee | Routing) ── */
  .info-row {
    display: flex;
    border: 1.5px solid #222;
    border-top: none;
    flex-shrink: 0;
  }
  .info-party {
    flex: 1.1;
    border-right: 1.5px solid #222;
    display: flex;
    flex-direction: column;
  }
  .info-party + .info-party { border-right: 1.5px solid #222; }
  .party-block {
    flex: 1;
    padding: 5px 7px;
    border-bottom: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .party-block:last-child { border-bottom: none; }
  .info-routing {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .r-cell {
    padding: 4px 7px;
    border-bottom: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
  }
  .r-cell:nth-child(2n) { border-right: none; }
  .r-cell:nth-last-child(-n+2) { border-bottom: none; }

  .lbl-sm { font-size: 6pt; text-transform: uppercase; letter-spacing: 0.4px; color: #888; margin-bottom: 1px; }
  .val { font-size: 8pt; font-weight: 600; color: ${NAVY}; }
  .val-lg { font-size: 8.5pt; font-weight: 700; color: ${NAVY}; }
  .val-sub { font-size: 7pt; color: #444; margin-top: 1px; white-space: pre-line; }
  .orange { color: ${ORANGE}; }

  /* ── Cargo table ── */
  .cargo-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    border: 1.5px solid #222;
    border-top: none;
    overflow: hidden;
  }
  .cargo-hdr {
    background: ${NAVY};
    color: white;
    font-size: 6.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 3px 7px;
    flex-shrink: 0;
  }
  .cargo-table-wrap { flex: 1; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 7.5pt; height: 100%; }
  thead tr { background: ${HDR_BG}; }
  thead th {
    padding: 4px 5px;
    text-align: left;
    font-size: 6.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #555;
    border-bottom: 1.5px solid #bbb;
    border-right: 1px solid #ddd;
  }
  thead th:last-child { border-right: none; }
  tbody { height: 100%; }
  tbody tr { height: 1%; } /* equal share */
  tbody td {
    padding: 4px 5px;
    border-bottom: 1px solid #eee;
    border-right: 1px solid #eee;
    vertical-align: top;
  }
  tbody td:last-child { border-right: none; }
  tbody tr:last-child td { border-bottom: none; }

  /* ── Footer info row ── */
  .foot-row {
    display: flex;
    border: 1.5px solid #222;
    border-top: none;
    flex-shrink: 0;
  }
  .foot-cell {
    flex: 1;
    padding: 4px 6px;
    border-right: 1px solid #ddd;
  }
  .foot-cell:last-child { border-right: none; }

  /* ── Signature strip ── */
  .sig-row {
    display: flex;
    border: 1.5px solid #222;
    border-top: none;
    flex-shrink: 0;
  }
  .sig-cell {
    flex: 1;
    padding: 5px 7px 5px;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 18mm;
  }
  .sig-cell:last-child { border-right: none; }
  .sig-lbl { font-size: 6.5pt; color: #555; }
  .sig-line { border-top: 1px solid #555; margin-top: auto; padding-top: 2px; }
  .sig-note { font-size: 5.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ── Terms + bottom bar ── */
  .terms {
    text-align: center;
    font-size: 6pt;
    color: #555;
    padding: 3px 0;
    border: 1.5px solid #222;
    border-top: none;
    flex-shrink: 0;
    font-style: italic;
  }
  .bot {
    background: ${NAVY};
    color: white;
    text-align: center;
    font-size: 6.5pt;
    padding: 4px 0;
    border: 1.5px solid ${NAVY};
    border-top: none;
    flex-shrink: 0;
    letter-spacing: 0.2px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── Header ── -->
  <div class="hdr">
    <div class="hdr-logo">${logoTag}</div>
    <div class="hdr-title">
      <div class="dt">SHIPMENT WAYBILL</div>
      <div class="sub">(Non-Negotiable)</div>
    </div>
    <div class="hdr-wb">
      <div class="lbl">Way Bill Number</div>
      <div class="num">${esc(wb.waybill_number)}</div>
    </div>
  </div>

  <!-- ── Parties + Routing ── -->
  <div class="info-row">
    <!-- Shipper -->
    <div class="info-party" style="max-width:54mm;">
      <div class="party-block" style="min-height:22mm;">
        <div class="lbl-sm">Shipper</div>
        <div class="val-lg">${esc(wb.shipper_name)}</div>
        ${wb.shipper_address ? `<div class="val-sub">${esc(wb.shipper_address)}</div>` : ""}
      </div>
    </div>
    <!-- Consignee -->
    <div class="info-party" style="max-width:54mm;">
      <div class="party-block" style="min-height:22mm;">
        <div class="lbl-sm">Consignee</div>
        <div class="val-lg">${esc(wb.consignee_name)}</div>
        ${wb.consignee_address ? `<div class="val-sub">${esc(wb.consignee_address)}</div>` : ""}
      </div>
    </div>
    <!-- Routing details 2-column grid -->
    <div class="info-routing">
      <div class="r-cell">
        <div class="lbl-sm">Port of Loading</div>
        <div class="val">${esc(wb.port_of_loading || "—")}</div>
      </div>
      <div class="r-cell">
        <div class="lbl-sm">Port of Discharge</div>
        <div class="val">${esc(wb.port_of_discharge || "—")}</div>
      </div>
      <div class="r-cell">
        <div class="lbl-sm">Shipment Date</div>
        <div class="val">${fmtD(wb.shipment_date)}</div>
      </div>
      <div class="r-cell">
        <div class="lbl-sm">Mode of Transport</div>
        <div class="val">${esc(modeLabel)}</div>
      </div>
      <div class="r-cell">
        <div class="lbl-sm">Remarks</div>
        <div class="val">${esc(wb.remarks) || "—"}</div>
      </div>
      <div class="r-cell">
        <div class="lbl-sm">JOB Number</div>
        <div class="val orange">${esc(wb.job_number) || "—"}</div>
      </div>
      <div class="r-cell" style="grid-column:1/-1;border-bottom:none;">
        <div class="lbl-sm">Final Destination &nbsp;<span style="font-style:italic;font-weight:400;color:#888;">(for the merchant's reference only)</span></div>
        <div class="val">${esc(wb.final_destination) || "—"}</div>
      </div>
    </div>
  </div>

  <!-- ── Cargo ── -->
  <div class="cargo-section">
    <div class="cargo-hdr">Cargo Details</div>
    <div class="cargo-table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:11%;">Truck No.</th>
            <th style="width:10%;">Seal No &amp; Marks</th>
            <th style="width:13%;">Invoice No.</th>
            <th style="width:14%;">Invoice Value</th>
            <th style="width:9%;text-align:center;">No. of Pkg's</th>
            <th>Kind of Pkg's &amp; Description of Goods</th>
            <th style="width:10%;">Weight</th>
            <th style="width:10%;">Measurement</th>
          </tr>
        </thead>
        <tbody>
          ${cargoRows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Document footer info ── -->
  <div class="foot-row">
    <div class="foot-cell">
      <div class="lbl-sm">Prepared By</div>
      <div class="val">${esc(wb.prepared_by) || "—"}</div>
    </div>
    <div class="foot-cell">
      <div class="lbl-sm">Number of Originals</div>
      <div class="val">${esc(wb.num_originals ?? 1)} SET</div>
    </div>
    <div class="foot-cell" style="flex:1.4;">
      <div class="lbl-sm">For Delivery Please Contact</div>
      <div class="val">${esc(wb.delivery_contact) || "—"}</div>
    </div>
    <div class="foot-cell">
      <div class="lbl-sm">Place of Issue</div>
      <div class="val">${esc(wb.place_of_issue) || "—"}</div>
    </div>
    <div class="foot-cell">
      <div class="lbl-sm">Date</div>
      <div class="val">${fmtD(wb.issue_date || wb.shipment_date)}</div>
    </div>
  </div>

  <!-- ── Signature strip ── -->
  <div class="sig-row">
    <div class="sig-cell">
      <div class="sig-lbl">Shipper's Signature &amp; Stamp</div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-note">Authorized Signature</div>
      </div>
    </div>
    <div class="sig-cell">
      <div class="sig-lbl">Carrier's Signature &amp; Stamp</div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-note">Authorized Signature</div>
      </div>
    </div>
    <div class="sig-cell">
      <div class="sig-lbl">Consignee's Signature &amp; Stamp</div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-note">Authorized Signature</div>
      </div>
    </div>
  </div>

  <!-- ── Terms note ── -->
  <div class="terms">TERMS &amp; CONDITIONS CONTINUED ON BACK HEREOF</div>

  <!-- ── Bottom bar ── -->
  <div class="bot">
    YASAI Logistics Company &nbsp;|&nbsp; Tel: +966 55 932 6687 &nbsp;|&nbsp; info@yasailogistics.com &nbsp;|&nbsp; www.yasailogistics.com
  </div>

</div>
</body>
</html>`;
}

export async function generateWaybillPDF(waybill: Waybill, logoDataUrl?: string): Promise<Buffer> {
  const html = buildWaybillHtml(waybill, logoDataUrl);
  return renderHtmlToPdf(html);
}
