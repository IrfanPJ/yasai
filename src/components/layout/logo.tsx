import Image from "next/image";
import { cn } from "@/lib/utils";

interface YasaiLogoProps {
  variant?: "light" | "dark";
  className?: string;
  showText?: boolean;
  height?: number;
}

export function YasaiLogo({
  variant = "dark",
  className,
  height = 44,
}: YasaiLogoProps) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      <Image
        src="/yasai-logo-logistics.jpeg"
        alt="Yasai Logistics"
        width={400}
        height={150}
        priority
        style={{ width: "100%", height: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

export function YasaiLogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="inline-flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src="/yasai-logo-logistics.jpeg"
        alt="Yasai Logistics"
        width={size * 2}
        height={size}
        style={{ width: size, height: size, objectFit: "cover", objectPosition: "left" }}
      />
    </div>
  );
}
