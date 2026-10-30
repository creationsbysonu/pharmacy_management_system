import Link from "next/link";
import { Building2 } from "lucide-react";
import { getAccess } from "@/lib/auth";

/**
 * Page heading for the app.
 *
 * The organization you are working in is stated above the title, so an employee
 * moving between the counter, stock and customers always sees which pharmacy
 * they are acting for — the same heading an administrator sees, with the same
 * name, because it is the same workspace.
 */
export async function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const access = await getAccess();

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        {access ? (
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            title="This organization"
          >
            <Building2 className="size-3 text-primary" />
            <span className="max-w-[46ch] truncate">{access.pharmacyName}</span>
          </Link>
        ) : null}
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export function Notice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-2 py-10 text-center text-sm text-muted-foreground"
      >
        {message}
      </td>
    </tr>
  );
}
