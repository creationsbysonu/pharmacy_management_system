import Link from "next/link";
import { Download, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyRow, PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { dateTimeLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const ENTITIES = ["all", "meds", "sales", "purchase", "customer", "employee", "suppliers"];
const ACTIONS = ["all", "insert", "update", "delete"];

interface ActivityRow {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
}

const ACTION_TONE: Record<string, "default" | "secondary" | "destructive"> = {
  insert: "default",
  update: "secondary",
  delete: "destructive",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const entity = ENTITIES.includes(params.entity ?? "") ? (params.entity as string) : "all";
  const action = ACTIONS.includes(params.action ?? "") ? (params.action as string) : "all";

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, created_at, actor_email, action, entity, entity_id, summary")
    .order("created_at", { ascending: false })
    .limit(200);

  if (entity !== "all") query = query.eq("entity", entity);
  if (action !== "all") query = query.eq("action", action);

  const { data, error } = await query;
  const rows = (data ?? []) as ActivityRow[];

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every recorded change in this pharmacy, newest first."
        actions={
          <Button asChild size="sm" variant="outline">
            <a href="/reports/export?type=activity">
              <Download /> Export CSV
            </a>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" action="/activity">
            <div className="space-y-2">
              <span className="text-sm font-medium">Record type</span>
              <Select name="entity" defaultValue={entity}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "Everything" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Action</span>
              <Select name="action" defaultValue={action}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All actions" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Apply</Button>
            <Button asChild variant="ghost">
              <Link href="/activity">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" /> Audit trail
          </CardTitle>
          <CardDescription>
            {error
              ? "The audit log is not installed yet."
              : `Showing ${rows.length} of the latest 200 entries.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {error ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                supabase/migrations/0004_accounts_and_audit.sql
              </code>{" "}
              in the Supabase SQL editor to start recording changes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead className="pr-4">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={5} message="No changes recorded yet." />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4 whitespace-nowrap text-muted-foreground">
                        {dateTimeLabel(row.created_at)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {row.actor_email ?? "system"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_TONE[row.action] ?? "outline"}>
                          {row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.entity.replace(/_/g, " ")}
                        {row.entity_id ? (
                          <span className="text-muted-foreground"> #{row.entity_id}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-72 truncate pr-4 text-xs text-muted-foreground">
                        {row.summary}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
