import type { Request, Response, NextFunction } from "express";
import User from "../models/user.model.ts";
import jwt from "jsonwebtoken";
import multer from "multer";

type JwtPayload = {
    userId: string;
};

export const upload = multer({ dest: "uploads/" });

export const protectedRoutes = async (req: Request, res: Response, next:NextFunction) => {
    try{
        const token = req.cookies?.token;
        if (!token) return res.status(401).send("User is not authenticated yet, Please login first");

        // check the secret key is in the environment
        const secret = process.env.JWT_SECRET;
        if (!secret || !secret) return res.status(401).send("Invalid token");

        // decode the token
        const decoded = jwt.verify(token, secret) as JwtPayload;

        if (!decoded?.userId) {
            res.status(401).send("Invalid token");
            return;
        }

        // find user
        // @ts-ignore for the _id
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) return res.status(404).send("User not found");

        user.status = "active";
        user.lastSeenAt = new Date();
        await user.save();

        req.user = user;
        next()

    } catch (error) {
        console.error("Error in the proxy server",error);
        res.status(500).send("Internal Server Error");
    }
}