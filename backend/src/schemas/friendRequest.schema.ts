import { z } from "zod";
import { objectIdString } from "./objectId.schema.ts";

export const createFriendRequestSchema = z.object({
    receiverId: objectIdString,
});

export const updateFriendRequestSchema = z.object({
    status: z.enum(["accepted", "rejected"]),
});
