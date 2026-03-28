import { z } from "zod";

export const signUpSchema = z.object({
    username: z.string().max(12, "Username should not be greater than 12 characters"),
    email: z.email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const SignInSchema = z.object({
    email: z.email(),
    password: z.string(),
})