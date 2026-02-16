import { NextRequest, NextResponse } from 'next/server';

/**
 * BUGFIX: BUG-20260216-005 — Users Tab 404
 *
 * Catch-all API proxy that preserves trailing slashes.
 *
 * Problem: Next.js rewrites strip trailing slashes before proxying.
 * The backend has redirect_slashes=False and routes defined with trailing
 * slashes (e.g. /api/v1/users/). Without this proxy, /api/v1/users/ becomes
 * /api/v1/users → 404 on backend.
 *
 * Solution: Manual proxy via API route handler that preserves the exact
 * URL path including trailing slashes.
 */

const API_BACKEND =
    process.env.API_BACKEND_URL ||
    'https://am-thuc-api-321822391174.asia-southeast1.run.app';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

async function proxyRequest(
    request: NextRequest,
    params: { path: string[] }
) {
    // Reconstruct the original path preserving trailing slash
    const originalUrl = request.nextUrl.pathname;
    const search = request.nextUrl.search;

    // Build backend URL using the original pathname (preserves trailing slash)
    const backendUrl = `${API_BACKEND}${originalUrl}${search}`;

    // Forward headers (exclude host-related ones)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers,
        };

        // Forward body for non-GET requests
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const body = await request.text();
            if (body) {
                fetchOptions.body = body;
            }
        }

        const response = await fetch(backendUrl, fetchOptions);

        // Forward the response back
        const responseHeaders = new Headers();
        response.headers.forEach((value, key) => {
            // Skip headers that Next.js should control
            if (!['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        });

        const responseBody = await response.arrayBuffer();

        return new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { detail: 'Backend service unavailable' },
            { status: 502 }
        );
    }
}
