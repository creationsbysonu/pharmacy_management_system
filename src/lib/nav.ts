import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  CalendarClock,
  History,
  LayoutDashboard,
  PackagePlus,
  Pill,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/pos", label: "New sale", icon: ShoppingCart, group: "Overview" },

  { href: "/inventory", label: "Inventory", icon: Pill, group: "Catalog" },
  { href: "/suppliers", label: "Suppliers", icon: Truck, group: "Catalog", adminOnly: true },
  { href: "/purchases", label: "Purchases", icon: PackagePlus, group: "Catalog", adminOnly: true },

  { href: "/customers", label: "Customers", icon: Users, group: "People" },
  { href: "/employees", label: "Employees", icon: UserCog, group: "People", adminOnly: true },

  { href: "/sales", label: "Sales", icon: Receipt, group: "Records" },

  { href: "/reports/stock", label: "Stock report", icon: Boxes, group: "Reports" },
  { href: "/reports/sales", label: "Sales report", icon: BarChart3, group: "Reports", adminOnly: true },
  { href: "/reports/expiry", label: "Expiry report", icon: CalendarClock, group: "Reports", adminOnly: true },
  { href: "/activity", label: "Activity", icon: History, group: "Reports", adminOnly: true },

  { href: "/settings", label: "Settings", icon: Settings, group: "Account" },
];

export function navFor(role: "admin" | "pharmacist"): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
