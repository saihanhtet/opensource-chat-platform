import { apiUrl } from "@/lib/api"
import { type CurrentUser } from "@/lib/team-api"

type UpdateProfileInput = {
  username?: string
  email?: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed"
    throw new Error(message)
  }
  return data as T
}

export async function updateProfile(input: UpdateProfileInput): Promise<{
  message: string
  user: CurrentUser
}> {
  const res = await fetch(apiUrl("/api/auth/profile"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<{ message: string; user: CurrentUser }>(res)
}
