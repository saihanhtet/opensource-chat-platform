"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"

import { AuthApiError, requestPasswordReset } from "@/lib/auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get("email") ?? "").trim()

    setIsSubmitting(true)
    try {
      const response = await requestPasswordReset(email)
      setSuccessMessage(response.message)
      form.reset()
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
            Password recovery
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Forgot password?
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email and we will send a reset link.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </InputGroup>
              </Field>
              {formError ? <FieldError>{formError}</FieldError> : null}
              {successMessage ? (
                <p className="rounded-md border border-green-600/20 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                  {successMessage}
                </p>
              ) : null}
              <Field>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending link..." : "Send reset link"}
                </Button>
              </Field>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link href="/login" className="text-foreground hover:underline">
                  Back to sign in
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
