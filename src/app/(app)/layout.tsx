import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { TrialBanner } from "@/components/trial-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAccess } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAccess();

  return (
    <SidebarProvider>
      <AppSidebar role={access.profile.role} pharmacyName={access.pharmacyName} />
      <SidebarInset className="bg-transparent">
        <AppTopbar profile={access.profile} pharmacyName={access.pharmacyName} />
        <TrialBanner access={access} />
        <div className="relative flex-1 p-4 md:p-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_30%_0%,oklch(0.78_0.16_158_/_0.07),transparent_70%)]"
            aria-hidden
          />
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}