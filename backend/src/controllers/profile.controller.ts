import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { unlink } from "fs/promises";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import cloud from "../lib/cloud";
import User from "../models/user.model";

import * as utils from "../lib/utils.ts";
import * as authSchema from "../schemas/auth.schema";

type ProfileUpdateInput = z.infer<typeof authSchema.ProfileUpdateSchema>;
type ChangePasswordInput = z.infer<typeof authSchema.changePasswordSchema>;

export const editProfile = async (
    req: Request,
    res: Response
) => {
    const tempUploadPath = req.file?.path;
    try {
        const parsed = authSchema.ProfileUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return utils.sendValidationError(res, parsed.error);
        }

        const { username, email, bio }: ProfileUpdateInput = parsed.data;

        // check at least one field is provided
        if (!username && !email && bio === undefined && !req.file) {
            return res.status(400).json({
                message: "Please update at least one field",
            });
        }
        // @ts-ignore (for warning line user)
        const userId = req.user._id;
        const updateData: any = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (bio !== undefined) updateData.bio = bio;

        if (req.file) {
            const response = await cloud.uploader.upload(req.file.path);
            updateData.profilePic = response.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, updateData,
            { returnDocument: 'after' }
        ).select("-password");

        return res.status(200).json({ message: "Profile updated", user: updatedUser });

    } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
            return res.status(409).json({ message: "Username or email already exists" });
        }
        console.error("Error at Updating the profile", error);
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (tempUploadPath) {
            await unlink(tempUploadPath).catch(() => { });
        }
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = authSchema.changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return utils.sendValidationError(res, parsed.error);
        }

        const { currentPassword, newPassword }: ChangePasswordInput = parsed.data;
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different" });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found" });

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error at changing password", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getUserByUsername = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const usernameParam = req.params["username"];
        const username = (Array.isArray(usernameParam) ? usernameParam[0] : usernameParam)?.trim();
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        const user = await User.findOne({ username }).select(
            "_id username email profilePic bio status role lastSeenAt updatedAt"
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(user);
    } catch (error) {
        console.error("Error getting user by username", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};