"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/store/provider";
import { SESSION_EXPIRED_EVENT } from "@/lib/session";

/** Reacts to api-client's `notifySessionExpired()` (fired on any 401 from an
 * authenticated wallet_server call — see api-client.ts): the access token
 * has already been cleared by then, so this just drops any cached
 * signed-in-only data and sends the user back to /login. Lives inside
 * QueryClientProvider so it can reach the same queryClient every page uses. */
function SessionExpiredHandler({ queryClient }: { queryClient: QueryClient }) {
  const router = useRouter();

  useEffect(() => {
    function handleSessionExpired() {
      queryClient.clear();
      if (!window.location.pathname.startsWith("/login")) {
        router.push("/login?reason=expired");
      }
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [queryClient, router]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1 },
        },
      })
  );

  return (
    // attribute="class" toggles the .dark class globals.css's `@custom-variant
    // dark (&:is(.dark *))` (see globals.css) keys off — defaultTheme="dark"
    // keeps today's look for anyone who hasn't picked yet, and enableSystem is
    // off so the OS's own light/dark setting never silently overrides that
    // until someone actually uses the toggle (see theme-toggle.tsx).
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <StoreProvider>
        <QueryClientProvider client={queryClient}>
          <SessionExpiredHandler queryClient={queryClient} />
          {children}
          <Toaster richColors position="top-center" />
        </QueryClientProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
