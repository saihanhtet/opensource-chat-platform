import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import * as handlers from "../emails/handlers";
import * as utils from "../lib/utils";
import User, { type UserDocument } from "../models/user.model";
import * as authSchema from "../schemas/auth.schema";
import { emitGlobal, emitToUser, SOCKET_EVENTS } from "../socket/realtime.ts";

type SignUpInput = z.infer<typeof authSchema.signUpSchema>;
type SignInInput = z.infer<typeof authSchema.SignInSchema>;
type ForgotPasswordInput = z.infer<typeof authSchema.forgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof authSchema.resetPasswordSchema>;

const AUTH_ERROR_MESSAGE = "Invalid email or password";
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const GENERIC_RESET_EMAIL_RESPONSE =
    "If an account with that email exists, a reset link has been sent.";

const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const sendWelcomeEmail = async (user: UserDocument): Promise<void> => {
    const payload: handlers.sendWelcomeProps = {
        email: user.email,
        name: user.username,
        url: process.env.CLIENT_URL as string,
    };
    await utils.sendSafeEmail(payload, handlers.sendWelcomeMail);
};

const hashResetToken = (token: string): string =>
    crypto.createHash("sha256").update(token).digest("hex");

const sendPasswordResetEmail = async (
    user: UserDocument,
    rawToken: string
): Promise<void> => {
    const baseUrl = process.env.CLIENT_URL as string;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await utils.sendSafeEmail(
        {
            email: user.email,
            name: user.username,
            resetUrl,
        },
        handlers.sendPasswordResetMail
    );
};

export const signUp = async (req: Request, res: Response) => {
    try {
        // validate the payload
        const parsed = authSchema.signUpSchema.safeParse(req.body);
        if (!parsed.success) {
            return utils.sendValidationError(res, parsed.error);
        }
        // get data from validated payload
        const { username, email, password }: SignUpInput = parsed.data;
        const normalizedEmail = utils.normalizeEmail(email);
        // check exist user or not
        const existingUser = await utils.findUserByEmail(normalizedEmail);
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
        savedUser.status = "active";
        savedUser.lastSeenAt = new Date();
        await savedUser.save();
        emitGlobal(SOCKET_EVENTS.presenceUpdated, {
            userId: String(savedUser._id),
            status: "active",
            lastSeenAt: savedUser.lastSeenAt?.toISOString?.() ?? new Date().toISOString(),
        });
        const response = utils.sendAuthResponse(res, savedUser, 201);
        if (process.env.NODE_ENV !== "test") {
            await sendWelcomeEmail(savedUser);
        }
        return response;
    } catch (error) {
        return utils.sendServerError(res, "SignUp controller", error);
    }
};

export const signIn = async (req: Request, res: Response) => {
    try {
        // validate the payload
        const parsed = authSchema.SignInSchema.safeParse(req.body);
        if (!parsed.success) {
            return utils.sendValidationError(res, parsed.error);
        }
        // get data from payload
        const { email, password }: SignInInput = parsed.data;
        const user = await utils.findUserByEmail(email);

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

        user.status = "active";
        user.lastSeenAt = new Date();
        await user.save();
        emitToUser(String(user._id), SOCKET_EVENTS.presenceUpdated, {
            userId: String(user._id),
            status: "active",
            lastSeenAt: user.lastSeenAt?.toISOString?.() ?? new Date().toISOString(),
        });
        return utils.sendAuthResponse(res, user, 200);
    } catch (error) {
        return utils.sendServerError(res, "Login controller", error);
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
                emitToUser(decoded.userId, SOCKET_EVENTS.presenceUpdated, {
                    userId: decoded.userId,
                    status: "offline",
                    lastSeenAt: new Date().toISOString(),
                });
            }
        }
        // clear token and log out the user
        res.clearCookie("token");
        return res.status(200).json({
            message: "Logged out successfully",
        });
    } catch (error) {
        return utils.sendServerError(res, "Logout controller", error);
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const parsed = authSchema.forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return utils.sendValidationError(res, parsed.error);
        }

        const { email }: ForgotPasswordInput = parsed.data;
        const user = await utils.findUserByEmail(email);

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
        return utils.sendServerError(res, "Forgot password controller", error);
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const parsed = authSchema.resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return utils.sendValidationError(res, parsed.error);
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
        return utils.sendServerError(res, "Reset password controller", error);
    }
};

