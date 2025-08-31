import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const res = NextResponse.next();

  res.headers.append('Access-Control-Allow-Credentials', 'true');
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    res.headers.append('Access-Control-Allow-Origin', origin);
  }
  res.headers.append('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.append(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  return res;
}

export const config = {
  matcher: '/:path*',
};
