import { LoginForm } from "@/components/form/login-form"
import { safeAppPath } from "@/lib/navigation-utils"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const redirectTo = safeAppPath(from ?? null)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}
