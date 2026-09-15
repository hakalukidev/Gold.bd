"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/store/provider";
import { VisitorTracker } from "@/components/visitor-tracker";

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
    // dark (&:is(.dark *))` keys off — defaultTheme="dark" keeps today's look
    // for anyone who hasn't picked yet, and enableSystem is off so the OS's
    // own light/dark setting never silently overrides that until someone
    // actually uses the toggle (see theme-toggle.tsx).
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <StoreProvider>
        <QueryClientProvider client={queryClient}>
          <VisitorTracker />
          {children}
          <Toaster richColors position="top-center" />
        </QueryClientProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
