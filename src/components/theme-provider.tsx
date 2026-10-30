"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/**
 * Day/night theme for the whole product.
 *
 * next-themes writes `class="dark"` or `class="light"` on <html> before paint, so
 * the marketing site, the counter, the settings screens and the operator console
 * all switch together and the choice survives navigation and reloads.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="pharmacia-theme"
    >
      {children}
    </NextThemes>
  );
}
