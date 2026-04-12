import { z } from "zod";
import { objectIdString } from "./objectId.schema.ts";

export const createConversationSchema = z.object({
    type: z.enum(["direct", "team"]),
    teamId: objectIdString.optional(),
    participantIds: z.array(objectIdString).min(1),
    lastMessage: z.string().max(5000).optional(),
});

export const updateConversationSchema = z.object({
    type: z.enum(["direct", "team"]).optional(),
    teamId: objectIdString.optional().nullable(),
    participantIds: z.array(objectIdString).min(1).optional(),
    lastMessage: z.string().max(5000).optional(),
});
