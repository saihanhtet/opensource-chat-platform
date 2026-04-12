import { apiUrl } from "@/lib/api"

export type AuthUser = {
  _id: string
  username: string
  email: string
  profilePic?: string
  role?: string
  status?: string
}

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string[] | undefined>
}

export class AuthApiError extends Error {
  status: number
  fieldErrors?: Record<string, string[] | undefined>

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[] | undefined>
  ) {
    super(message)
    this.name = "AuthApiError"
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function parseAuthError(status: number, data: unknown): AuthApiError {
  const body = data as ApiErrorBody
  if (body?.errors && typeof body.errors === "object") {
    const flat = Object.values(body.errors)
      .flat()
      .filter((m): m is string => typeof m === "string" && m.length > 0)
    const first = flat[0]
    return new AuthApiError(
      first ?? "Please check the form and try again.",
      status,
      body.errors
    )
  }
  if (body?.message && typeof body.message === "string") {
    return new AuthApiError(body.message, status)
  }
  return new AuthApiError("Something went wrong. Please try again.", status)
}

export async function signIn(credentials: {
  email: string
  password: string
}): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/sign-in"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw parseAuthError(res.status, data)
  }
  return data as AuthUser
}

export async function signUp(payload: {
  username: string
  email: string
  password: string
}): Promise<AuthUser> {
  const res = await fetch(apiUrl("/api/auth/sign-up"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw parseAuthError(res.status, data)
  }
  return data as AuthUser
}

export function firstFieldMessage(
  fieldErrors: Record<string, string[] | undefined> | undefined,
  field: string
): string | undefined {
  return fieldErrors?.[field]?.[0]
}
