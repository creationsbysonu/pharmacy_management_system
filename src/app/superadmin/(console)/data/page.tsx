import Link from "next/link";
import { Database, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteOperatorRow } from "@/lib/actions/operator";
import {
  DELETE_BLOCKED_REASON,
  OPERATOR_ID_COLUMN,
  OPERATOR_TABLES,
  canDeleteRow,
  isOperatorTable,
  type OperatorTable,
} from "@/lib/operator-tables";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SENSITIVE = new Set(["workspace_members", "profiles", "operator_audit"]);

function cell(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 100);
  const text = String(value);
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}

export default async function OperatorDataPage({
  searchParams,
}: {
  searchParams: Promise<{
    table?: string;
    workspace?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const { table: rawTable, workspace, ok, error: failure } = await searchParams;
  const table: OperatorTable = rawTable && isOperatorTable(rawTable) ? rawTable : "workspaces";
  const idColumn = OPERATOR_ID_COLUMN[table];

  const admin = createAdminClient();
  if (!admin) {
    return (
      <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
        {ADMIN_KEY_HINT}
      </p>
    );
  }

  let query = admin.from(table).select("*").limit(50);
  if (workspace && table !== "workspaces") {
    if (table === "workspace_members" || table === "profiles") {
      // Neither table has workspace_id; filter members directly instead.
      if (table === "workspace_members") query = query.eq("workspace_id", workspace);
    } else {
      query = query.eq("workspace_id", workspace);
    }
  }

  const { data, error } = await query;
  const rows = (data ?? []) as Record<string, unknown>[];
  const columns = rows.length > 0 ? Object.keys(rows[0]).slice(0, 12) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Database className="size-5 text-chart-5" /> Data browser
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Direct, read-across-tenant access to the database. Deletions here are
            permanent and recorded in the audit log; nothing is soft-deleted.
          </p>
        </div>
        {workspace ? (
          <Badge variant="outline" className="gap-1.5 border-warning/30 text-warning">
            filtered by workspace {workspace.slice(0, 8)}
          </Badge>
        ) : null}
      </div>

      {ok ? (
        <p className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
          {ok}
        </p>
      ) : failure ? (
        <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {failure}
        </p>
      ) : null}

      <div className="no-scrollbar flex flex-wrap gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card/40 p-2">
        {OPERATOR_TABLES.map((name) => (
          <Link
            key={name}
            href={`/superadmin/data?table=${name}${workspace ? `&workspace=${workspace}` : ""}`}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors",
              name === table
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            {name}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="font-mono text-xs text-muted-foreground">
            {table} · {rows.length} row{rows.length === 1 ? "" : "s"} (max 50)
          </p>
          {SENSITIVE.has(table) ? (
            <Badge variant="outline" className="text-[10px]">restricted table</Badge>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            This table is empty.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background/40 text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                      {column}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-foreground/[0.04]">
                    {columns.map((column) => (
                      <td key={column} className="max-w-[220px] truncate px-3 py-2 font-mono text-[11px]">
                        {cell(row[column])}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {canDeleteRow(table) ? (
                        <form action={deleteOperatorRow}>
                          <input type="hidden" name="table" value={table} />
                          <input type="hidden" name="workspace" value={workspace ?? ""} />
                          <input type="hidden" name="id_column" value={idColumn} />
                          <input type="hidden" name="id_value" value={String(row[idColumn] ?? "")} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Delete row ${String(row[idColumn] ?? "")}`}
                          >
                            <Trash2 />
                          </Button>
                        </form>
                      ) : (
                        <span
                          className="text-[10px] text-muted-foreground"
                          title={DELETE_BLOCKED_REASON[table] ?? "Read only here."}
                        >
                          locked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Rows are shown newest-last by the table&apos;s natural order. Pharmacies,
        memberships and profiles are read-only here on purpose: they carry
        accounts, so they are changed through the workspace page, where a delete
        also detaches the logins it would otherwise strand.
      </p>
    </div>
  );
}
