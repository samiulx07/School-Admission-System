import "server-only";
import { z } from "zod";
import { holdSchema } from "./holds";

const classSchema = z.object({
  id: z.uuid(), name: z.string().min(1), totalSeats: z.number().int().positive(),
  heldSeats: z.number().int().nonnegative(), confirmedSeats: z.number().int().nonnegative(), availableSeats: z.number().int().nonnegative(),
});

async function readPublic(path: string): Promise<unknown> {
  const base = process.env.API_BASE_URL ?? "http://localhost:8080";
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) throw new Error("Public admission data is unavailable.");
  return response.json();
}

// These are the same public reads exposed by the API; no student identity is sent.
export async function readPublicApplication(holdId: string) {
  if (!z.uuid().safeParse(holdId).success) return undefined;
  try {
    const hold = holdSchema.parse(await readPublic(`/holds/${encodeURIComponent(holdId)}`));
    if (hold.holdId.toLowerCase() !== holdId.toLowerCase()) return undefined;
    const admissionClass = classSchema.parse(await readPublic(`/classes/${hold.classId}`));
    return { hold, admissionClass };
  } catch {
    // Client queries retain their normal retry and readable error path.
    return undefined;
  }
}
