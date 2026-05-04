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

export const forgotPasswordSchema = z.object({
    email: z.email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const ProfileUpdateSchema = z.object({
    username: z.string().max(12, "Username should not be greater than 12 characters").optional(),
    email: z.email().optional(),
    bio: z.string().max(500, "Bio should not be greater than 500 characters").optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const notificationPreferencesUpdateSchema = z
    .object({
        toastMessages: z.boolean().optional(),
        toastFriendRequests: z.boolean().optional(),
        toastTeamUpdates: z.boolean().optional(),
        toastTeamMembership: z.boolean().optional(),
        toastDurationSeconds: z.number().int().min(2).max(30).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
        message: "At least one preference field is required",
    });