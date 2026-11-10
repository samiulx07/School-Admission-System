import { isAxiosError } from "axios";
import { type ProblemDetails } from "@/shared/types/api";
import { UnverifiedClassResponseError } from "./createClass";

export function getClassCreationError(error: unknown): { heading: string; message: string } {
  if (error instanceof UnverifiedClassResponseError) {
    return { heading: "Check the class catalogue", message: error.message };
  }

  if (isAxiosError<ProblemDetails>(error)) {
    const status = error.response?.status;
    const problem = error.response?.data;
    const detail = typeof problem?.detail === "string" ? problem.detail : undefined;
    const title = typeof problem?.title === "string" ? problem.title : undefined;
    const fieldErrors = problem?.errors && typeof problem.errors === "object"
      ? Object.values(problem.errors).flatMap((messages) => Array.isArray(messages)
        ? messages.filter((message): message is string => typeof message === "string")
        : [])
      : [];
    const serverMessage = [detail || title, ...fieldErrors].filter(Boolean).join(" ");

    if (status === 400) {
      return { heading: "Check the class details", message: serverMessage || "Review the class name and seat count, then try again." };
    }
    if (status === 409) {
      return { heading: "The class could not be created", message: serverMessage || "These details conflict with an existing class. Review them and try again." };
    }
    if (status === 502 || status === 503 || status === 504) {
      return { heading: "The admission service is unavailable", message: serverMessage || "Your details are still here. Wait a moment and try again." };
    }
    if (!error.response) {
      return { heading: "The service could not be reached", message: "Check your connection and the class catalogue before trying again. Your details are still here." };
    }

    return { heading: "The class could not be created", message: serverMessage || "Your details are still here. Try again in a moment." };
  }

  return { heading: "The class could not be created", message: "Your details are still here. Try again in a moment." };
}
