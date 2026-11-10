"use client";
import { createContext } from "react";
import type { AxiosInstance } from "axios";

export const ApiClientContext = createContext<AxiosInstance | null>(null);
