import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { getAuthUserFromToken } from "../lib/auth-session.ts";

export const upload = multer({ dest: "uploads/" });

export const protectedRoutes = async (req: Request, res: Response, next:NextFunction) => {
    try{
        const token = req.cookies?.token;
        if (!token) return res.status(401).send("User is not authenticated yet, Please login first");
        const user = await getAuthUserFromToken(token);
        if (!user) return res.status(404).send("User not found");
        req.user = user;
        next()

    } catch (error) {
        console.error("Error in the proxy server",error);
        res.status(500).send("Internal Server Error");
    }
}