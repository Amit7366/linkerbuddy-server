import { z } from "zod";

function passwordHasMixedCase(password: string) {
  return /[a-z]/.test(password) && /[A-Z]/.test(password);
}

function passwordHasNumberOrSymbol(password: string) {
  return /[^A-Za-z]/.test(password);
}

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required", invalid_type_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(passwordHasMixedCase, {
      message: "Password must include lowercase and uppercase letters",
    })
    .refine(passwordHasNumberOrSymbol, {
      message: "Password must include a number or symbol",
    }),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
