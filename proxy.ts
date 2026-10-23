import { NextRequest, NextResponse } from 'next/server';

// The cookie selects a company, never authorizes it. The API binds every JWT to its tenant.
export function proxy(request: NextRequest) {
    const headers = new Headers(request.headers);
    if (!headers.has('X-Tenant')) headers.set('X-Tenant', request.cookies.get('tenant_slug')?.value || 'default');
    return NextResponse.next({ request: { headers } });
}
export const config = { matcher: '/api/:path*' };
