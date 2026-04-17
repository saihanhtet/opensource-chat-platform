import jwt from "jsonwebtoken";
import User from "../models/user.model.ts";

type JwtPayload = {
    userId: string;
};

export const parseTokenFromCookieHeader = (
    cookieHeader?: string
): string | null => {
    if (!cookieHeader) return null;
    const pairs = cookieHeader.split(";");
    for (const pair of pairs) {
        const [rawKey, ...rawValue] = pair.trim().split("=");
        if (rawKey === "token") {
            return decodeURIComponent(rawValue.join("="));
        }
    }
    return null;
};

export const verifyToken = (token?: string | null): JwtPayload | null => {
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        return decoded?.userId ? decoded : null;
    } catch {
        return null;
    }
};

export const getAuthUserFromToken = async (token?: string | null) => {
    const decoded = verifyToken(token);
    if (!decoded?.userId) return null;
    return User.findById(decoded.userId).select("-password");
};
