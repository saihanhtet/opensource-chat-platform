import type { Request, Response } from "express";

import { GeminiQuotaError, rewriteFormalText } from "../lib/gemini.ts";
import { sendServerError, sendValidationError } from "../lib/utils.ts";
import { rewriteTextSchema } from "../schemas/ai.schema.ts";

export const rewriteMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = rewriteTextSchema.safeParse(req.body);
        if (!parsed.success) return sendValidationError(res, parsed.error);

        const result = await rewriteFormalText(parsed.data);
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof GeminiQuotaError) {
            return res.status(429).json({
                message: error.message,
                retryAfterSeconds: error.retryAfterSeconds,
            });
        }
        if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
            return res.status(503).json({ message: error.message });
        }
        return sendServerError(res, "rewriteMessage", error);
    }
};

