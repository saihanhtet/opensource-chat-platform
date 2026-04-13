import { type NextRequest, NextResponse } from "next/server"

function isAuthPage(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/")
  )
}

function isPublicPage(pathname: string) {
  return (
    pathname === "/terms" ||
    pathname.startsWith("/terms/") ||
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/")
  )
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? ""
  const check = new URL("/api/auth/check-token", request.nextUrl.origin)
  try {
    const res = await fetch(check, {
      headers: { cookie },
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next()
  }

  if (
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|xml|webmanifest)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  if (isPublicPage(pathname)) {
    return NextResponse.next()
  }

  const authed = await hasValidSession(request)

  if (isAuthPage(pathname)) {
    if (authed) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (!authed) {
    const login = new URL("/login", request.url)
    if (pathname !== "/") {
      login.searchParams.set("from", pathname)
    }
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|xml|webmanifest)$).*)",
  ],
}
