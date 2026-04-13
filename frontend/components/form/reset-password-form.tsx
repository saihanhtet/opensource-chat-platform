"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { RiEyeCloseFill, RiEyeFill } from "@remixicon/react"

import { AuthApiError, resetPassword } from "@/lib/auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export function ResetPasswordForm({
  token,
  className,
  ...props
}: React.ComponentProps<"div"> & { token: string }) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const password = String(fd.get("password") ?? "")
    const confirmPassword = String(fd.get("confirmPassword") ?? "")

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword({ token, password })
      setIsDone(true)
      form.reset()
      setTimeout(() => {
        router.push("/login")
      }, 1200)
    } catch (err) {
      const message =
        err instanceof AuthApiError
          ? err.message
          : "Something went wrong. Please try again."
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 bg-background/95 shadow-xl backdrop-blur">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Set new password
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Reset password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a new password to secure your account.
          </p>
        </CardHeader>
        <CardContent>
          {isDone ? (
            <p className="rounded-md border border-green-600/20 bg-green-500/10 px-3 py-2 text-center text-sm text-green-700 dark:text-green-300">
              Password updated successfully. Redirecting to sign in...
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      disabled={isSubmitting}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="rounded-full"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        disabled={isSubmitting}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <RiEyeCloseFill /> : <RiEyeFill />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm new password
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      disabled={isSubmitting}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="rounded-full"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        aria-pressed={showConfirmPassword}
                        disabled={isSubmitting}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <RiEyeCloseFill /> : <RiEyeFill />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                {formError ? <FieldError>{formError}</FieldError> : null}
                <Field>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Updating password..." : "Update password"}
                  </Button>
                </Field>
                <p className="text-center text-sm text-muted-foreground">
                  Need a new link?{" "}
                  <Link
                    href="/forgot-password"
                    className="text-foreground hover:underline"
                  >
                    Request again
                  </Link>
                </p>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
