# Pharmacia — modern web app

A Next.js + Supabase replacement for the PHP/MySQL application in the parent
folder (`../`). Same domain, same data, rebuilt on a stack that runs on Vercel.

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix), deep-ink dark theme
- **Motion**: Lenis smooth scroll (marketing only), CSS/IntersectionObserver reveals,
  slot-machine headlines, self-drawing SVG charts — no animation runtime in the app
- **Exports**: SheetJS (`xlsx`) and jsPDF + autotable, generated server-side
- **Data & auth**: Supabase — Postgres, Supabase Auth, row level security
- **Hosting**: Vercel (app) + Supabase (managed Postgres/Auth)

## What replaced what

| Original PHP/MySQL | Now |
| --- | --- |
| `mainpage.php`, `mainpage1.php`, `admin`/`emplogin` tables | Supabase Auth + `profiles` table (`admin` / `pharmacist`) |
| `adminmainpage.php`, `pharmmainpage.php` | `/dashboard` |
| `inventory-view/add/update/delete.php` | `/inventory` |
| `supplier-*.php` | `/suppliers` |
| `customer-*.php`, `pharm-customer*.php` | `/customers` |
| `employee-*.php` | `/employees` |
| `purchase-*.php` | `/purchases` |
| `pos1.php`, `pos2.php`, `pharm-pos1/2.php` | `/pos` (cart + invoice) |
| `sales-view.php`, `salesitems-view.php` | `/sales`, `/sales/[id]` |
| `salesreport.php` | `/reports/sales` |
| `stockreport.php` | `/reports/stock` |
| `expiryreport.php` | `/reports/expiry` |
| MySQL triggers `QTYINSERT`/`QTYDELETE`/`QTYUPDATE`, `SALEINSERT`/`SALEDELETE` | Postgres triggers `purchase_stock_sync`, `sales_item_stock_sync` |
| Procedures `STOCK`, `EXPIRY`; functions `P_AMT`, `S_AMT`, `TOTAL_AMT` | Views `v_low_stock`, `v_expiring`; totals computed in queries |
| `config.php` (hard-coded MySQL credentials) | `.env.local` / Vercel environment variables |

The original `pharmacy.sql` schema is preserved in `supabase/migrations/0001_schema.sql`
and the original rows in `supabase/seed.sql`.

## 1. Create the database

Open **Supabase → SQL Editor**, paste the whole of **`supabase/setup.sql`** and press
Run. That single file contains, in order:

1. the schema — tables, stock triggers, RLS policies, report views
2. account settings, staff membership and the audit trail (`0004`)
3. upgrade requests, invoice-email log and the operator audit table (`0005`)
4. organization profile columns + RPC (`0006`)
5. verification-gated registration (`0007`)
6. the seed data — every row from the old MySQL dump
7. two demo logins (skip this part if you would rather use your own accounts)

Everything is idempotent, so re-running it is safe. `setup.sql` is generated; if
you edit the parts, regenerate it with:

```bash
cd supabase && cat migrations/*.sql seed.sql demo-users.sql > setup.sql
```

To run the parts individually instead, use `migrations/0001_schema.sql` through
`0007_verified_organizations.sql`, then `seed.sql`, then `demo-users.sql`.

### Registration is gated on verification

`0007_verified_organizations.sql` changes *when* a pharmacy comes into
existence. Signing up only creates the account's profile; the organization
itself — workspace row, membership and the 14-day trial — is created by the
`on_auth_user_verified` trigger the moment the address is proved:

| how the address is proved | what proves it |
| --- | --- |
| confirmation link in the inbox | Supabase stamps `auth.users.email_confirmed_at` |
| six-digit code at `/verify-email` | `verifyOtp` stamps the same column |
| **Continue with Google** | Google already verified the address, so the trigger runs on insert |
| phone number | same trigger on `phone_confirmed_at` — UI is shown but switched off for now |

Three setup steps in Supabase make the middle row work:

1. **Authentication → Providers → Email** — keep *Confirm email* **on**.
2. **Authentication → Emails → Confirm signup** and **Magic Link** — add
   `{{ .Token }}` to the template body, e.g.
   `<p>Your code: <strong>{{ .Token }}</strong></p>`, otherwise the link works
   but the six digits never arrive.
3. **Authentication → Providers → Google** — add a Google Cloud OAuth client
   (redirect URI is printed on the provider screen) to enable the Google
   button; without it the button explains that sign-in is not switched on yet.

An unconfirmed owner cannot reach the app: `/verify-email` is public, every
other route still needs a session, and signing in before confirming redirects
to that page with the address filled in.

<details>
<summary>Alternative: Supabase CLI</summary>

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations
```

Then paste `supabase/seed.sql` into the SQL Editor (seeds are not pushed by
`db push`).
</details>

## 2. Environment variables

Copy the two values from **Supabase → Project Settings → API** into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Use the **anon / publishable** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The
`service_role` key belongs in `SUPABASE_SERVICE_ROLE_KEY`, which is server-only:
it must never be exposed to the browser, and only the staff-provisioning action
and the operator console use it.

```bash
# Server-only. Staff logins and every Super Admin action need it.
SUPABASE_SERVICE_ROLE_KEY=

# Super Admin (platform operator)
SUPER_ADMIN_EMAIL=you@yourdomain.com        # allowlist, comma separated
SUPER_ADMIN_PASSCODE=long-private-phrase
SUPER_ADMIN_SECRET=long-random-string       # signs the operator cookie

# Customer e-billing (optional: PDFs still download without it)
RESEND_API_KEY=
INVOICE_FROM_EMAIL="Your Pharmacy <invoices@yourdomain.com>"
```

See `.env.example` for the annotated list.

## 3. Run locally

```bash
npm install
npm run dev
npm test
```

The product ships with a **day/night switch** in every shell (marketing header,
app top bar, operator console, all sign-in screens). next-themes writes the
`dark` or `light` class on `<html>` before the first paint, so the choice follows
you across pages and reloads; both palettes are the same emerald/lime brand, only
the paper changes. Charts are plain SVG (`src/components/charts.tsx`) and read
the theme tokens, so they need no client JavaScript and re-colour instantly.

`npm test` walks the authentication redirect graph — every session state against
every guarded route — and fails if any combination can bounce a browser between
two pages. The rules it tests live in `src/lib/route-rules.ts` and are the same
ones the proxy and the pages use.

Open http://localhost:3000. With `supabase/demo-users.sql` applied you can sign in as:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@pharmacy.local` | `Admin@123` |
| Pharmacist | `pharmacist@pharmacy.local` | `Pharmacy@123` |

Prefer your own accounts? Create them in **Supabase → Authentication → Users
→ Add user** (tick *Auto Confirm User*), then assign the role:

```sql
update public.profiles
   set role = 'admin', full_name = 'Administrator'
 where id = (select id from auth.users where email = 'you@example.com');
```

## 4. Permissions

| Area | Administrator | Pharmacist |
| --- | --- | --- |
| Dashboard, New sale, Sales | ✅ | ✅ |
| Inventory | read + write | read only |
| Customers | read + write | read + add |
| Suppliers, Purchases, Employees | ✅ | ✗ |
| Sales report, Expiry report | ✅ | ✗ |
| Stock report | ✅ | ✅ |
| Activity (audit trail) | ✅ | ✗ |
| Settings: own name, password, sign out everywhere | ✅ | ✅ |
| Settings: organization profile, invoice sender, team access | ✅ | read-only |
| Excel / PDF export (sales, purchases, customers) | ✅ | ✗ |
| Excel / PDF export (stock, expiry) | ✅ | ✅ |
| Invoice PDF download | ✅ | ✅ |
| Email invoice to a customer with an address | ✅ | ✅ |
| Request / change the plan | ✅ | ✗ |
| Super Admin console (`/superadmin`) | allowlisted operator only | ✗ |

Enforced in two places: the server actions check the role, and Postgres row level
security enforces the same rules even if a request bypasses the UI. A suspended
workspace is refused before any of this (`/suspended`), and an expired trial
locks writes while leaving reads and exports available.

## 4b. The three entrances

| Entrance | Who | What it reaches |
| --- | --- | --- |
| `/login` | pharmacy owner (`profiles.role = 'admin'`) | the whole workspace |
| `/staff/login` | employee (`profiles.role = 'pharmacist'`) | counter, stock, customers |
| `/superadmin/gate` | platform operator only | every workspace, plans, data |

Each door offers the same three ways in: a password, **Continue with Google**,
and a **phone-number** option that is deliberately disabled — it is on screen so
the flow is visible, but until an SMS provider is configured it does nothing.
Owners and employees can also finish registration (or recover a lost link) with
the six-digit code on `/verify-email`, which confirms the address and creates
the pharmacy in one step.

Each door verifies the account's role after a successful password check and
refuses the wrong one with a pointer to the right door. The operator gate adds a
second lock: a private passphrase plus an allowlisted email, minting an
HMAC-signed cookie scoped to `/superadmin` for eight hours. Every operator
action is appended to `operator_audit`, which the console can read but never
edit or delete.

## 4c. Premium, trials and e-billing

- A trial lasts `TRIAL_DAYS` (14). When it ends, **writes are locked** by RLS and
  a paywall panel explains the state; reads, reports and exports keep working.
- `/upgrade` sends an `upgrade_request` (one pending per pharmacy). Payment is
  reviewed by the operator, so no card data touches this app. Approving from
  `/superadmin/requests` sets the plan and clears the trial clock.
- `/checkout` now redirects to `/upgrade`, so old links keep working.
- On a sale, **Invoice PDF** downloads the receipt; **Email invoice** sends the
  same PDF through Resend to the address already on the customer record and logs
  the result in `invoice_email`. No address is accepted from the till itself.

## 4d. One organization, one pharmacy

A workspace **is** one pharmacy, and the pharmacy name is the identity of the
therapy: it heads the sidebar, the top bar, every page heading and every invoice.
Nothing crosses tenants — RLS scopes every read and write by workspace
membership, and the role on the account only ever grants rights **inside its own
pharmacy**:

- **Administrator (owner)** — the organization record (name, phone, email,
  address, e-bill sender), stock, purchases, suppliers, customers, employees,
  reports, exports and billing. They never see another pharmacy, and no other
  pharmacy can see them.
- **Employee (pharmacist)** — the till, stock lookup and customers in *their*
  pharmacy. No suppliers, purchases, employees, sales or expiry reports, no
  exports of sales/customer data, no plan changes and no organization edits.
- **Super Admin (platform operator)** — every workspace through `/superadmin`:
  the organization registry, plan, status, trial clock, members and the data
  browser. Every action is audited.

Migration `0006_organization_profile.sql` adds the registry columns
(`email`, `phone`, `address`, `invoice_from_name`, `invoice_from_email`) and the
`update_my_workspace_profile` RPC, which only an administrator of an active,
non-expired workspace may call. Paste `supabase/setup.sql` (or just that one
file) in the Supabase SQL editor.

## 4e. Customer e-bills by email (Resend)

Customers get a real invoice PDF in their inbox, sent as **this pharmacy**, to
the address already on their record.

1. **Create a Resend account** at resend.com and add a sending domain under
   **Domains → Add Domain**. Publish the SPF and DKIM DNS records it shows; the
   domain must read *Verified* before it can send to anyone but you.
2. **Create an API key** (Resend → API Keys, sending access) and put it in the
   deployment:

   ```bash
   RESEND_API_KEY=re_...
   INVOICE_FROM_EMAIL="Your Pharmacy <invoices@yourdomain.com>"
   ```

   `INVOICE_FROM_EMAIL` is the platform-wide default sender. Use it when one
   verified domain serves every pharmacy (recommended: `invoices@yourdomain.com`
   with each pharmacy's own address as reply-to).
3. **Give each pharmacy its own identity** in *Settings → Pharmacy*: sender name
   and sender address, plus the pharmacy's phone, email and address that print on
   the invoice. The per-pharmacy sender only works if that address is on a domain
   verified in Resend; otherwise the provider rejects the message.
4. **Test it**: add an email to a customer, ring up a sale, open the sale and press
   **Email invoice**. The result — sent or failed, with the provider's reply — is
   stored in `invoice_email` and shown on the sale.
5. **Trial and suspension still apply**: an ended trial cannot send e-bills until
   a plan is active, and a suspended workspace cannot send at all.

Without `RESEND_API_KEY` the button explains what is missing and the PDF still
downloads. Without any sender configured the app falls back to Resend's
`onboarding@resend.dev`, which only delivers to the Resend account owner — useful
for a smoke test, never for customers.

## 5. Deploy to Vercel

**From this folder (no Git required):**

```bash
cd web
npx vercel                 # first run creates the project
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel --prod
```

**From GitHub:** push the repository, then in Vercel *Add New → Project* set
**Root Directory** to `web` (this app lives in a subfolder of a larger repo) and
add the same two environment variables under *Settings → Environment Variables*.
After the first deploy, add your Vercel domain to **Supabase → Authentication →
URL Configuration → Site URL / Redirect URLs**.

## 6. How stock stays correct

`meds.med_qty` is never edited directly by hand:

- recording a **purchase** adds its quantity, editing re-balances it, deleting removes it
- recording a **sale line** deducts its quantity; deleting the sale gives it back
- `med_qty` has a `check (med_qty >= 0)` constraint, so overselling fails loudly
  instead of silently going negative

## 7. Dashboard, reports and exports

`/dashboard` answers "how is the pharmacy doing" in one screen:

- KPI cards with period-over-period change and a 14-bucket sparkline: revenue,
  invoices, average basket and estimated margin
- revenue trend (daily, or monthly for long windows) and a category donut
- best sellers, revenue by weekday, reorder list and expiry list
- recent invoices and the audit trail
- a `7 / 30 / 90 days / All time` switch. If the selected window holds no
  sales, the page falls back to the all-time view and says so, instead of
  showing a wall of zeroes

Charts are hand-written SVG (`src/components/charts.tsx`), so they ship no
client JavaScript, animate with CSS, and respect `prefers-reduced-motion`.

Reports gained filters, totals and CSV downloads:

| Report | URL | Export |
| --- | --- | --- |
| Sales | `/reports/sales?from=&to=` | `/reports/export?type=sales` |
| Stock | `/reports/stock?q=&category=&low=1` | `/reports/export?type=stock` |
| Expiry | `/reports/expiry?within=30\|60\|90\|180` | `/reports/export?type=expiry` |
| Activity | `/activity?entity=&action=` | `/reports/export?type=activity` |

Exports run as the signed-in user, so row level security decides what leaves
the workspace, and administrator-only reports are re-checked in the route
handler. Values are quoted and formula-escaped for spreadsheets.

## 8. Accounts, staff and the audit trail

Migration `0004_accounts_and_audit.sql` adds the last pieces:

- `update_my_profile(name)` and `update_my_workspace(name)` — narrow RPCs, since
  `profiles` and `workspaces` are not writable by clients
- `adopt_staff(user_id, name)` / `remove_staff(user_id)` — attach an existing
  account to your pharmacy as a **pharmacist**, or detach it again
- `audit_log` plus triggers on meds, suppliers, customers, employees, purchases
  and sales, recording who changed what, when
- `v_workspace_members` — the roster shown on `/settings`

**If your project already has the database**, run just that file:

```sql
-- Supabase → SQL Editor
-- paste supabase/migrations/0004_accounts_and_audit.sql
```

Fresh projects can keep pasting `supabase/setup.sql`, which now includes it.

Adding staff from **Settings → Team access** creates the sign-in with the
Supabase admin API, so it needs one more environment variable on the server:

```bash
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase → Project Settings → API → service_role
```

Without it the form explains what is missing; nothing else in the app depends
on it. The key is used only in `src/lib/actions/staff.ts` and never reaches the
browser. Everyone added that way joins *your* workspace as a pharmacist and can
be removed from the same screen.

## 8b. Running the platform from the console

**Workspaces → a pharmacy** opens the page that changes accounts, not just plans:

- **Remove** drops one member. If it was their last pharmacy, their profile goes
  with it, so the login is cleanly detached (signing in says so) instead of
  holding a role in a pharmacy that no longer lists them. The auth account is
  kept, so this is reversible.
- **Attach or restore an account** takes an email and a role. That is the repair
  path after a membership or profile went missing: the profile is recreated and
  the membership put back. An address with no account needs a temporary password
  and the empty trial workspace the signup trigger creates is removed, so the
  person belongs only to the pharmacy you attached them to.
- **Close this pharmacy** deletes the tenant and every row inside it, and detaches
  the logins it would otherwise strand. The confirmation has to match the
  pharmacy name; it cannot be undone.

The raw **Data** browser no longer deletes pharmacies, memberships or profiles: a
row there would remove every member of a pharmacy or revoke a login without the
cleanup. Those tables show `locked`, and the action refuses the same tables
server-side. Each of the flows above is written to the operator audit log.

## 9. Navigation speed

Section changes used to wait on two Supabase Auth round trips before any data
was even requested: one in the proxy (middleware) and one in the app layout.

- the proxy now treats "no session cookie" as anonymous and verifies the JWT
  with `getClaims()`, which checks the signature locally against the cached
  JWKS instead of asking the Auth server on every click
- the app layout fetches the profile and the workspace membership in parallel
- `(app)/loading.tsx` and `dashboard/loading.tsx` paint a skeleton immediately,
  so a click is acknowledged before the server finishes
- `staleTimes` keeps recently visited sections in the client router cache for
  30 seconds, making back/forward instant
- the dashboard probes the latest sale once, so a quiet workspace does not load
  the whole dashboard twice

Measured locally, cold then warm: dashboard 1.77s → 0.55s, other sections
0.70s → 0.32s. Public marketing pages are statically prerendered (~10ms).

If the deployment still feels slow, place it in the same region as the
Supabase project (Vercel → Settings → Functions → Region); cross-continent
database round trips dominate every remaining millisecond.

## 10. Hardening notes

- Realtime-facing helpers (`is_member`, `trial_expired`, `record_sale`) are
  `security definer` functions with `search_path` pinned; `record_sale` derives
  every price from locked inventory rows
- `adopt_staff` refuses accounts that already run a pharmacy of their own, so
  an administrator cannot pull another tenant's account (and data) into theirs
- CSV exports quote and formula-escape every cell, and administrator-only
  reports are re-checked inside the route handler, not just hidden in the UI
- reveal animations only hide content once the IntersectionObserver is armed,
  so the page still reads with JavaScript disabled
- `npm audit --omit=dev` reports no known vulnerabilities
