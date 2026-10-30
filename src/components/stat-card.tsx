import { SlotNumber } from "@/components/slot-text";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  kind = "number",
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  kind?: "number" | "currency" | "compact";
  tone?: "default" | "primary" | "warning";
}) {
  return (
    <div className="card-lift relative overflow-hidden rounded-2xl border border-border bg-card/60 p-4">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60",
          tone === "primary"
            ? "bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.78_0.16_158_/_0.16),transparent_70%)]"
            : tone === "warning"
              ? "bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.83_0.15_80_/_0.16),transparent_70%)]"
              : "bg-[radial-gradient(ellipse_at_50%_0%,oklch(1_0_0_/_0.05),transparent_70%)]",
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            tone === "primary"
              ? "bg-primary/12 text-primary"
              : tone === "warning"
                ? "bg-warning/12 text-warning"
                : "bg-foreground/5 text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="font-heading relative mt-2 text-2xl font-semibold">
        <SlotNumber value={value} kind={kind} />
      </p>
      {hint ? <p className="relative mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
