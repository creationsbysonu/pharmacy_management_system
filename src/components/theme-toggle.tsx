"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Day/night switch.
 *
 * Both icons are in the markup and CSS decides which one is visible (the `dark`
 * class lives on <html>), so there is no "mounted" flag and no flash of the
 * wrong icon during hydration.
 */
export function ThemeToggle({
  className,
  size = "icon-sm",
}: {
  className?: string;
  size?: "icon-sm" | "sm";
}) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    // `resolvedTheme` can be undefined on the very first click before the
    // provider reports; the document class is the fallback truth.
    const current =
      resolvedTheme ??
      (document.documentElement.classList.contains("light") ? "light" : "dark");
    setTheme(current === "dark" ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={toggle}
      className={cn("relative", className)}
      aria-label="Switch between day and night theme"
      title="Day / night"
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
      {size === "sm" ? <span className="sr-only">Theme</span> : null}
    </Button>
  );
}
