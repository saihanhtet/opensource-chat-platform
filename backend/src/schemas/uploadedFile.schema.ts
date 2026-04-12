import { z } from "zod";
import { objectIdString } from "./objectId.schema.ts";

export const createUploadedFileSchema = z.object({
    conversationId: objectIdString,
    fileName: z.string().min(1).max(500),
    fileType: z.string().min(1).max(200),
    fileUrl: z.string().min(1).max(5000),
});

export const updateUploadedFileSchema = z.object({
    fileName: z.string().min(1).max(500).optional(),
    fileType: z.string().min(1).max(200).optional(),
    fileUrl: z.string().min(1).max(5000).optional(),
});
