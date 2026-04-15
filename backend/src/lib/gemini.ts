import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiQuotaError extends Error {
    retryAfterSeconds?: number;
    constructor(message: string, retryAfterSeconds?: number) {
        super(message);
        this.name = "GeminiQuotaError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export class GeminiUnavailableError extends Error {
    retryAfterSeconds?: number;
    constructor(message: string, retryAfterSeconds?: number) {
        super(message);
        this.name = "GeminiUnavailableError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export async function rewriteFormalText(input: {
    text: string;
    model?: string;
}): Promise<{ rewrittenText: string; model: string }> {
    const model = DEFAULT_MODEL;
    const text = input.text.trim();

    if (process.env.NODE_ENV === "test") {
        return { rewrittenText: `Formal: ${text}`, model };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = [
        "Rewrite the following user message into a concise, professional, and formal tone.",
        "Keep the original meaning. Return only the rewritten text without extra commentary.",
        "",
        `Message: ${text}`,
    ].join("\n");

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    }).catch((error: unknown) => {
        const maybeStatus = (error as { status?: number } | undefined)?.status;
        const maybeMessage = (error as { message?: string } | undefined)?.message ?? "";
        const retryMatch =
            maybeMessage.match(/retryDelay":"(\d+)s"/) ??
            maybeMessage.match(/Please retry in ([\d.]+)s/);
        const retryAfterSeconds = retryMatch
            ? Math.ceil(Number(retryMatch[1]))
            : undefined;
        if (maybeStatus === 429 || maybeMessage.includes("RESOURCE_EXHAUSTED")) {
            throw new GeminiQuotaError(
                retryAfterSeconds
                    ? `Gemini quota exceeded. Please retry in about ${retryAfterSeconds}s.`
                    : "Gemini quota exceeded. Please retry shortly.",
                retryAfterSeconds
            );
        }
        if (maybeStatus === 503 || maybeMessage.includes("\"status\":\"UNAVAILABLE\"")) {
            throw new GeminiUnavailableError(
                retryAfterSeconds
                    ? `Gemini is temporarily unavailable. Please retry in about ${retryAfterSeconds}s.`
                    : "Gemini is temporarily unavailable. Please try again shortly.",
                retryAfterSeconds
            );
        }
        throw error;
    });
    const rewrittenText = response.text?.trim();
    if (!rewrittenText) {
        throw new Error("No rewritten text returned from Gemini");
    }

    return { rewrittenText, model };
}

