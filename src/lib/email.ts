import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");
  }
  return resendInstance;
}

interface SendCollectionEmailParams {
  to: string;
  collectionNumber: string;
  shipperName: string;
  consigneeName: string;
  pdfUrl: string;
  trackingUrl: string;
}

export async function sendCollectionEmail(params: SendCollectionEmailParams) {
  const { to, collectionNumber, shipperName, consigneeName, pdfUrl, trackingUrl } = params;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #071A3A; padding: 24px 32px; }
        .header-title { color: white; font-size: 22px; font-weight: bold; margin: 0; }
        .header-sub { color: #E67A32; font-size: 13px; letter-spacing: 2px; margin: 4px 0 0; }
        .body { padding: 32px; }
        .title { color: #071A3A; font-size: 20px; font-weight: bold; margin: 0 0 8px; }
        .number { color: #E67A32; font-size: 16px; font-weight: bold; }
        .details { background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { color: #666; font-size: 13px; }
        .value { color: #071A3A; font-size: 13px; font-weight: bold; }
        .btn { display: inline-block; background: #071A3A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 8px 8px 8px 0; }
        .btn-orange { background: #E67A32; }
        .footer { background: #071A3A; padding: 20px 32px; color: #ccc; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <p class="header-title">YASAI</p>
          <p class="header-sub">LOGISTICS</p>
        </div>
        <div class="body">
          <p class="title">Goods Collection Note</p>
          <p class="number">${collectionNumber}</p>
          <p style="color: #444; font-size: 14px; margin: 16px 0;">
            Please find attached your Goods Collection Note. You can also download the PDF or track your shipment using the links below.
          </p>
          <div class="details">
            <div class="row">
              <span class="label">Shipper</span>
              <span class="value">${shipperName}</span>
            </div>
            <div class="row">
              <span class="label">Consignee</span>
              <span class="value">${consigneeName}</span>
            </div>
            <div class="row">
              <span class="label">Collection #</span>
              <span class="value">${collectionNumber}</span>
            </div>
          </div>
          <a href="${pdfUrl}" class="btn">Download PDF</a>
          <a href="${trackingUrl}" class="btn btn-orange">Track Shipment</a>
        </div>
        <div class="footer">
          <p style="margin: 0;">YASAI LOGISTICS COMPANY</p>
          <p style="margin: 4px 0 0;">+966 55 932 6687 &nbsp;|&nbsp; info@yasailogistics.com &nbsp;|&nbsp; www.yasailogistics.com</p>
          <p style="margin: 4px 0 0;">H.H Shaikh Saud Bin Saqar, Al Muteena Dubai – UAE</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return getResendClient().emails.send({
    from: `${process.env.EMAIL_FROM_NAME || "YASAI Logistics"} <${process.env.EMAIL_FROM || "noreply@yasailogistics.com"}>`,
    to: [to],
    subject: `Goods Collection Note – ${collectionNumber}`,
    html,
  });
}

interface SendWarehouseReportEmailParams {
  to: string;
  type: "submitted" | "approved" | "rejected";
  collectionNumber: string;
  shipperName: string;
  consigneeName: string;
  reviewUrl: string;
  rejectionReason?: string;
}

const WAREHOUSE_REPORT_COPY: Record<
  SendWarehouseReportEmailParams["type"],
  { subject: string; title: string; message: string }
> = {
  submitted: {
    subject: "Warehouse Report Pending Approval",
    title: "Warehouse Receiving Report Submitted",
    message: "A warehouse receiving report has been submitted and is awaiting your review and approval.",
  },
  approved: {
    subject: "Warehouse Report Approved",
    title: "Warehouse Receiving Report Approved",
    message: "Your warehouse receiving report has been approved.",
  },
  rejected: {
    subject: "Warehouse Report Needs Correction",
    title: "Warehouse Receiving Report Rejected",
    message: "Your warehouse receiving report was rejected and needs correction before it can be resubmitted.",
  },
};

export async function sendWarehouseReportEmail(params: SendWarehouseReportEmailParams) {
  const { to, type, collectionNumber, shipperName, consigneeName, reviewUrl, rejectionReason } = params;
  const copy = WAREHOUSE_REPORT_COPY[type];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #071A3A; padding: 24px 32px; }
        .header-title { color: white; font-size: 22px; font-weight: bold; margin: 0; }
        .header-sub { color: #E67A32; font-size: 13px; letter-spacing: 2px; margin: 4px 0 0; }
        .body { padding: 32px; }
        .title { color: #071A3A; font-size: 20px; font-weight: bold; margin: 0 0 8px; }
        .number { color: #E67A32; font-size: 16px; font-weight: bold; }
        .details { background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { color: #666; font-size: 13px; }
        .value { color: #071A3A; font-size: 13px; font-weight: bold; }
        .reason { background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin: 16px 0; color: #991B1B; font-size: 13px; }
        .btn { display: inline-block; background: #071A3A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 8px 8px 8px 0; }
        .footer { background: #071A3A; padding: 20px 32px; color: #ccc; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <p class="header-title">YASAI</p>
          <p class="header-sub">LOGISTICS</p>
        </div>
        <div class="body">
          <p class="title">${copy.title}</p>
          <p class="number">${collectionNumber}</p>
          <p style="color: #444; font-size: 14px; margin: 16px 0;">${copy.message}</p>
          <div class="details">
            <div class="row">
              <span class="label">Shipper</span>
              <span class="value">${shipperName}</span>
            </div>
            <div class="row">
              <span class="label">Consignee</span>
              <span class="value">${consigneeName}</span>
            </div>
            <div class="row">
              <span class="label">Collection #</span>
              <span class="value">${collectionNumber}</span>
            </div>
          </div>
          ${rejectionReason ? `<div class="reason"><strong>Reason:</strong> ${rejectionReason}</div>` : ""}
          <a href="${reviewUrl}" class="btn">Review Collection</a>
        </div>
        <div class="footer">
          <p style="margin: 0;">YASAI LOGISTICS COMPANY</p>
          <p style="margin: 4px 0 0;">+966 55 932 6687 &nbsp;|&nbsp; info@yasailogistics.com &nbsp;|&nbsp; www.yasailogistics.com</p>
          <p style="margin: 4px 0 0;">H.H Shaikh Saud Bin Saqar, Al Muteena Dubai – UAE</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return getResendClient().emails.send({
    from: `${process.env.EMAIL_FROM_NAME || "YASAI Logistics"} <${process.env.EMAIL_FROM || "noreply@yasailogistics.com"}>`,
    to: [to],
    subject: `${copy.subject} – ${collectionNumber}`,
    html,
  });
}

// ── Job Approval Email ──────────────────────────────────────────

interface SendJobApprovalEmailParams {
  to: string;
  type: "submitted" | "approved" | "rejected";
  jobNumber: string;
  destination: string;
  reviewUrl: string;
  rejectionReason?: string;
}

const JOB_APPROVAL_COPY: Record<
  SendJobApprovalEmailParams["type"],
  { subject: string; title: string; message: string }
> = {
  submitted: {
    subject: "Job Order Pending GM Approval",
    title: "Job Order Submitted for Approval",
    message: "A new job order has been submitted and is awaiting your review and approval.",
  },
  approved: {
    subject: "Job Order Approved",
    title: "Job Order Approved by GM",
    message: "Your job order has been approved. Please proceed with the next steps.",
  },
  rejected: {
    subject: "Job Order Needs Revision",
    title: "Job Order Rejected",
    message: "The job order was rejected and needs revision before it can be resubmitted for approval.",
  },
};

export async function sendJobApprovalEmail(params: SendJobApprovalEmailParams) {
  const { to, type, jobNumber, destination, reviewUrl, rejectionReason } = params;
  const copy = JOB_APPROVAL_COPY[type];
  const NAVY = "#0B1F3F";
  const ORANGE = "#E67A32";

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0;">
    <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;overflow:hidden;">
      <tr><td style="background:${NAVY};padding:16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><p style="margin:0;font-size:16px;font-weight:bold;color:white;">YASAI LOGISTICS COMPANY</p>
              <p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.6);">Freight &amp; Logistics Solutions</p></td>
          <td align="right"><p style="margin:0;font-size:12px;font-weight:bold;color:${ORANGE};">${jobNumber}</p></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:24px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:${NAVY};">${copy.title}</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#666;">${copy.message}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;margin-bottom:16px;">
          <tr><td style="padding:12px 16px;">
            <table width="100%" cellpadding="4" cellspacing="0">
              <tr><td style="font-size:11px;color:#888;font-weight:bold;text-transform:uppercase;">Job Number</td><td style="font-size:13px;color:${NAVY};font-weight:bold;">${jobNumber}</td></tr>
              <tr><td style="font-size:11px;color:#888;font-weight:bold;text-transform:uppercase;">Destination</td><td style="font-size:13px;color:${NAVY};">${destination}</td></tr>
            </table>
          </td></tr>
        </table>
        ${rejectionReason ? `<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;padding:12px 16px;margin-bottom:16px;"><p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#DC2626;">Rejection Reason:</p><p style="margin:0;font-size:13px;color:#991B1B;">${rejectionReason}</p></div>` : ""}
        <a href="${reviewUrl}" style="display:inline-block;background:${ORANGE};color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;font-size:13px;">Review Job Order</a>
      </td></tr>
      <tr><td style="background:${NAVY};padding:12px 24px;text-align:center;">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);">YASAI LOGISTICS COMPANY — info@yasailogistics.com — +966 55 932 6687</p>
      </td></tr>
    </table>
    </td></tr></table>
    </body></html>
  `;

  return getResendClient().emails.send({
    from: `${process.env.EMAIL_FROM_NAME || "YASAI Logistics"} <${process.env.EMAIL_FROM || "noreply@yasailogistics.com"}>`,
    to: [to],
    subject: `${copy.subject} – ${jobNumber}`,
    html,
  });
}

// ── Invoice Email ───────────────────────────────────────────────

interface SendInvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  dueDate?: string | null;
  invoiceUrl: string;
  pdfBuffer?: Buffer;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams) {
  const { to, invoiceNumber, customerName, totalAmount, currency, dueDate, invoiceUrl } = params;
  const NAVY = "#0B1F3F";
  const ORANGE = "#E67A32";

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Upon receipt";

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0;">
    <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;overflow:hidden;">
      <tr><td style="background:${NAVY};padding:16px 24px;">
        <p style="margin:0;font-size:16px;font-weight:bold;color:white;">YASAI LOGISTICS COMPANY</p>
        <p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.6);">Freight &amp; Logistics Solutions</p>
      </td></tr>
      <tr><td style="padding:24px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:${NAVY};">Invoice ${invoiceNumber}</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#666;">Dear ${customerName}, please find your invoice details below.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;margin-bottom:16px;">
          <tr><td style="padding:12px 16px;">
            <table width="100%" cellpadding="4" cellspacing="0">
              <tr><td style="font-size:11px;color:#888;font-weight:bold;">Invoice No</td><td style="font-size:13px;color:${NAVY};font-weight:bold;">${invoiceNumber}</td></tr>
              <tr><td style="font-size:11px;color:#888;font-weight:bold;">Amount Due</td><td style="font-size:16px;color:${ORANGE};font-weight:900;">${currency} ${totalAmount.toFixed(2)}</td></tr>
              <tr><td style="font-size:11px;color:#888;font-weight:bold;">Due Date</td><td style="font-size:13px;color:${NAVY};">${dueDateStr}</td></tr>
            </table>
          </td></tr>
        </table>
        <a href="${invoiceUrl}" style="display:inline-block;background:${NAVY};color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;font-size:13px;margin-right:8px;">Download Invoice PDF</a>
      </td></tr>
      <tr><td style="background:${NAVY};padding:12px 24px;text-align:center;">
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);">YASAI LOGISTICS COMPANY — info@yasailogistics.com — +966 55 932 6687</p>
      </td></tr>
    </table>
    </td></tr></table>
    </body></html>
  `;

  return getResendClient().emails.send({
    from: `${process.env.EMAIL_FROM_NAME || "YASAI Logistics"} <${process.env.EMAIL_FROM || "noreply@yasailogistics.com"}>`,
    to: [to],
    subject: `Invoice ${invoiceNumber} from YASAI Logistics`,
    html,
  });
}
