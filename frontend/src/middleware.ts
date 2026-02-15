import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = [
    '/dashboard',
    '/quote',
    '/orders',
    '/inventory',
    '/procurement',
    '/suppliers',
    '/finance',
    '/hr',
    '/crm',
    '/analytics',
    '/calendar',
    '/menu',
    '/settings',
    '/profile',
    '/admin',
];

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if path is protected
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    // Check if path is public
    const isPublicRoute = publicRoutes.some(route =>
        pathname.startsWith(route)
    );

    // Get token from cookies (for SSR) or check later on client
    // Note: For client-side auth, we'll check in the layout component
    // This middleware just handles basic redirects

    // If trying to access root, redirect to dashboard
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
    ],
};
