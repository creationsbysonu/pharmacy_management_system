import { Check, Inbox, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideUpgradeRequest } from "@/lib/actions/operator";
import { dateTimeLabel } from "@/lib/format";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RequestRow {
  id: number;
  workspace_id: string;
  plan: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  note: string | null;
  decision_note: string | null;
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
}

export default async function OperatorRequestsPage() {
  const admin = createAdminClient();

  if (!admin) {
    return (
      <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
        {ADMIN_KEY_HINT}
      </p>
    );
  }

  const [{ data: requests }, { data: workspaces }] = await Promise.all([
    admin
      .from("upgrade_request")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("workspaces").select("id, name"),
  ]);

  const rows = (requests ?? []) as RequestRow[];
  const nameById = new Map(
    ((workspaces ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  const pending = rows.filter((row) => row.status === "pending");
  const decided = rows.filter((row) => row.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Upgrade requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approving a request switches the pharmacy onto the plan immediately and
          clears its trial clock. Rejecting leaves everything exactly as it was.
        </p>
      </div>

      <section>
        <h2 className="font-heading mb-3 flex items-center gap-2 text-sm font-semibold">
          <Inbox className="size-4 text-primary" /> Waiting ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing is waiting. Requests sent from an upgrade page appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((request) => (
              <li key={request.id} className="rounded-2xl border border-border bg-card/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {nameById.get(request.workspace_id) ?? "Unknown pharmacy"}
                      <Badge className="ml-2 align-middle text-[10px]">{request.plan}</Badge>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.contact_name ?? "—"} · {request.contact_email ?? "no email"} ·{" "}
                      {dateTimeLabel(request.created_at)}
                    </p>
                    {request.note ? (
                      <p className="mt-3 max-w-2xl rounded-lg bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                        {request.note}
                      </p>
                    ) : null}
                  </div>

                  <form action={decideUpgradeRequest} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="request_id" value={request.id} />
                    <input
                      name="decision_note"
                      placeholder="Note to the pharmacy"
                      className="h-9 w-56 rounded-lg border border-input bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                    />
                    <Button type="submit" name="decision" value="approve" size="sm" className="gap-1.5">
                      <Check className="size-3.5" /> Approve
                    </Button>
                    <Button
                      type="submit"
                      name="decision"
                      value="reject"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive"
                    >
                      <X className="size-3.5" /> Reject
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-heading mb-3 text-sm font-semibold">History</h2>
        {decided.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
            No decisions yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/50 px-4">
            {decided.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {nameById.get(request.workspace_id) ?? "Unknown pharmacy"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {request.plan} · {request.contact_email ?? "no email"}
                    {request.decision_note ? ` · ${request.decision_note}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={request.status === "approved" ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {request.status}
                  </Badge>
                  {request.decided_at ? dateTimeLabel(request.decided_at) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
