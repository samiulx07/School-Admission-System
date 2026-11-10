import { type AxiosInstance } from "axios";
import { createdClassSchema, type CreateClassRequest, type CreatedClass } from "./classCreationSchema";

export class UnverifiedClassResponseError extends Error {
  constructor() {
    super("The creation response could not be verified. Check the class catalogue before trying again.");
    this.name = "UnverifiedClassResponseError";
  }
}

export async function createClass(client: AxiosInstance, values: CreateClassRequest): Promise<CreatedClass> {
  const response = await client.post<unknown>("/classes", values);
  const result = createdClassSchema.safeParse(response.data);

  if (response.status !== 201 || !result.success) throw new UnverifiedClassResponseError();

  return result.data;
}
