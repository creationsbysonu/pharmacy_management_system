import Link from "next/link";
import { ArrowUpRight, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperatorNav } from "@/components/operator-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireOperator } from "@/lib/operator";
import { lockOperator } from "@/lib/actions/operator";

export const metadata = {
  title: "Operator console · Pharmacia",
  robots: { index: false, follow: false },
};

export default async function OperatorConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await requireOperator();

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-4 px-5 py-3 lg:px-8">
          <Link href="/superadmin" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-chart-5/15 text-chart-5">
              <ShieldCheck className="size-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-heading text-sm font-semibold">Operator console</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">above every pharmacy</span>
            </span>
          </Link>

          <OperatorNav />

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{operator.email}</span>
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/" target="_blank">
                Site <ArrowUpRight className="size-3" />
              </Link>
            </Button>
            <form action={lockOperator}>
              <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                <Lock className="size-3.5" /> Lock
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-5 py-8 lg:px-8">{children}</main>
    </div>
  );
}
