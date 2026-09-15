"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";

/** Light/dark toggle — next-themes swaps the `dark` class on <html> (see
 * providers.tsx), which globals.css's full :root/.dark token pair then
 * drives every shadcn component through automatically.
 *
 * `mounted` guards against a hydration mismatch: next-themes only knows the
 * resolved theme once its pre-hydration script has run in the browser, so
 * the server render (and the client's first paint, before that effect fires)
 * can't know whether to show the sun or the moon — render neither until then
 * rather than guessing and flashing the wrong icon. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? t.nav.switchToLight : t.nav.switchToDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && (isDark ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />)}
    </Button>
  );
}
