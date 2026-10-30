import Link from "next/link";
import { ArrowRight, KeyRound, LogIn, Pill, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/scroll-progress";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#roles", label: "Roles" },
  { href: "/#billing", label: "E-billing" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SmoothScroll />
      <ScrollProgress className="fixed inset-x-0 top-0 z-50 h-[2px]" />

      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-5 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5 font-semibold">
            <span className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-6px_oklch(0.78_0.16_158_/_0.9)]">
              <Pill className="size-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-heading text-[15px] tracking-tight">Pharmacia</span>
              <span className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                pharmacy operating system
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/staff/login">
                <Users />
                Employee
              </Link>
            </Button>
            <ThemeToggle />

            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                <LogIn />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/signup">
                <ArrowRight className="size-3.5" />
                Try free
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile: a horizontally scrollable rail instead of a hidden menu. */}
        <div className="border-t border-border lg:hidden">
          <div className="no-scrollbar mx-auto flex w-full max-w-7xl items-center gap-5 overflow-x-auto px-5 py-2 text-xs">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap text-muted-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/staff/login" className="shrink-0 whitespace-nowrap text-muted-foreground">
              Employee login
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="relative overflow-hidden border-t border-border bg-card/30">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.78_0.16_158_/_0.08),transparent_70%)]"
          aria-hidden
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 md:grid-cols-4 lg:px-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Pill className="size-4" />
              </span>
              <span className="font-heading text-sm">Pharmacia</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              The operating system for independent pharmacies: inventory, point of
              sale, purchases, customers, staff and reporting — in one private
              workspace.
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Pharmacia. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/#features">Features</Link></li>
              <li><Link className="hover:text-foreground" href="/#roles">Roles</Link></li>
              <li><Link className="hover:text-foreground" href="/#billing">E-billing</Link></li>
              <li><Link className="hover:text-foreground" href="/pricing">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Sign in</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="flex items-center gap-1.5 hover:text-foreground" href="/login">
                  <ShieldCheck className="size-3.5" /> Administrator
                </Link>
              </li>
              <li>
                <Link className="flex items-center gap-1.5 hover:text-foreground" href="/staff/login">
                  <Users className="size-3.5" /> Employee
                </Link>
              </li>
              <li><Link className="hover:text-foreground" href="/signup">Start free trial</Link></li>
              <li><Link className="hover:text-foreground" href="/forgot-password">Reset password</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Good to know</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>14-day trial, no card required</li>
              <li>Each pharmacy gets private data</li>
              <li>Read-only, never deleted, when a plan lapses</li>
              <li>Invoices can be emailed to customers</li>
            </ul>
          </div>
        </div>

        <div className="relative border-t border-border">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p className="flex items-center gap-2">
              <span className="flex size-1.5 rounded-full bg-primary" />
              Built for pharmacies that cannot afford a lost sale.
            </p>

            {/* Platform operator entrance. The gate asks for a private phrase and
                then verifies the signed-in email against the allowlist. */}
            <Link
              href="/superadmin/gate"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 transition-colors hover:border-primary/30 hover:text-foreground"
              title="Platform operator console"
            >
              <KeyRound className="size-3" />
              Super Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
