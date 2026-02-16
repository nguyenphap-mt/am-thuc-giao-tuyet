import { NextRequest, NextResponse } from 'next/server';

/**
 * BUGFIX: BUG-20260216-005 — Users Tab 404
 *
 * Catch-all API proxy with smart trailing-slash handling.
 *
 * Problem: Next.js normalizes URLs by stripping trailing slashes before
 * processing routes. The backend has redirect_slashes=False with an
 * inconsistent mix of routes:
 *   - /api/v1/users/  (requires trailing slash)
 *   - /api/v1/users/stats  (NO trailing slash)
 *
 * Solution: Try the request without trailing slash first. If the backend
 * returns 404, retry with a trailing slash. This handles both cases.
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
    const pathSegments = params.path.join('/');
    const search = request.nextUrl.search;

    // Build backend URL — start without trailing slash
    const backendPath = `/api/v1/${pathSegments}`;

    // Forward headers (exclude hop-by-hop headers)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    // Read body once for potential retry
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text();
    }

    try {
        // First attempt: without trailing slash
        let response = await doFetch(
            `${API_BACKEND}${backendPath}${search}`,
            request.method,
            headers,
            body
        );

        // If 404, retry with trailing slash (backend has mixed conventions)
        if (response.status === 404) {
            const retryUrl = `${API_BACKEND}${backendPath}/${search}`;
            response = await doFetch(retryUrl, request.method, headers, body);
        }

        return buildResponse(response);
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { detail: 'Backend service unavailable' },
            { status: 502 }
        );
    }
}

async function doFetch(
    url: string,
    method: string,
    headers: Headers,
    body?: string
): Promise<Response> {
    const fetchOptions: RequestInit = { method, headers };
    if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = body;
    }
    return fetch(url, fetchOptions);
}

async function buildResponse(response: Response): Promise<NextResponse> {
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
        // Skip hop-by-hop headers
        if (
            !['transfer-encoding', 'content-encoding', 'connection'].includes(
                key.toLowerCase()
            )
        ) {
            responseHeaders.set(key, value);
        }
    });

    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });
}
