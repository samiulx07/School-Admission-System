import type { AxiosInstance } from "axios";
import type { ClassSummary } from "@/shared/types/classes";

export const classQueryKeys = { all: ["classes"] as const };

export async function getClasses(client: AxiosInstance, signal?: AbortSignal): Promise<ClassSummary[]> {
  const response = await client.get<ClassSummary[]>("/classes", { signal });
  return response.data;
}
