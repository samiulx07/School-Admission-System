"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@/services/apiClient";
import { ApiClientContext } from "../ApiClientContext";
import { StudentIdentityProvider } from "../StudentIdentityProvider/StudentIdentityProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [apiClient] = useState(createApiClient);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true }, mutations: { retry: false } },
  }));
  return <ApiClientContext.Provider value={apiClient}><QueryClientProvider client={queryClient}><StudentIdentityProvider>{children}</StudentIdentityProvider></QueryClientProvider></ApiClientContext.Provider>;
}
