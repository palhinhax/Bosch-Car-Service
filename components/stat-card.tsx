import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  href?: string;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  const toneRing: Record<string, string> = {
    default: "",
    primary: "ring-1 ring-primary/20",
    warning: "ring-1 ring-amber-300",
    success: "ring-1 ring-emerald-300",
  };
  const iconTone: Record<string, string> = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
  };

  const inner = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors",
        toneRing[tone],
        href && "hover:border-primary/40"
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            iconTone[tone]
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
