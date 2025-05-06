import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { userRoleEnum } from '@/db/schema'; // Import your role enum type

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(request: NextRequestWithAuth) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    // Define admin routes
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/manage-users');

    if (isAdminRoute) {
      // If trying to access an admin route
      if (!token) {
        // Not logged in, redirect to sign-in preserving the intended destination
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(signInUrl);
      }
      if (token.role !== ('admin' as typeof userRoleEnum.enumValues[number])) {
        // Logged in, but not an admin. Redirect to an access denied page or homepage.
        // For simplicity, redirecting to homepage with an error.
        // Consider creating a dedicated /access-denied page.
        const homeUrl = new URL('/', request.url);
        homeUrl.searchParams.set('error', 'AccessDenied');
        console.warn(`RBAC: User '${token.email}' (role: '${token.role}') denied access to admin route '${pathname}'.`);
        return NextResponse.redirect(homeUrl);
      }
    }
    // Allow request to proceed if not an admin route or if user is admin
    return NextResponse.next();
  },
  {
    callbacks: {
      // This authorized callback is called before the middleware function itself.
      // It ensures that for any route matched by the `config.matcher` below,
      // the user must at least be logged in.
      // If they are not logged in, they will be redirected to the signIn page.
      authorized: ({ token }) => !!token,
    },
    pages: {
        // This is the page users will be redirected to if `authorized` returns false.
        signIn: '/auth/signin',
    }
  }
);

// Matcher: Apply this middleware to specified admin and manage-users pages
export const config = {
  matcher: [
    '/admin/:path*',
    '/manage-users/:path*',
    // Add other paths that require authentication but not necessarily admin role, if any.
    // For example, if all ticket pages require login: '/tickets/:path*'
    // If the dashboard requires login: '/dashboard/:path*' (or just '/dashboard')
    // If the profile page requires login: '/profile'
  ],
}; 