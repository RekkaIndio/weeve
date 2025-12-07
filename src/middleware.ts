import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userAgent } from 'next/server'

export function middleware(request: NextRequest) {
    const { device, ua } = userAgent(request)

    // Check for mobile devices (phones and tablets)
    const isMobile = device.type === 'mobile' || device.type === 'tablet' ||
        /android|iphone|ipad|ipod/i.test(ua)

    const { pathname } = request.nextUrl

    // Only handle mobile redirects for users with ref codes (app deep linking)
    // Let everyone else see the landing page normally
    if (isMobile && request.nextUrl.searchParams.has('ref')) {
        const url = new URL('/app-redirect', request.url)
        url.search = request.nextUrl.search
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login (login page)
         * - signup (signup page)
         * - setup (setup page)
         * - auth (auth related paths if any)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|login|signup|setup|auth).*)',
    ],
}
