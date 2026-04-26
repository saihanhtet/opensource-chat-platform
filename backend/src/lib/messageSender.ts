import mongoose from "mongoose";

import User from "../models/user.model.ts";

type RowWithSender = { senderId: unknown };

export async function withSenderUsernames<T extends RowWithSender>(
    rows: T[]
): Promise<Array<T & { senderUsername: string }>> {
    if (rows.length === 0) return [];
    const idStrings = [
        ...new Set(
            rows
                .map((r) => String(r.senderId))
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
        ),
    ];
    if (idStrings.length === 0) {
        return rows.map((row) => ({ ...row, senderUsername: "" }));
    }
    const objectIds = idStrings.map((id) => new mongoose.Types.ObjectId(id));
    const users = await User.find({ _id: { $in: objectIds } }).select("username").lean();
    const map = new Map<string, string>();
    for (const u of users) {
        map.set(String(u._id), typeof u.username === "string" ? u.username : "");
    }
    return rows.map((row) => ({
        ...row,
        senderUsername: map.get(String(row.senderId)) ?? "",
    }));
}
