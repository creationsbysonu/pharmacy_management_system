import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Database,
  Save,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
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
  attachAccount,
  closeWorkspace,
  detachMember,
  saveWorkspaceRegistry,
} from "@/lib/actions/operator";
import { dateLabel } from "@/lib/format";
import { invoiceSender, resendConfigured } from "@/lib/pharmacy";
import { ADMIN_KEY_HINT, createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Workspace {
  id: string;
  name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  created_at: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  invoice_from_name?: string | null;
  invoice_from_email?: string | null;
}

interface Member {
  user_id: string;
  created_at: string;
  email: string;
  full_name: string | null;
  role: string | null;
}

async function countRows(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  table: "meds" | "sales" | "customer" | "purchase" | "employee",
  column: string,
  workspaceId: string,
): Promise<number> {
  const { count } = await admin
    .from(table)
    .select(column, { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  return count ?? 0;
}

export default async function OperatorWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ wId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { wId } = await params;
  const { ok, error } = await searchParams;

  const admin = createAdminClient();
  if (!admin) {
    return (
      <p className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
        {ADMIN_KEY_HINT}
      </p>
    );
  }

  // `*` rather than a column list: a database that has not had migration 0006
  // applied yet still renders, with the registry fields simply empty.
  const { data: workspace } = await admin
    .from("workspaces")
    .select("*")
    .eq("id", wId)
    .maybeSingle<Workspace>();

  if (!workspace) notFound();

  const [{ data: memberRows }, meds, sales, customers, purchases, employees] =
    await Promise.all([
      admin
        .from("workspace_members")
        .select("user_id, created_at")
        .eq("workspace_id", wId)
        .order("created_at", { ascending: true }),
      countRows(admin, "meds", "med_id", wId),
      countRows(admin, "sales", "sale_id", wId),
      countRows(admin, "customer", "c_id", wId),
      countRows(admin, "purchase", "p_id", wId),
      countRows(admin, "employee", "e_id", wId),
    ]);

  const ids = (memberRows ?? []).map((row) => String(row.user_id));
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, full_name, role").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; role: string | null }[] };

  const profileById = new Map(
    (profiles ?? []).map((row) => [String(row.id), row] as const),
  );

  const members: Member[] = await Promise.all(
    (memberRows ?? []).map(async (row) => {
      const userId = String(row.user_id);
      const profile = profileById.get(userId);
      const { data } = await admin.auth.admin.getUserById(userId);
      return {
        user_id: userId,
        created_at: String(row.created_at),
        email: data.user?.email ?? "—",
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? null,
      };
    }),
  );

  // A one-shot read of the clock: this server component renders once per request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const lapsed =
    workspace.plan === "trial" &&
    workspace.trial_ends_at !== null &&
    Date.parse(workspace.trial_ends_at) <= now;

  const sender = invoiceSender(
    {
      name: workspace.name,
      email: workspace.email ?? null,
      invoiceFromName: workspace.invoice_from_name ?? null,
      invoiceFromEmail: workspace.invoice_from_email ?? null,
    },
    workspace.name,
  );

  const stats = [
    { label: "Medicines", value: meds },
    { label: "Sales", value: sales },
    { label: "Customers", value: customers },
    { label: "Purchases", value: purchases },
    { label: "Employees", value: employees },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/superadmin/workspaces"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All workspaces
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant={workspace.plan === "trial" ? "outline" : "default"} className="text-[10px]">
              {workspace.plan}
            </Badge>
            <Badge
              variant={workspace.status === "active" ? "secondary" : "destructive"}
              className="text-[10px]"
            >
              {workspace.status}
            </Badge>
            {lapsed ? (
              <Badge variant="outline" className="gap-1 border-warning/30 text-[10px] text-warning">
                <ShieldAlert className="size-2.5" /> writes locked
              </Badge>
            ) : null}
            <span className="font-mono text-[10px]">
              {workspace.id.slice(0, 8)} · created {dateLabel(workspace.created_at)}
            </span>
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/superadmin/data?table=sales&workspace=${workspace.id}`}>
            <Database className="size-3.5" /> Inspect data
          </Link>
        </Button>
      </div>

      {ok ? (
        <p className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
          {ok}
        </p>
      ) : error ? (
        <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="font-heading mt-1 text-xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Organization registry ----------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-primary" /> Organization registry
            </h2>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              Every option this pharmacy has, in one place. These details are private
              to this workspace: they appear in its app heading, on its invoices and
              as the identity of its customer e-bills.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            e-bill sender: {sender.email}
          </Badge>
        </div>

        <form action={saveWorkspaceRegistry} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="workspace_id" value={workspace.id} />

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="reg-name" className="text-xs font-medium">
              Pharmacy name
            </label>
            <Input
              id="reg-name"
              name="name"
              defaultValue={workspace.name}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-phone" className="text-xs font-medium">
              Phone
            </label>
            <Input
              id="reg-phone"
              name="phone"
              defaultValue={workspace.phone ?? ""}
              placeholder="+977 98…"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-xs font-medium">
              Pharmacy email
            </label>
            <Input
              id="reg-email"
              name="email"
              type="email"
              defaultValue={workspace.email ?? ""}
              placeholder="care@pharmacy.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="reg-address" className="text-xs font-medium">
              Address
            </label>
            <textarea
              id="reg-address"
              name="address"
              defaultValue={workspace.address ?? ""}
              rows={2}
              maxLength={240}
              placeholder="Street, town, province"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-from-name" className="text-xs font-medium">
              Invoice sender name
            </label>
            <Input
              id="reg-from-name"
              name="invoice_from_name"
              defaultValue={workspace.invoice_from_name ?? ""}
              placeholder={workspace.name}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-from-email" className="text-xs font-medium">
              Invoice sender address
            </label>
            <Input
              id="reg-from-email"
              name="invoice_from_email"
              type="email"
              defaultValue={workspace.invoice_from_email ?? ""}
              placeholder="invoices@pharmacy.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-plan" className="text-xs font-medium">
              Plan
            </label>
            <select
              id="reg-plan"
              name="plan"
              defaultValue={workspace.plan}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {["trial", "monthly", "yearly", "lifetime"].map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-status" className="text-xs font-medium">
              Status
            </label>
            <select
              id="reg-status"
              name="status"
              defaultValue={workspace.status}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-trial" className="text-xs font-medium">
              Trial ends
            </label>
            <Input
              id="reg-trial"
              name="trial_ends_at"
              type="date"
              defaultValue={workspace.trial_ends_at?.slice(0, 10) ?? ""}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Only used while the plan is trial. Empty means no end date.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center">
            <Button type="submit" className="h-9 gap-1.5">
              <Save className="size-3.5" /> Save organization
            </Button>
            <p className="text-[11px] text-muted-foreground">
              {resendConfigured()
                ? `Sends from ${sender.email}${sender.replyTo ? `, replies to ${sender.replyTo}` : ""}.`
                : "Mail provider key is not set on this deployment yet, so e-bills will explain what is missing."}
            </p>
          </div>
        </form>
      </section>

      {/* Members ------------------------------------------------------------ */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card/50">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Users className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Logins in this pharmacy</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Person</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Nobody belongs to this pharmacy. Attach an account below.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell>
                    <p className="font-medium">{member.full_name?.trim() || "Unnamed"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{member.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.role === "admin" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {member.role ?? "no profile"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dateLabel(member.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={detachMember}>
                      <input type="hidden" name="workspace_id" value={workspace.id} />
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Removing somebody&apos;s last pharmacy detaches their login cleanly
          instead of leaving it half-configured — the account survives, so you can
          attach it again here at any time.
        </p>
      </section>

      {/* Attach / restore ---------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4 text-primary" /> Attach or restore an account
        </h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Use this after a membership or profile went missing, to hand an existing
          login to this pharmacy, or to create a login for an owner. An address
          with no account needs a temporary password; existing accounts keep their
          own and are simply attached.
        </p>

        <form action={attachAccount} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_200px_auto]">
          <input type="hidden" name="workspace_id" value={workspace.id} />
          <div className="space-y-1.5">
            <label htmlFor="attach-email" className="text-xs font-medium">
              Email
            </label>
            <Input
              id="attach-email"
              name="email"
              type="email"
              required
              placeholder="owner@pharmacy.com"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="attach-role" className="text-xs font-medium">
              Role
            </label>
            <select
              id="attach-role"
              name="role"
              defaultValue="pharmacist"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="pharmacist">Pharmacist</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="attach-password" className="text-xs font-medium">
              Temporary password
            </label>
            <Input
              id="attach-password"
              name="password"
              type="text"
              autoComplete="off"
              placeholder="Only for a new account"
              className="h-9 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="h-9 gap-1.5">
              <UserPlus className="size-3.5" /> Attach
            </Button>
          </div>
        </form>
      </section>

      {/* Danger zone --------------------------------------------------------- */}
      <section className="rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <ShieldAlert className="size-4" /> Close this pharmacy
        </h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          Deletes the pharmacy and every row that belongs to it: stock, sales,
          customers, purchases, employees and memberships. Members who belong to no
          other pharmacy are detached in the same step, so no login is left in
          limbo. This cannot be undone.
        </p>

        <form action={closeWorkspace} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="workspace_id" value={workspace.id} />
          <div className="space-y-1.5">
            <label htmlFor="confirm-name" className="text-xs font-medium">
              Type <span className="font-mono text-foreground">{workspace.name}</span> to confirm
            </label>
            <Input
              id="confirm-name"
              name="confirmation"
              autoComplete="off"
              placeholder={workspace.name}
              className="h-9 w-64 text-sm"
              required
            />
          </div>
          <Button type="submit" variant="destructive" className="h-9 gap-1.5">
            <Trash2 className="size-3.5" /> Close pharmacy
          </Button>
        </form>
      </section>
    </div>
  );
}
