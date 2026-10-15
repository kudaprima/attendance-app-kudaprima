import brandLogo from "../../../../assets/branding/pt-kuda-prima-logo.png";

import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  readonly className?: string;
  readonly compact?: boolean;
}

export function BrandLogo({
  className,
  compact = false,
}: Readonly<BrandLogoProps>) {
  return (
    <img
      src={brandLogo}
      alt="Logo PT Kuda Prima"
      className={cn(
        "h-auto object-contain",
        compact ? "w-10" : "w-40",
        className,
      )}
    />
  );
}
