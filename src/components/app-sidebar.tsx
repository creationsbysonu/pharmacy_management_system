"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Pill } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { navFor, isActivePath } from "@/lib/nav";
import type { Profile } from "@/lib/types";

export function AppSidebar({
  role,
  pharmacyName,
}: {
  role: Profile["role"];
  pharmacyName: string;
}) {
  const pathname = usePathname();
  const items = navFor(role);

  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_22px_-8px_oklch(0.78_0.16_158_/_0.9)]">
            <Pill className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span
              className="font-heading truncate text-sm font-semibold"
              title={pharmacyName}
            >
              {pharmacyName}
            </span>
            <span className="mt-1 truncate text-[10px] text-muted-foreground">
              {role === "admin" ? "Administrator" : "Employee"} · Pharmacia
            </span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {Object.entries(groups).map(([group, groupItems]) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              {group}
            </SidebarGroupLabel>
            <SidebarMenu>
              {groupItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={active}
                      className={
                        active
                          ? "bg-primary/12 text-primary data-[active=true]:bg-primary/12 data-[active=true]:text-primary"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      }
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <Link
          href="/upgrade"
          className="group flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/8 px-2.5 py-2 text-xs text-primary transition-colors hover:bg-primary/15 group-data-[collapsible=icon]:hidden"
        >
          <Crown className="size-3.5 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">Premium</span>
            <span className="truncate text-[10px] text-primary/70">Plans from ₹999/mo</span>
          </span>
        </Link>
        <SidebarTrigger className="group-data-[collapsible=icon]:mx-auto" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
