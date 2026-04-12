import type { Request, Response } from "express";
import { unlink } from "fs/promises";
import { z } from "zod";
import cloud from "../lib/cloud"
import User from "../models/user.model";

import {ProfileUpdateSchema} from "../schemas/auth.schema";
import {sendValidationError} from "../lib/utils.ts";

type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export const editProfile = async (
    req: Request,
    res: Response
) => {
    const tempUploadPath = req.file?.path;
    try{
        const parsed = ProfileUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }

        const { username, email }: ProfileUpdateInput = req.body;

        // check at least one field is provided
        if  (!username && !email) {
            return res.status(400).json({
                message: "Please update at least one field",
            });
        }
        // @ts-ignore (for warning line user)
        const userId = req.user._id;
        const updateData: any = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;

        if (req.file) {
            const response = await cloud.uploader.upload(req.file.path);
            updateData.profilePic = response.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, updateData,
            { returnDocument: 'after' }
        ).select("-password");

        return res.status(200).json({message: "Profile updated", user: updatedUser});

    } catch (error) {
        console.error("Error at Updating the profile", error);
        return res.status(500).json({error: "Internal Server Error"});
    } finally {
        if (tempUploadPath) {
            await unlink(tempUploadPath).catch(() => {});
        }
    }
}