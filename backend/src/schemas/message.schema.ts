import { z } from "zod";
import { objectIdString } from "./objectId.schema.ts";

export const createMessageSchema = z.object({
    conversationId: objectIdString,
    content: z.string().max(20000).optional(),
    fileUrl: z.string().max(5000).optional(),
});

export const updateMessageSchema = z.object({
    content: z.string().max(20000).optional(),
    fileUrl: z.string().max(5000).optional(),
});
