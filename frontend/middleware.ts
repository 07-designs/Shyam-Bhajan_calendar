import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Client-side Bearer token authentication handled dynamically in /admin component
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};