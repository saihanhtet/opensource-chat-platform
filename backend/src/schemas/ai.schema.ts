import { z } from "zod";

export const rewriteTextSchema = z.object({
    text: z.string().min(1, "Text is required").max(5000, "Text is too long"),
    model: z.string().min(1).max(100).optional(),
});

