import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Pick up referral code from URL
  const ref = request.nextUrl.searchParams.get('ref');
  
  if (ref) {
    // Only set it if user is not already logged in/registered, but middleware doesn't easily know DB login state 
    // unless checking 'session_id' cookie. If they don't have session cookie, set the ref cookie.
    const sessionCookie = request.cookies.get('session_id');
    if (!sessionCookie) {
      // Set ref cookie for 30 days
      response.cookies.set('ref', ref, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
      });
    }
  }

  return response;
}

export const config = {
  // Apply middleware globally except for static files and api
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
