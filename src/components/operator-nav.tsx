"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/superadmin", label: "Overview" },
  { href: "/superadmin/workspaces", label: "Workspaces" },
  { href: "/superadmin/analytics", label: "Analytics" },
  { href: "/superadmin/requests", label: "Requests" },
  { href: "/superadmin/data", label: "Data" },
  { href: "/superadmin/audit", label: "Audit" },
];

export function OperatorNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto text-sm">
      {LINKS.map((link) => {
        const active =
          link.href === "/superadmin"
            ? pathname === "/superadmin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
