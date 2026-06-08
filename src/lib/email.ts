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
