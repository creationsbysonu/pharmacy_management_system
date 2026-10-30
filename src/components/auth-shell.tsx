import Link from "next/link";
import { ArrowLeft, Pill, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Shared frame for every entrance into the product. Both doors — administrator
 * and employee — use the same shell so they feel like one building, while the
 * label, accent and bullet points make it obvious which door you walked through.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  points,
  footer,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <div className="aurora pointer-events-none absolute inset-0 lg:hidden" aria-hidden />

      {/* Brand side -------------------------------------------------------- */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-card/40 p-10 lg:flex">
        <div className="aurora opacity-70" aria-hidden />
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />

        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_-8px_oklch(0.78_0.16_158_/_0.9)]">
              <Pill className="size-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-heading text-sm font-semibold">Pharmacia</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                pharmacy operating system
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
        </div>

        <div className="relative max-w-md space-y-6">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {eyebrow}
          </Badge>
          <h1 className="font-heading text-4xl leading-[1.08] font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          <ul className="space-y-3 text-sm">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Each pharmacy&apos;s data is isolated in Postgres, not just hidden in the
          interface.
        </p>
      </section>

      {/* Form side --------------------------------------------------------- */}
      <section className="relative flex items-center justify-center p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Pill className="size-4" />
            </span>
            <span className="font-heading text-sm font-semibold">Pharmacia</span>
          </div>

          {children}

          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
