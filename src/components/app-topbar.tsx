import Link from "next/link";
import { Crown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";

export function AppTopbar({
  profile,
  pharmacyName,
}: {
  profile: Profile;
  pharmacyName?: string;
}) {
  const label = profile.full_name?.trim() || "Signed in";
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/75 px-3 backdrop-blur-2xl md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5 md:hidden" />

      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">{pharmacyName ?? "Pharmacia"}</p>
        <p className="hidden text-[10px] text-muted-foreground sm:block">
          {profile.role === "admin" ? "Administrator · full control" : "Employee · counter access"}
        </p>
      </div>

      <span className="flex-1" />

      <ThemeToggle />

      <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 text-primary sm:inline-flex">
        <Link href="/upgrade">
          <Crown className="size-3.5" /> Premium
        </Link>
      </Button>

      <Badge
        variant={profile.role === "admin" ? "default" : "secondary"}
        className="hidden text-[10px] sm:inline-flex"
      >
        {profile.role === "admin" ? "Administrator" : "Employee"}
      </Badge>

      <Link
        href="/settings"
        className="flex items-center gap-2 rounded-full pl-1 transition-colors hover:text-primary"
        title="Account settings"
      >
        <Avatar className="size-7 ring-1 ring-border">
          <AvatarFallback className="bg-primary/15 text-xs text-primary">{initial}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline">{label}</span>
      </Link>

      <Button asChild variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Settings">
        <Link href="/settings">
          <Settings />
        </Link>
      </Button>

      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          <LogOut />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </form>
    </header>
  );
}
