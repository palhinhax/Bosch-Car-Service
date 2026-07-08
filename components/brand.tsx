import Image from "next/image";
import { cn } from "@/lib/utils";

// Official Bosch Car Service badge (provided by the client) paired with the
// "Car Service Lousa / Gestão de Oficina" wordmark.
export function BrandMark({
  className,
  subtitle = true,
}: {
  className?: string;
  subtitle?: boolean;
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
        <span className="block text-base font-extrabold tracking-tight text-foreground">
          Car Service<span className="text-primary"> Lousa</span>
        </span>
        {subtitle && (
          <span className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Gestão de Oficina
          </span>
        )}
      </span>
    </div>
  );
}
