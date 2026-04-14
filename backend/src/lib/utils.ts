import jwt from "jsonwebtoken";
import { MongoServerError } from "mongodb";
import type { Request, Response } from "express";
import User, {type UserDocument} from "../models/user.model.ts";
import {z} from "zod";

const INTERNAL_ERROR_MESSAGE = "Internal server error";

export const generateToken = (userId: string, res: Response) => {
    const { JWT_SECRET } = process.env;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is required");
    }
    const token = jwt.sign(
        { userId }, JWT_SECRET as string, { expiresIn: "7d" }
    );

    res.cookie("token", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
    });
};

export const sendValidationError = (
    res: Response,
    error: z.ZodError
): Response => {
    // validation error output
    const { fieldErrors } = z.flattenError(error);
    return res.status(400).json({
        errors: fieldErrors,
    });
};

export const sendServerError = (
    res: Response,
    label: string,
    error: unknown
): Response => {
    console.error(`${label}:`, error);

    return res.status(500).json({
        message: INTERNAL_ERROR_MESSAGE,
    });
};

export const sendAuthResponse = (
    res: Response,
    user: UserDocument,
    statusCode: number
): Response => {
    generateToken(user._id.toString(), res);
    return res.status(statusCode).json(buildUserResponse(user));
};

export const buildUserResponse = (user: UserDocument) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    profilePic: user.profilePic,
    role: user.role,
    status: user.status,
    lastSeenAt: user.lastSeenAt,
    updatedAt: user.updatedAt,
});

export const sendSafeEmail = async <T>(
    payload: T,
    fn: (payload: T) => Promise<void>
): Promise<void> => {
    // Reusable safe email function
    try {
        await fn(payload);
    } catch (error) {
        console.error("Email error:", error);
    }
};

export const findUserByEmail = async (
    email: string
): Promise<UserDocument | null> => {
    // find the existing user by its email
    return User.findOne({ email: normalizeEmail(email) });
};


export const normalizeEmail = (email: string): string => email.toLowerCase().trim();

/** Express 5 may type `req.params.id` as `string | string[]`. */
export const reqParamId = (req: Request): string | undefined => {
    const id = req.params["id"];
    if (id === undefined) return undefined;
    return Array.isArray(id) ? id[0] : id;
};

export const isDuplicateKeyError = (error: unknown): error is MongoServerError =>
    error instanceof MongoServerError && error.code === 11000;
