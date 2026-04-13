import Link from "next/link"

import { ResetPasswordForm } from "@/components/form/reset-password-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const safeToken = String(token ?? "").trim()

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/40 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute bottom-[-5rem] right-[-3rem] h-56 w-56 rounded-full bg-pink-400/10 blur-3xl sm:h-80 sm:w-80" />
      </div>
      <div className="relative w-full max-w-md">
        {safeToken ? (
          <ResetPasswordForm token={safeToken} />
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/95 p-6 text-center shadow-xl backdrop-blur">
            <h1 className="text-xl font-semibold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This link is missing a token or is malformed.
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 inline-block text-sm underline-offset-2 hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
