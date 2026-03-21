import jwt from "jsonwebtoken";
import type { Response } from "express";

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