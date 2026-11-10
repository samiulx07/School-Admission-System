import { z } from "zod";

const classNameSchema = z.string()
  .trim()
  .min(1, "Enter a class name.")
  .refine((name) => name.length <= 200, "Use 200 characters or fewer.")
  .refine((name) => !name.includes("\0"), "Remove the unsupported character from the class name.");

const seatCountSchema = z.number()
  .int("Enter a whole number of seats.")
  .min(1, "Enter at least 1 seat.")
  .max(2_147_483_647, "Enter 2,147,483,647 seats or fewer.");

export const classCreationSchema = z.object({
  name: classNameSchema,
  totalSeats: z.string()
    .trim()
    .min(1, "Enter the total number of seats.")
    .regex(/^\d+$/, "Enter a whole number of seats.")
    .transform(Number)
    .pipe(seatCountSchema),
});

export const createdClassSchema = z.object({
  id: z.uuid(),
  name: classNameSchema,
  totalSeats: seatCountSchema,
});

export type ClassCreationFields = z.input<typeof classCreationSchema>;
export type CreateClassRequest = z.output<typeof classCreationSchema>;
export type CreatedClass = z.output<typeof createdClassSchema>;
