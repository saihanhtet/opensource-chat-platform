"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { RiEyeCloseFill, RiEyeFill } from "@remixicon/react"

import { AuthApiError, firstFieldMessage, signUp } from "@/lib/auth-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const form = e.currentTarget
    const fd = new FormData(form)
    const username = String(fd.get("username") ?? "").trim()
    const email = String(fd.get("email") ?? "").trim()
    const password = String(fd.get("password") ?? "")
    const confirmPassword = String(fd.get("confirmPassword") ?? "")

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await signUp({ username, email, password })
      router.push("/")
      router.refresh()
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors)
        }
        setFormError(
          err.fieldErrors && Object.keys(err.fieldErrors).length > 0
            ? null
            : err.message
        )
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const usernameErr = firstFieldMessage(fieldErrors, "username")
  const emailErr = firstFieldMessage(fieldErrors, "email")
  const passwordErr = firstFieldMessage(fieldErrors, "password")

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 bg-background/95 shadow-xl backdrop-blur">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            New here?
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create account
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Start chatting in less than a minute.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={usernameErr ? true : undefined}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    maxLength={12}
                    required
                    disabled={isSubmitting}
                    aria-invalid={usernameErr ? true : undefined}
                  />
                </InputGroup>
                {usernameErr ? <FieldError>{usernameErr}</FieldError> : null}
              </Field>
              <Field data-invalid={emailErr ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    aria-invalid={emailErr ? true : undefined}
                  />
                </InputGroup>
                {emailErr ? <FieldError>{emailErr}</FieldError> : null}
              </Field>
              <Field data-invalid={passwordErr ? true : undefined}>
                <Field className="grid grid-cols-1 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={6}
                        required
                        disabled={isSubmitting}
                        aria-invalid={passwordErr ? true : undefined}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="rounded-full"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
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
                      Confirm password
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
                          {showConfirmPassword ? (
                            <RiEyeCloseFill />
                          ) : (
                            <RiEyeFill />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </Field>
                {passwordErr ? <FieldError>{passwordErr}</FieldError> : null}
              </Field>
              {formError ? <FieldError>{formError}</FieldError> : null}
              <Field>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </Field>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-foreground hover:underline">
                  Sign in
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
