import Image from "next/image";
import { cn } from "@/lib/utils";

interface YasaiLogoProps {
  /** "light" = on a dark background (e.g. navy sidebar)
   *  "dark"  = on a light background */
  variant?: "light" | "dark";
  className?: string;
  showText?: boolean; // kept for API compatibility
  /** Height of the rendered logo in pixels (width scales proportionally ~2.655:1). */
  height?: number;
}

/**
 * Official Yasai Logistics logo — uses the actual
 * "yasai logo logistics.jpeg" image file as required.
 *
 * On dark/navy backgrounds (variant="light") the image is shown on a
 * small white rounded container so the logo remains fully visible
 * with all original colours intact.
 */
export function YasaiLogo({
  variant = "dark",
  className,
  height = 44,
}: YasaiLogoProps) {
  // Logo image is 770 × 290 px → aspect ratio ≈ 2.655 : 1
  const width = Math.round(height * 2.655);

  const img = (
    <Image
      src="/yasai-logo-logistics.jpeg"
      alt="Yasai Logistics"
      width={width}
      height={height}
      priority
      style={{ width, height, objectFit: "contain" }}
    />
  );

  if (variant === "light") {
    // On dark sidebar / login header backgrounds, wrap in a white rounded
    // pill so the logo colours display correctly without CSS filter hacks.
    return (
      <div className={cn("flex items-center", className)}>
        <div className="bg-white rounded-lg px-3 py-1.5 inline-flex items-center">
          {img}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      {img}
    </div>
  );
}

/**
 * Small square logo-mark only (used in tight spaces / mobile headers).
 */
export function YasaiLogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="bg-white rounded-md inline-flex items-center justify-center overflow-hidden"
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
