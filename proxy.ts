import {
  convexAuthNextjsMiddleware,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server"

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname, search } = request.nextUrl

  const isAdminLoginRoute = pathname === "/admin/login"
  const isProtectedAdminRoute = pathname.startsWith("/admin") && !isAdminLoginRoute

  if (isProtectedAdminRoute && !(await convexAuth.isAuthenticated())) {
    const next = encodeURIComponent(`${pathname}${search}`)
    return nextjsMiddlewareRedirect(request, `/admin/login?next=${next}`)
  }

  if (isAdminLoginRoute && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/admin")
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
