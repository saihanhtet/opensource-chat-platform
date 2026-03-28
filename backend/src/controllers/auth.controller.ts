import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { SignInSchema, signUpSchema } from "../schemas/auth.schema";
import {
    findUserByEmail,
    normalizeEmail,
    sendAuthResponse,
    sendSafeEmail,
    sendServerError,
    sendValidationError
} from "../lib/utils";
import User, { type UserDocument } from "../models/user.model";
import { sendWelcomeMail, type sendWelcomeProps } from "../emails/handlers";

type SignUpInput = z.infer<typeof signUpSchema>;
type SignInInput = z.infer<typeof SignInSchema>;

const AUTH_ERROR_MESSAGE = "Invalid email or password";

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
        // send mail to user
        await sendWelcomeEmail(savedUser);
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
        // clear token and log out the user
        res.clearCookie("token");
        return res.status(200).json({
            message: "Logged out successfully",
        });
    } catch (error) {
        return sendServerError(res, "Logout controller", error);
    }
};