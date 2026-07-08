import Image from "next/image";
import { cn } from "@/lib/utils";

// Official Bosch Car Service badge (provided by the client) paired with the
// "Car Service Lousa / Gestão de Oficina" wordmark.
export function BrandMark({
  className,
  subtitle = true,
  light = false,
}: {
  className?: string;
  subtitle?: boolean;
  // Light variant: white text for use over dark/photo backgrounds (e.g. the
  // video login screen). Defaults to the theme-aware colours.
  light?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="Bosch Car Service Lousa"
        width={40}
        height={40}
        priority
        className="h-10 w-10 shrink-0 rounded-md object-contain"
      />
      <span className="leading-tight">
        <span
          className={cn(
            "block text-base font-extrabold tracking-tight",
            light ? "text-white" : "text-foreground"
          )}
        >
          Car Service
          <span className={light ? "text-white" : "text-primary"}> Lousa</span>
        </span>
        {subtitle && (
          <span
            className={cn(
              "block text-[11px] font-medium uppercase tracking-widest",
              light ? "text-white/75" : "text-muted-foreground"
            )}
          >
            Gestão de Oficina
          </span>
        )}
      </span>
    </div>
  );
}
