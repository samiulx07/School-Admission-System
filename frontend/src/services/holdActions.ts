import { isAxiosError, type AxiosInstance } from "axios";

export type HoldAction = "confirm" | "cancel";
export type ConfirmedHold = { holdId: string; status: "CONFIRMED" };

export async function confirmHold(client: AxiosInstance, holdId: string, studentId: string, signal: AbortSignal): Promise<ConfirmedHold> {
  const response = await client.post<ConfirmedHold>(`/holds/${encodeURIComponent(holdId)}/confirm`, undefined, { headers: { "X-Student-Id": studentId }, signal });
  return response.data;
}

export async function cancelHold(client: AxiosInstance, holdId: string, studentId: string, signal: AbortSignal): Promise<void> {
  await client.delete(`/holds/${encodeURIComponent(holdId)}`, { headers: { "X-Student-Id": studentId }, signal });
}

export function holdActionError(error: unknown, action: HoldAction): string {
  if (isAxiosError(error)) {
    switch (error.response?.status) {
      case 400: return "Check your 17-digit student registration number and try again.";
      case 403: return "This registration number does not own this application. Check your student number.";
      case 404: return "This application could not be found. Return to classes to start again.";
      case 409: return `This hold can no longer be ${action === "confirm" ? "confirmed" : "cancelled"}. Check its current status before trying again.`;
      case 502:
      case 503: return "The admission service is unavailable. Check the application status before trying again.";
    }
    if (!error.response) return "The service could not confirm the result. Check the application status before trying again.";
  }
  return `We could not ${action === "confirm" ? "confirm admission" : "cancel this hold"}. Please try again.`;
}
