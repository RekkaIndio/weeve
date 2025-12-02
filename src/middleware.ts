import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userAgent } from 'next/server'

export function middleware(request: NextRequest) {
    const { device, ua } = userAgent(request)

    // Check for mobile devices (phones and tablets)
    // The device.type from next/server is usually 'mobile', 'tablet', 'console', 'smarttv', 'wearable', 'embedded', or undefined
    // We also check the UA string for common mobile identifiers to be safe
    const isMobile = device.type === 'mobile' || device.type === 'tablet' ||
        /android|iphone|ipad|ipod/i.test(ua)

    const { pathname } = request.nextUrl

    // Define marketing paths that should redirect on mobile
    const marketingPaths = ['/', '/communities', '/influencers', '/brands']

    // Check if the current path is a marketing path
    // We handle the root path specifically, and others as startsWith to catch sub-pages if any
    const isMarketingPage = marketingPaths.some(path =>
        pathname === path || (path !== '/' && pathname.startsWith(path))
    )

    if (isMobile && isMarketingPage) {
        const url = new URL('/login', request.url)
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
