import type { Request, Response } from "express";

import * as gemini from "../lib/gemini.ts";
import * as utils from "../lib/utils.ts";
import * as aiSchema from "../schemas/ai.schema.ts";

export const rewriteMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const parsed = aiSchema.rewriteTextSchema.safeParse(req.body);
        if (!parsed.success) return utils.sendValidationError(res, parsed.error);

        const result = await gemini.rewriteFormalText(parsed.data);
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof gemini.GeminiQuotaError) {
            return res.status(429).json({
                message: error.message,
                retryAfterSeconds: error.retryAfterSeconds,
            });
        }
        if (error instanceof gemini.GeminiUnavailableError) {
            return res.status(503).json({
                message: error.message,
                retryAfterSeconds: error.retryAfterSeconds,
            });
        }
        if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
            return res.status(503).json({ message: error.message });
        }
        return utils.sendServerError(res, "rewriteMessage", error);
    }
};

