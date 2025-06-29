export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - / (the root home page)
     * - /login (the login page)
     * - /weekly (the weekly trading data page)
     * - /monthly (the monthly trading data page)
     * - /api (API routes)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     *
     * This will protect all pages other than the home page, login page, weekly page, and monthly page.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|weekly|monthly|$).*)",
  ],
} 