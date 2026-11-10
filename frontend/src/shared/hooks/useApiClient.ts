"use client";
import { useContext } from "react";
import { ApiClientContext } from "@/shared/contexts/ApiClientContext";

export function useApiClient() {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("useApiClient must be used inside AppProviders.");
  return client;
}
