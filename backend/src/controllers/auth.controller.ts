import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

import {
    forgotPasswordSchema,
    resetPasswordSchema,
    SignInSchema,
    signUpSchema,
} from "../schemas/auth.schema";
import {
    findUserByEmail,
    normalizeEmail,
    sendAuthResponse,
    sendSafeEmail,
    sendServerError,
    sendValidationError
} from "../lib/utils";
import User, {type UserDocument} from "../models/user.model";
import {
    sendPasswordResetMail,
    sendWelcomeMail,
    type sendWelcomeProps,
} from "../emails/handlers";

type SignUpInput = z.infer<typeof signUpSchema>;
type SignInInput = z.infer<typeof SignInSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const AUTH_ERROR_MESSAGE = "Invalid email or password";
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const GENERIC_RESET_EMAIL_RESPONSE =
    "If an account with that email exists, a reset link has been sent.";

const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const sendWelcomeEmail = async (user: UserDocument): Promise<void> => {
    const payload: sendWelcomeProps = {
        email: user.email,
        name: user.username,
        url: process.env.CLIENT_URL as string,
    };
    await sendSafeEmail(payload, sendWelcomeMail);
};

const hashResetToken = (token: string): string =>
    crypto.createHash("sha256").update(token).digest("hex");

const sendPasswordResetEmail = async (
    user: UserDocument,
    rawToken: string
): Promise<void> => {
    const baseUrl = process.env.CLIENT_URL as string;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendSafeEmail(
        {
            email: user.email,
            name: user.username,
            resetUrl,
        },
        sendPasswordResetMail
    );
};

export const signUp = async (req: Request, res: Response) => {
    try {
        // validate the payload
        const parsed = signUpSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }
        // get data from validated payload
        const { username, email, password }: SignUpInput = parsed.data;
        const normalizedEmail = normalizeEmail(email);
        // check exist user or not
        const existingUser = await findUserByEmail(normalizedEmail);
        if (existingUser) {
            return res.status(409).json({
                message: "Email already exists",
            });
        }
        // encrypt the password
        const hashedPassword = await hashPassword(password);
        // save the user
        const user = new User({
            username: username.trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });
        const savedUser = await user.save();
        const response = sendAuthResponse(res, savedUser, 201);
        if (process.env.NODE_ENV !== "test") {
            await sendWelcomeEmail(savedUser);
        }
        return response;
    } catch (error) {
        return sendServerError(res, "SignUp controller", error);
    }
};

export const signIn = async (req: Request, res: Response) => {
    try {
        // validate the payload
        const parsed = SignInSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }
        // get data from payload
        const { email, password }: SignInInput = parsed.data;
        const user = await findUserByEmail(email);

        if (!user || !user.password) {
            return res.status(401).json({
                message: AUTH_ERROR_MESSAGE,
            });
        }
        // check password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: AUTH_ERROR_MESSAGE,
            });
        }

        return sendAuthResponse(res, user, 200);
    } catch (error) {
        return sendServerError(res, "Login controller", error);
    }
};

export const signOut = async (_req: Request, res: Response) => {
    try {
        const token = _req.cookies?.token;
        if (token) {
            const decoded = jwt.decode(token) as { userId?: string } | null;
            if (decoded?.userId) {
                await User.findByIdAndUpdate(decoded.userId, {
                    status: "offline",
                    lastSeenAt: new Date(),
                });
            }
        }
        // clear token and log out the user
        res.clearCookie("token");
        return res.status(200).json({
            message: "Logged out successfully",
        });
    } catch (error) {
        return sendServerError(res, "Logout controller", error);
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const parsed = forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }

        const { email }: ForgotPasswordInput = parsed.data;
        const user = await findUserByEmail(email);

        if (!user || !user.password) {
            return res.status(200).json({ message: GENERIC_RESET_EMAIL_RESPONSE });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = hashResetToken(rawToken);
        user.resetPasswordTokenExpiresAt = new Date(
            Date.now() + RESET_TOKEN_EXPIRY_MS
        );
        await user.save();

        if (process.env.NODE_ENV !== "test") {
            await sendPasswordResetEmail(user, rawToken);
        }

        return res.status(200).json({ message: GENERIC_RESET_EMAIL_RESPONSE });
    } catch (error) {
        return sendServerError(res, "Forgot password controller", error);
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }

        const { token, password }: ResetPasswordInput = parsed.data;
        const hashedToken = hashResetToken(token);

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordTokenExpiresAt: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired reset link.",
            });
        }

        user.password = await hashPassword(password);
        user.resetPasswordToken = null;
        user.resetPasswordTokenExpiresAt = null;
        await user.save();

        return res.status(200).json({
            message: "Password reset successful. You can now sign in.",
        });
    } catch (error) {
        return sendServerError(res, "Reset password controller", error);
    }
};

