import { apiUrl } from "@/lib/api"

export type RewriteModel = "gemini-2.0-flash"

export async function rewriteToFormal(input: {
  text: string
  model: RewriteModel
}): Promise<{ rewrittenText: string; model: string }> {
  const res = await fetch(apiUrl("/api/ai/rewrite"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Failed to rewrite text"
    throw new Error(message)
  }
  return data as { rewrittenText: string; model: string }
}

