import Link from "next/link";
import { ArrowUpRight, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  extendTrial,
  setWorkspacePlan,
  toggleWorkspaceStatus,
} from "@/lib/actions/operator";
import { dateLabel } from "@/lib/format";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PLANS = ["trial", "monthly", "yearly", "lifetime"] as const;

interface Row {
  id: string;
  name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  created_at: string;
  email?: string | null;
  phone?: string | null;
}

export default async function OperatorWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const admin = createAdminClient();

  if (!admin) {
    return (
      <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
        {ADMIN_KEY_HINT}
      </p>
    );
  }

  // `*` keeps this list working on a database that has not had migration 0006
  // applied yet: the registry columns are simply absent.
  const { data } = await admin
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });

  const query = (q ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as Row[]).filter((row) =>
    query ? row.name.toLowerCase().includes(query) || row.id.includes(query) : true,
  );

  // eslint-disable-next-line react-hooks/purity -- server component, read once per request
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} pharmacies. Plan changes take effect immediately: writes
            unlock or lock on the next request.
          </p>
        </div>

        <form className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search name or id"
              className="h-9 w-64 pl-8 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Pharmacy</TableHead>
              <TableHead>Plan & status</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead className="text-right">Adjust</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No workspace matches that search.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const lapsed =
                  row.plan === "trial" &&
                  row.trial_ends_at !== null &&
                  Date.parse(row.trial_ends_at) <= now;

                return (
                  <TableRow key={row.id} className="align-top">
                    <TableCell>
                      <Link
                        href={`/superadmin/workspaces/${row.id}`}
                        className="font-medium underline-offset-4 hover:text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {row.id.slice(0, 8)} · since {dateLabel(row.created_at)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {row.email || row.phone || "no contact details on file"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={row.plan === "trial" ? "outline" : "default"} className="text-[10px]">
                          {row.plan}
                        </Badge>
                        <Badge
                          variant={row.status === "active" ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {row.status}
                        </Badge>
                        {lapsed ? (
                          <Badge variant="outline" className="gap-1 border-warning/30 text-[10px] text-warning">
                            <ShieldAlert className="size-2.5" /> locked
                          </Badge>
                        ) : null}
                      </div>

                      <form action={setWorkspacePlan} className="mt-2 flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="workspace_id" value={row.id} />
                        <select
                          name="plan"
                          defaultValue={row.plan}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {PLANS.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan}
                            </option>
                          ))}
                        </select>
                        <select
                          name="status"
                          defaultValue={row.status}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="active">active</option>
                          <option value="suspended">suspended</option>
                        </select>
                        <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                          Save
                        </Button>
                      </form>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm">
                        {row.trial_ends_at ? dateLabel(row.trial_ends_at) : "—"}
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        {[14, 30].map((days) => (
                          <form key={days} action={extendTrial}>
                            <input type="hidden" name="workspace_id" value={row.id} />
                            <input type="hidden" name="days" value={days} />
                            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                              +{days}d
                            </Button>
                          </form>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <form action={toggleWorkspaceStatus}>
                        <input type="hidden" name="workspace_id" value={row.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={row.status === "active" ? "suspended" : "active"}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant={row.status === "active" ? "ghost" : "default"}
                          className="h-8 text-xs"
                        >
                          {row.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      </form>
                      <div className="mt-1 flex items-center justify-end gap-3 text-[11px]">
                        <Link
                          href={`/superadmin/workspaces/${row.id}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/superadmin/data?table=sales&workspace=${row.id}`}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          Inspect <ArrowUpRight className="size-3" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
