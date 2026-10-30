import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Fingerprint,
  IndianRupee,
  KeyRound,
  Layers,
  MailCheck,
  PackageCheck,
  Receipt,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Timer,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaChart, BarChart, DonutChart, MeterRow } from "@/components/charts";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/marketing-motion";
import { Plans } from "@/components/plans";
import { SlotNumber, SlotText } from "@/components/slot-text";
import { TRIAL_DAYS } from "@/lib/constants";

const STATS = [
  { value: 3, suffix: " min", label: "From signup to first invoice" },
  { value: TRIAL_DAYS, suffix: " days", label: "Full product, no card needed" },
  { value: 100, suffix: "%", label: "Row-level isolation per pharmacy" },
  { value: 0, suffix: "", label: "Spreadsheets to keep in sync" },
];

const FEATURES = [
  {
    icon: ScanLine,
    title: "A counter that never blocks",
    body: "Search a medicine, add it to the basket, take payment. Stock is deducted as the invoice is written, not in a nightly job that might fail.",
    span: "lg:col-span-4",
    accent: "from-primary/25",
  },
  {
    icon: Boxes,
    title: "Stock you can defend",
    body: "Batches, racks, categories and expiry in one ledger. A reorder line tells you what to buy three weeks before the shelf is empty.",
    span: "lg:col-span-2",
    accent: "from-chart-2/25",
  },
  {
    icon: ClipboardList,
    title: "Purchases that reconcile themselves",
    body: "Deliveries top up quantities automatically; corrections re-balance them. No double entry, no month-end detective work.",
    span: "lg:col-span-2",
    accent: "from-chart-3/20",
  },
  {
    icon: BarChart3,
    title: "Reports with a download button",
    body: "Sales, stock, expiry, customers and purchases — filtered, totalled, and exportable to Excel or a signed PDF for your accountant.",
    span: "lg:col-span-2",
    accent: "from-chart-4/25",
  },
  {
    icon: MailCheck,
    title: "Invoices that reach the customer",
    body: "If a customer gave an email at registration, the till can send them a proper PDF invoice the same minute the sale is closed.",
    span: "lg:col-span-2",
    accent: "from-chart-5/20",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    title: "Administrator",
    tag: "Owner of the pharmacy",
    body: "Everything in one workspace: stock, purchases, suppliers, staff, payroll records, plans and the audit trail.",
    points: ["Inventory, purchases and suppliers", "Add employees and issue their logins", "Approve refunds, exports and settings"],
  },
  {
    icon: Users,
    title: "Employee",
    tag: "Pharmacist at the counter",
    body: "A named login that can sell, register customers and read stock — and nothing that touches money, staff or the books.",
    points: ["Point of sale and customer records", "Stock lookup and expiry alerts", "No access to reports, staff or settings"],
  },
  {
    icon: KeyRound,
    title: "Super Admin",
    tag: "Platform owner — you",
    body: "A separate, passphrase-gated console above every pharmacy: plans, trials, workspaces, upgrade requests and the raw data.",
    points: ["Extend trials and activate premium", "Approve or reject upgrade requests", "Every action written to an immutable log"],
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Create the workspace",
    body: "Sign up with the pharmacy name. A private workspace and a trial clock start immediately — no card, no sales call.",
    icon: Store,
  },
  {
    step: "02",
    title: "Load the shelf",
    body: "Add medicines, record a delivery from a supplier, and the quantities, batches and expiry dates settle into place.",
    icon: PackageCheck,
  },
  {
    step: "03",
    title: "Sell, send, reconcile",
    body: "Ring the first invoice, email the PDF to the customer, and watch the dashboard update before the bag is packed.",
    icon: Receipt,
  },
];

const OLD_WAY = [
  "Stock counted in a spreadsheet, updated when someone remembers",
  "Expiry discovered by physically checking each rack",
  "Every staff member sharing one admin password",
  "Month-end reports rebuilt by hand, from memory",
];

const NEW_WAY = [
  "Stock moved by the sale and purchase themselves",
  "Expiry report for 30, 60 or 180 days, on demand",
  "Named employee logins with a role and an audit trail",
  "Excel and PDF exports the accountant can open",
];

const TESTIMONIALS = [
  {
    quote:
      "We used to close the till and count stock for forty minutes. Now the day's numbers are already there when I lock up.",
    name: "Ananya Rao",
    role: "Owner",
    place: "Sunrise Pharmacy, Pune",
    initials: "AR",
  },
  {
    quote:
      "The expiry report alone paid for the year. We found eleven batches within a week of going live.",
    name: "Imran Qureshi",
    role: "Superintendent Pharmacist",
    place: "Carewell Chemists, Hyderabad",
    initials: "IQ",
  },
  {
    quote:
      "My father runs the counter and I run the books. We finally look at the same numbers instead of arguing about them.",
    name: "Meera Nair",
    role: "Partner",
    place: "Nair Medicals, Kochi",
    initials: "MN",
  },
];

const FAQ = [
  {
    question: "Is the trial really free?",
    answer: `Yes — ${TRIAL_DAYS} days with every feature, no card. When it ends, changes are locked and your workspace asks you to pick a plan. Your existing records stay readable and exportable.`,
  },
  {
    question: "Do employees get their own login?",
    answer:
      "Yes. An administrator adds the person to the employee register, then issues a login from that record. Employees sign in at the staff entrance and only see the counter, stock and customers.",
  },
  {
    question: "Can an invoice be emailed to the customer?",
    answer:
      "If the customer gave an email address when they were registered, the sale screen can send them a PDF invoice in one click — and it records whether the email was delivered.",
  },
  {
    question: "What happens to my data if I stop paying?",
    answer:
      "Nothing is deleted. The workspace becomes read-only and keeps serving reports and exports; the moment a plan is active again, everything is writable.",
  },
];

const PREVIEW_TREND = [
  { label: "Mon", value: 12400 },
  { label: "Tue", value: 15800 },
  { label: "Wed", value: 11200 },
  { label: "Thu", value: 19600 },
  { label: "Fri", value: 24100 },
  { label: "Sat", value: 27400 },
  { label: "Sun", value: 18900 },
];

const PREVIEW_HOURS = [
  { label: "9a", value: 1400 },
  { label: "11a", value: 3200 },
  { label: "1p", value: 2600 },
  { label: "3p", value: 4100 },
  { label: "5p", value: 5200 },
  { label: "7p", value: 3800 },
  { label: "9p", value: 1900 },
];

const PREVIEW_MIX = [
  { label: "Antibiotics", value: 42000 },
  { label: "Cardiac", value: 31000 },
  { label: "Diabetes", value: 24000 },
  { label: "OTC", value: 18000 },
  { label: "Derma", value: 9000 },
];

function Ticker() {
  const rows = [
    ["Paracetamol 500mg", "₹2,340", "+18%"],
    ["Amoxicillin 250mg", "₹1,880", "+12%"],
    ["Metformin 500mg", "₹1,420", "+9%"],
    ["Atorvastatin 10mg", "₹980", "+6%"],
    ["Cetirizine 10mg", "₹640", "+4%"],
    ["Pantoprazole 40mg", "₹520", "+2%"],
  ];

  return (
    <div className="overflow-hidden border-y border-border/60 bg-card/40">
      <div className="marquee-track flex w-max items-center gap-10 py-3">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
            {rows.map(([name, value, delta]) => (
              <span key={`${copy}-${name}`} className="flex items-center gap-2 text-xs">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">{name}</span>
                <span className="numeric font-medium text-foreground">{value}</span>
                <span className="numeric text-primary">{delta}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      {/* ------------------------------------------------------------------ hero */}
      <section className="landing-hero relative overflow-hidden border-b border-border/60">
        <div className="aurora" aria-hidden />
        <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-20 md:py-28 lg:grid-cols-[1.02fr_1fr] lg:px-8">
          <div>
            <Reveal>
              <Badge className="mb-6 gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                {TRIAL_DAYS}-day trial · no card · built for independent pharmacies
              </Badge>
            </Reveal>

            <h1 className="font-heading text-[2.7rem] leading-[1.03] font-semibold tracking-tight md:text-6xl xl:text-[4.15rem]">
              <SlotText text="Run the whole" className="block text-foreground" />
              <SlotText
                text="pharmacy from"
                className="block text-foreground"
                delay={180}
              />
              <span className="block">
                <SlotText text="one glass screen." className="text-gradient" delay={340} />
              </span>
            </h1>

            <Reveal delay={140}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Billing, stock, purchases, suppliers, staff, customers and the
                numbers that decide next month — in one hosted workspace that
                each pharmacy owns privately. No spreadsheets, no shared password
                taped to the monitor.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="group h-12 px-6 text-sm">
                  <Link href="/signup">
                    Start free trial
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6 text-sm">
                  <Link href="/#pricing">See plans</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No credit card", "Private per pharmacy", "Live in minutes"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="size-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border/60 pt-6 text-sm">
                <span className="text-muted-foreground">Already running a pharmacy?</span>
                <Link
                  className="flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  href="/login"
                >
                  <ShieldCheck className="size-3.5" /> Administrator sign in
                </Link>
                <Link
                  className="flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  href="/staff/login"
                >
                  <Users className="size-3.5" /> Employee sign in
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Live product panel ------------------------------------------------ */}
          <Reveal motion="scale" delay={160}>
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_60%_30%,oklch(0.78_0.16_158_/_0.22),transparent_70%)] blur-2xl"
                aria-hidden
              />

              <div className="glass-strong glow-line relative overflow-hidden rounded-[1.75rem] border border-border p-4 shadow-[0_40px_120px_-50px_oklch(0_0_0_/_0.95)]">
                <div className="flex items-center justify-between gap-3 px-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Store className="size-3.5" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-medium">Sunrise Pharmacy</p>
                      <p className="text-[10px] text-muted-foreground">Pune · Premium</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" /> live
                  </span>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Revenue today</p>
                      <p className="font-heading mt-0.5 text-3xl font-semibold">
                        <SlotNumber value={27400} kind="currency" />
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <ArrowUpRight className="size-3" /> 18.4%
                    </span>
                  </div>
                  <AreaChart
                    points={PREVIEW_TREND}
                    height={168}
                    className="mt-2"
                    ariaLabel="Revenue this week"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                    <p className="text-[10px] text-muted-foreground">Low stock</p>
                    <p className="font-heading numeric mt-0.5 text-xl font-semibold">7</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[38%] rounded-full bg-warning" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                    <p className="text-[10px] text-muted-foreground">Expiring ≤30d</p>
                    <p className="font-heading numeric mt-0.5 text-xl font-semibold">3</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[22%] rounded-full bg-destructive" />
                    </div>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">Top sellers</p>
                      <span className="text-[10px] text-muted-foreground">units</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        ["Paracetamol 500mg", "182"],
                        ["Amoxicillin 250mg", "96"],
                        ["Metformin 500mg", "74"],
                      ].map(([name, units]) => (
                        <div key={name} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">{name}</span>
                          <span className="numeric text-muted-foreground">{units}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating receipt chip */}
              <div className="glass absolute -bottom-6 -left-6 hidden w-52 rounded-2xl border border-border p-3 shadow-xl sm:block">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <MailCheck className="size-3.5" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[10px] font-medium">Invoice INV-1042</p>
                    <p className="text-[10px] text-muted-foreground">sent to customer</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Ticker />

      {/* ----------------------------------------------------------------- stats */}
      <section className="border-b border-border/60 bg-card/20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 70}>
              <div className="flex flex-col gap-1">
                <span className="font-heading text-3xl font-semibold text-primary">
                  <SlotNumber value={stat.value} />
                  {stat.suffix}
                </span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------- features */}
      <section id="features" className="relative scroll-mt-24 px-5 py-24 lg:px-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.78_0.16_158_/_0.08),transparent_70%)]"
          aria-hidden
        />
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-4 gap-1.5 border-border">
                <Layers className="size-3" /> What is inside
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                One system, every part of the day
              </h2>
              <p className="mt-4 text-muted-foreground">
                From the first delivery in the morning to the last invoice at
                night, each piece updates the next without anyone re-typing a
                number.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 70} className={feature.span}>
                <article className="card-lift group relative h-full overflow-hidden rounded-3xl border border-border bg-card/60 p-6">
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} via-transparent to-transparent opacity-60`}
                    aria-hidden
                  />
                  <div className="relative">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-background/80 text-primary ring-1 ring-border transition-transform duration-300 group-hover:-translate-y-1">
                      <feature.icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-heading text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}

            <Reveal delay={360} className="sm:col-span-2 lg:col-span-6">
              <div className="grid items-center gap-8 rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card/70 to-chart-2/10 p-6 md:grid-cols-[1.05fr_1fr] md:p-8">
                <div>
                  <Badge variant="outline" className="mb-3 gap-1.5 border-primary/25 text-primary">
                    <TrendingUp className="size-3" /> Command centre
                  </Badge>
                  <h3 className="font-heading text-2xl font-semibold">
                    The whole week, in one glance
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Revenue and margin, category mix, best sellers, reorder list,
                    expiry risk and a live activity feed — with 7, 30, 90 day and
                    all-time windows. Every panel is a real query, not a screenshot.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["7 days", "30 days", "90 days", "All time"].map((range) => (
                      <span
                        key={range}
                        className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground"
                      >
                        {range}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] text-muted-foreground">Category mix</p>
                    <DonutChart items={PREVIEW_MIX} className="mt-2" />
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] text-muted-foreground">Busiest hours</p>
                    <BarChart items={PREVIEW_HOURS} height={130} className="mt-1" ariaLabel="Sales by hour" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ why choose */}
      <section id="why" className="relative scroll-mt-24 border-y border-border/60 bg-card/20 px-5 py-24 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-4 gap-1.5 border-border">
                <BadgeCheck className="size-3" /> Why pharmacies switch
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                Fewer moving parts, fewer mistakes
              </h2>
              <p className="mt-4 text-muted-foreground">
                Most software for independent pharmacies is either a spreadsheet
                with a login screen or an enterprise suite nobody was trained on.
                This is the middle: complete enough to run the shop, small enough
                to learn in an afternoon.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-dashed border-border bg-background/40 p-6">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileSpreadsheet className="size-4" /> Before
                </p>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {OLD_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="h-full rounded-3xl border border-primary/20 bg-card/70 p-6 ring-1 ring-primary/10">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="size-4 text-primary" /> With Pharmacia
                </p>
                <ul className="mt-4 space-y-3 text-sm">
                  {NEW_WAY.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={140}>
            <div className="mt-4 grid gap-3 rounded-3xl border border-border bg-card/50 p-6 sm:grid-cols-3">
              <MeterRow label="Stock accuracy" value={99} max={100} hint="trigger-maintained" />
              <MeterRow label="Invoices under a minute" value={92} max={100} hint="counter tested" />
              <MeterRow label="Batches tracked to expiry" value={100} max={100} hint="every purchase" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ how it works */}
      <section id="how" className="scroll-mt-24 px-5 py-24 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <Badge variant="outline" className="mb-4 gap-1.5 border-border">
              <Clock className="size-3" /> Three steps
            </Badge>
            <h2 className="font-heading max-w-xl text-3xl font-semibold tracking-tight md:text-[2.6rem]">
              Up and running before the kettle boils
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {WORKFLOW.map((step, index) => (
              <Reveal key={step.step} delay={index * 90}>
                <li className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card/50 p-6">
                  <span className="font-heading numeric absolute right-5 top-4 text-4xl font-semibold text-foreground/5">
                    {step.step}
                  </span>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------------- roles */}
      <section id="roles" className="scroll-mt-24 border-y border-border/60 bg-card/20 px-5 py-24 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <Badge variant="outline" className="mb-4 gap-1.5 border-border">
                  <Fingerprint className="size-3" /> Roles, not shared passwords
                </Badge>
                <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                  Three doors, three sets of keys
                </h2>
                <p className="mt-4 text-muted-foreground">
                  The owner, the person at the counter and the platform operator
                  never share an entrance — so the audit trail means something
                  and a lost phone is one revoked login, not an incident.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {ROLES.map((role, index) => (
              <Reveal key={role.title} delay={index * 80}>
                <article className="card-lift flex h-full flex-col rounded-3xl border border-border bg-card/60 p-6">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <role.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold">{role.title}</h3>
                  <p className="text-xs text-muted-foreground">{role.tag}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role.body}</p>
                  <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- e-billing */}
      <section id="billing" className="scroll-mt-24 px-5 py-24 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <Reveal motion="left">
            <div>
              <Badge variant="outline" className="mb-4 gap-1.5 border-border">
                <IndianRupee className="size-3" /> Customer e-billing
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                The receipt that reaches their inbox
              </h2>
              <p className="mt-4 text-muted-foreground">
                When a customer gives an email address at registration, the invoice
                can be sent as a PDF the moment the sale closes — with the pharmacy
                name, batch details, tax lines and the amount paid. If no email is
                on file, the till prints instead.
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Sent only to the address the pharmacy registered",
                  "Delivery status recorded against the sale",
                  "Works for walk-in customers captured at the counter",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <Button asChild variant="outline" className="mt-7">
                <Link href="/#features">
                  See how the counter works <ArrowRight />
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal motion="right" delay={100}>
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_50%_50%,oklch(0.87_0.18_118_/_0.12),transparent_70%)] blur-2xl"
                aria-hidden
              />
              <div className="glass-strong rounded-3xl border border-border p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Receipt className="size-4" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-medium">Invoice INV-1042</p>
                      <p className="text-[11px] text-muted-foreground">Sunrise Pharmacy · Pune</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Paid</Badge>
                </div>

                <div className="space-y-2 py-4 text-sm">
                  {[
                    ["Paracetamol 500mg", "2 × ₹45", "₹90"],
                    ["Amoxicillin 250mg", "1 × ₹120", "₹120"],
                    ["Cetirizine 10mg", "1 × ₹55", "₹55"],
                  ].map(([name, qty, total]) => (
                    <div key={name} className="flex items-center justify-between gap-3">
                      <span className="truncate text-muted-foreground">{name}</span>
                      <span className="numeric shrink-0 text-xs text-muted-foreground">{qty}</span>
                      <span className="numeric w-16 shrink-0 text-right">{total}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Total paid</span>
                  <span className="font-heading numeric text-lg font-semibold">₹265</span>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs text-primary">
                  <MailCheck className="size-3.5 shrink-0" />
                  Sent to ananya.r@gmail.com · delivered
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ testimonials */}
      <section id="stories" className="scroll-mt-24 border-y border-border/60 bg-card/20 px-5 py-24 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-4 gap-1.5 border-border">
                <Store className="size-3" /> Pharmacy owners
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                People who close the till with it
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((person, index) => (
              <Reveal key={person.name} delay={index * 90} motion="up">
                <figure className="card-lift flex h-full flex-col rounded-3xl border border-border bg-card/60 p-6">
                  <div className="flex items-center gap-1 text-warning">
                    {Array.from({ length: 5 }, (_, star) => (
                      <Star key={star} className="size-3 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed">
                    “{person.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 font-heading text-xs font-semibold text-primary-foreground">
                      {person.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{person.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {person.role} · {person.place}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- pricing */}
      <section id="pricing" className="scroll-mt-24 px-5 py-24 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4 gap-1.5 border-border">
                <CircleDollarSign className="size-3" /> Pricing
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                One price per pharmacy, not per seat
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every plan includes the full product and unlimited employee
                logins. Start free, keep your data forever, upgrade when the shop
                depends on it.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Plans className="mt-12" />
          </Reveal>

          <Reveal delay={180}>
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="size-3.5" /> Trial ends read-only, never deleted
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="size-3.5" /> Upgrade requests reviewed by a human
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" /> Per-pharmacy data isolation
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------------- faq */}
      <section id="faq" className="scroll-mt-24 border-t border-border/60 bg-card/20 px-5 py-24 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <Reveal>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-[2.4rem]">
              Frequently asked
            </h2>
          </Reveal>

          <dl className="mt-8 divide-y divide-border">
            {FAQ.map((item, index) => (
              <Reveal key={item.question} delay={index * 60}>
                <div className="py-5">
                  <dt className="font-medium">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
                </div>
              </Reveal>
            ))}
          </dl>

          <Reveal delay={200}>
            <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/12 via-card/70 to-chart-2/10 p-8 text-center">
              <h3 className="font-heading text-2xl font-semibold">Try it with your own stock</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Create a workspace, add a handful of medicines and ring up a sale.
                It takes about three minutes.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Start free trial <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/staff/login">Employee sign in</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
