const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, "");
const isLoopbackOrigin = (origin: string) => {
    try {
        const parsed = new URL(origin);
        return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
        return false;
    }
};

export const parseAllowedOrigins = (): string[] => {
    const rawOrigins = [
        process.env.CLIENT_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.FRONTEND_URL,
    ]
        .filter((value): value is string => !!value)
        .flatMap((value) => value.split(","))
        .map(normalizeOrigin)
        .filter(Boolean);

    const defaults = ["http://localhost:5173", "http://localhost:3000"];
    const env = process.env.NODE_ENV ?? "development";

    if (rawOrigins.length === 0) {
        return defaults;
    }

    if (env !== "production") {
        return [...new Set([...rawOrigins, ...defaults])];
    }

    return [...new Set(rawOrigins)];
};

export const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]) => {
    if (!origin) return true;
    if (allowedOrigins.includes("*")) return true;
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) return true;
    return isLoopbackOrigin(normalized);
};
