import { ForgotPasswordForm } from "@/components/form/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/40 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute bottom-[-5rem] right-[-3rem] h-56 w-56 rounded-full bg-pink-400/10 blur-3xl sm:h-80 sm:w-80" />
      </div>
      <div className="relative w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
