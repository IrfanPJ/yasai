import QRCode from "qrcode";

export async function generateQRCode(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 200,
    margin: 2,
    color: {
      dark: "#071A3A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}

export async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: 200,
    margin: 2,
    color: {
      dark: "#071A3A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
    type: "png",
  });
}
