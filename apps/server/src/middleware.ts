import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  console.log(`[CORS] ${request.method} ${request.url} from origin: ${origin}`);
  console.log('[CORS] TEMPORARILY DISABLED - ALLOWING ALL ORIGINS');

  // Handle OPTIONS preflight request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });

    // TEMPORARILY ALLOW ALL ORIGINS (but must specify exact origin when credentials=true)
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, Origin, X-Requested-With'
    );
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  }

  // Handle actual request
  const response = NextResponse.next();

  // TEMPORARILY ALLOW ALL ORIGINS (but must specify exact origin when credentials=true)
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, Origin, X-Requested-With'
  );

  return response;
}

export const config = {
  matcher: '/:path*',
};
