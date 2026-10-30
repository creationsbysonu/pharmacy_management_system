import Link from "next/link";
import {
  Building2,
  Clock3,
  CreditCard,
  MailCheck,
  MailWarning,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/page-header";
import {
  PasswordForm,
  PharmacyProfileForm,
  ProfileForm,
  SignOutEverywhereForm,
  StaffForm,
} from "@/components/settings-forms";
import { removeStaffMember } from "@/lib/actions/staff";
import { requireAccess } from "@/lib/auth";
import { dateLabel } from "@/lib/format";
import {
  invoiceSender,
  loadPharmacyProfile,
  resendConfigured,
} from "@/lib/pharmacy";
import { createClient } from "@/lib/supabase/server";

interface MemberRow {
  user_id: string;
  full_name: string | null;
  role: "admin" | "pharmacist";
  joined_at: string;
}

function ContactLine({
  icon: Icon,
  value,
  href,
  hint,
}: {
  icon: typeof Phone;
  value: string | null;
  href?: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        {value ? (
          href ? (
            <a className="break-all hover:text-primary hover:underline" href={href}>
              {value}
            </a>
          ) : (
            <span className="break-words">{value}</span>
          )
        ) : (
          <span className="text-muted-foreground">{hint}</span>
        )}
      </span>
    </li>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const access = await requireAccess();
  const params = await searchParams;
  const isAdmin = access.profile.role === "admin";
  const supabase = await createClient();

  const [profile, { data: members, error: membersError }] = await Promise.all([
    loadPharmacyProfile(access.workspaceId),
    isAdmin
      ? supabase
          .from("v_workspace_members")
          .select("user_id, full_name, role, joined_at")
          .order("joined_at", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ]);

  const team = (members ?? []) as MemberRow[];
  const rosterUnavailable = Boolean(membersError);
  const sender = invoiceSender(profile, access.pharmacyName);
  const mailReady = resendConfigured();
  const hasContactFields = profile?.hasContactFields ?? false;

  return (
    <>
      <PageHeader
        title="Settings"
        description={`The organization record, the people who sign in and your own login — ${access.pharmacyName}.`}
      />

      {params.error ? (
        <div className="mb-4">
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {params.error}
          </p>
        </div>
      ) : params.ok ? (
        <div className="mb-4">
          <Notice message={params.ok} />
        </div>
      ) : null}

      {!hasContactFields ? (
        <div className="mb-4 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          The organization registry needs one more migration. Run{" "}
          <code className="rounded bg-background/40 px-1 py-0.5 text-xs">
            supabase/migrations/0006_organization_profile.sql
          </code>{" "}
          (or paste <code className="rounded bg-background/40 px-1 py-0.5 text-xs">supabase/setup.sql</code>)
          in the Supabase SQL editor to store the pharmacy&apos;s phone, address and
          invoice sender.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Organization --------------------------------------------------- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" /> {profile?.name ?? access.pharmacyName}
              <Badge variant="outline" className="ml-1 text-[10px]">
                your organization
              </Badge>
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "This is the pharmacy your team belongs to. It is private: no other pharmacy can read or change it."
                : "Managed by the administrator of this pharmacy."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {isAdmin && hasContactFields ? (
              <PharmacyProfileForm profile={profile!} />
            ) : (
              <div className="space-y-4">
                <ul className="space-y-2.5 text-sm">
                  <ContactLine
                    icon={MapPin}
                    value={profile?.address ?? null}
                    hint="No address on file yet."
                  />
                  <ContactLine
                    icon={Phone}
                    value={profile?.phone ?? null}
                    href={profile?.phone ? `tel:${profile.phone}` : undefined}
                    hint="No phone number on file yet."
                  />
                  <ContactLine
                    icon={MailCheck}
                    value={profile?.email ?? null}
                    href={profile?.email ? `mailto:${profile.email}` : undefined}
                    hint="No pharmacy email on file yet."
                  />
                </ul>
                {!isAdmin ? (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Need a detail corrected? Ask the administrator — only they can
                    edit the organization record.
                  </p>
                ) : null}
              </div>
            )}

            {isAdmin ? (
              <div className="space-y-3 rounded-2xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <Badge variant={access.plan === "trial" ? "outline" : "default"}>
                    {access.plan === "trial" ? "Free trial" : access.plan}
                  </Badge>
                  {access.plan === "trial" && access.daysLeft !== null ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {access.daysLeft} day{access.daysLeft === 1 ? "" : "s"} left
                      {access.trialEndsAt ? ` · ends ${dateLabel(access.trialEndsAt)}` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Billing belongs to the owner of this pharmacy. Employees never see
                  or change it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/upgrade">Change plan</Link>
                  </Button>
                  <Button asChild size="sm" variant="link" className="px-0">
                    <Link href="/pricing">Compare plans</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* E-billing ------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mailReady ? (
                <MailCheck className="size-4" />
              ) : (
                <MailWarning className="size-4" />
              )}
              Customer e-bills
            </CardTitle>
            <CardDescription>
              How this pharmacy sends invoices to customer inboxes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Mail provider</dt>
                <dd>
                  {mailReady ? (
                    <span className="text-success">connected</span>
                  ) : (
                    <span className="text-warning">not configured</span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Sent from</dt>
                <dd className="text-right">
                  <span className="break-all font-mono text-xs">{sender.email}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {sender.source === "pharmacy"
                      ? "this pharmacy's own sender"
                      : sender.source === "platform"
                        ? "the deployment's shared sender"
                        : "Resend sandbox — owner only"}
                  </span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Replies go to</dt>
                <dd className="break-all text-right font-mono text-xs">
                  {sender.replyTo ?? "—"}
                </dd>
              </div>
            </dl>

            {isAdmin ? (
              <ol className="space-y-2 rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">1.</span> Verify the
                  pharmacy&apos;s domain with the mail provider (Resend → Domains), or
                  use the shared domain the platform operator already verified.
                </li>
                <li>
                  <span className="font-medium text-foreground">2.</span> Put{" "}
                  <code className="rounded bg-background px-1 py-0.5">RESEND_API_KEY</code>{" "}
                  in the deployment environment.
                </li>
                <li>
                  <span className="font-medium text-foreground">3.</span> Set the
                  sender address above — it must be on that verified domain.
                </li>
                <li>
                  <span className="font-medium text-foreground">4.</span> Add a
                  customer&apos;s email to their record, then use{" "}
                  <span className="text-foreground">Email invoice</span> on a sale.
                  Every send is logged on the sale.
                </li>
              </ol>
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                The administrator sets this up. You can still email an invoice from a
                sale as long as the customer has an email on their record.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security ------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Your login security
            </CardTitle>
            <CardDescription>
              Change your own password, or end every session on every device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PasswordForm />
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm text-muted-foreground">
                Lost a device? Signing out everywhere also clears this browser.
              </p>
              <SignOutEverywhereForm />
            </div>
          </CardContent>
        </Card>

        {/* Profiles ------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              The name shown on activity records and in the top bar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              fullName={access.profile.full_name ?? ""}
              email={access.user.email ?? ""}
            />
          </CardContent>
        </Card>

        {/* Team ------------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> People in this pharmacy
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Only you can issue or revoke a login. Pharmacists can sell, add customers and read stock — nothing else."
                : "You are an employee here. The administrator manages this list."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                You are signed in as a pharmacist in {access.pharmacyName}.
              </p>
            ) : rosterUnavailable ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                The team roster needs migration 0004. Run
                <code className="mx-1 rounded bg-background px-1 py-0.5 text-xs">
                  supabase/migrations/0004_accounts_and_audit.sql
                </code>
                in the Supabase SQL editor, then reload this page.
              </p>
            ) : (
              <>
                <ul className="divide-y rounded-lg border">
                  {team.map((member) => (
                    <li
                      key={member.user_id}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {member.full_name?.trim() || "Unnamed"}
                          {member.user_id === access.user.id ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Joined {dateLabel(member.joined_at)}
                        </span>
                      </span>
                      <Badge
                        variant={member.role === "admin" ? "default" : "secondary"}
                        className="ml-auto"
                      >
                        {member.role === "admin" ? "Administrator" : "Pharmacist"}
                      </Badge>
                      {member.user_id !== access.user.id ? (
                        <form action={removeStaffMember}>
                          <input type="hidden" name="user_id" value={member.user_id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Remove ${member.full_name ?? "staff member"}`}
                          >
                            <Trash2 />
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <div className="border-t pt-4">
                  <p className="mb-3 text-sm font-medium">Add a pharmacist</p>
                  <StaffForm />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
