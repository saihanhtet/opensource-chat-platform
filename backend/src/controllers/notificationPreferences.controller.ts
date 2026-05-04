import type { Request, Response } from "express";

import * as utils from "../lib/utils.ts";
import User from "../models/user.model.ts";
import * as authSchema from "../schemas/auth.schema.ts";

const defaultNotificationPreferences = {
    toastMessages: true,
    toastFriendRequests: true,
    toastTeamUpdates: true,
    toastTeamMembership: true,
    toastDurationSeconds: 4,
} as const;

export const updateNotificationPreferences = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = authSchema.notificationPreferencesUpdateSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const prev =
            user.notificationPreferences != null
                ? (JSON.parse(JSON.stringify(user.notificationPreferences)) as Record<
                      string,
                      unknown
                  >)
                : {};

        user.set("notificationPreferences", {
            ...defaultNotificationPreferences,
            ...prev,
            ...parsed.data,
        });
        user.markModified("notificationPreferences");

        await user.save();
        const fresh = await User.findById(req.user._id).select("-password");
        return res.status(200).json({ message: "Notification preferences updated", user: fresh });
    } catch (error) {
        console.error("updateNotificationPreferences", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
