import axios from "axios";
import type { ProblemDetails } from "@/shared/types/api";

export function holdErrorMessage(error: unknown, action: "reserve" | "load" = "load"): string {
  if (!axios.isAxiosError<ProblemDetails>(error)) return "Something went wrong. Please try again.";
  const status = error.response?.status;
  const code = error.response?.data?.code;
  if (status === 400) return action === "reserve" ? "Check your student number and try again." : "This application number is not valid. Return to the class register to continue.";
  if (status === 403) return "This application belongs to a different student number.";
  if (status === 404) return "This application or class could not be found. Return to the class register to continue.";
  if (status === 409) {
    if (code === "active_application_exists") return "You already have an active application for this class. Check your applications before reserving again.";
    return action === "reserve" ? "All places in this class are now held or confirmed. Choose another class or check again shortly." : "This application's status has changed. Refresh to see the latest details.";
  }
  if (status === 502 || status === 503 || !error.response) return "The admissions service is unavailable. Please try again shortly.";
  return "The request could not be completed. Please try again.";
}
