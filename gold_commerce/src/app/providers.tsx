"use client";

import { useState } from "react";
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
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <VisitorTracker />
        {children}
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </StoreProvider>
  );
}
