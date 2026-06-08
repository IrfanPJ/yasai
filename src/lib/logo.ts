import fs from "fs";
import path from "path";

export function getLogoDataUrl(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "yasai-logo-logistics.jpeg");
    const buffer = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}
