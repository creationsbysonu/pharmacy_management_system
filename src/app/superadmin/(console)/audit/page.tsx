import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateTimeLabel } from "@/lib/format";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: number;
  actor_email: string | null;
  action: string;
  target: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export default async function OperatorAuditPage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
        {ADMIN_KEY_HINT}
      </p>
    );
  }

  const { data } = await admin
    .from("operator_audit")
    .select("id, actor_email, action, target, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ScrollText className="size-5 text-chart-5" /> Operator audit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only. Approvals, plan changes, trial extensions, suspensions and
          deletions all land here and cannot be edited from the console.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No operator actions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {dateTimeLabel(row.created_at)}
                  </TableCell>
                  <TableCell className="text-xs">{row.actor_email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{row.action}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-[11px] text-muted-foreground">
                    {row.target ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(row.detail)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
