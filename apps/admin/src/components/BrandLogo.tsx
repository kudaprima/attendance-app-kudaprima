import brandLogo from "../../../../assets/branding/pt-kuda-prima-logo.png";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
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
