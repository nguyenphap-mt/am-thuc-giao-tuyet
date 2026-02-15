"""
Rate Limiting Middleware for FastAPI
Sprint 4.3: Protect API from abuse

Usage:
    from backend.core.middleware.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware, default_limit=100, window_seconds=60)
"""

import time
from collections import defaultdict
from typing import Callable, Dict, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import threading


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter using sliding window algorithm.
    
    For production, consider using Redis for distributed rate limiting.
    """
    
    def __init__(
        self, 
        app, 
        default_limit: int = 100,
        window_seconds: int = 60,
        endpoint_limits: Dict[str, int] = None
    ):
        super().__init__(app)
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self.endpoint_limits = endpoint_limits or {}
        
        # Store: {client_key: [(timestamp, count)]}
        self.requests: Dict[str, list] = defaultdict(list)
        self.lock = threading.Lock()
        
        # Cleanup old entries periodically
        self._last_cleanup = time.time()
    
    def _get_client_key(self, request: Request) -> str:
        """Get unique identifier for the client."""
        # Use X-Forwarded-For for proxied requests
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        return f"{client_ip}"
    
    def _get_limit_for_path(self, path: str) -> int:
        """Get rate limit for specific path."""
        # Check for exact match
        if path in self.endpoint_limits:
            return self.endpoint_limits[path]
        
        # Check for prefix match
        for endpoint_pattern, limit in self.endpoint_limits.items():
            if path.startswith(endpoint_pattern):
                return limit
        
        return self.default_limit
    
    def _cleanup_old_requests(self, current_time: float):
        """Remove expired entries to prevent memory leak."""
        if current_time - self._last_cleanup < 60:  # Cleanup once per minute
            return
        
        self._last_cleanup = current_time
        cutoff = current_time - self.window_seconds
        
        with self.lock:
            keys_to_delete = []
            for key, timestamps in self.requests.items():
                # Remove old timestamps
                self.requests[key] = [t for t in timestamps if t > cutoff]
                if not self.requests[key]:
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                del self.requests[key]
    
    def _is_rate_limited(self, client_key: str, limit: int) -> Tuple[bool, int, int]:
        """
        Check if client is rate limited.
        Returns: (is_limited, current_count, remaining)
        """
        current_time = time.time()
        cutoff = current_time - self.window_seconds
        
        with self.lock:
            # Filter out old requests
            self.requests[client_key] = [
                t for t in self.requests[client_key] 
                if t > cutoff
            ]
            
            current_count = len(self.requests[client_key])
            
            if current_count >= limit:
                return True, current_count, 0
            
            # Record this request
            self.requests[client_key].append(current_time)
            return False, current_count + 1, limit - current_count - 1
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request with rate limiting."""
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/api/health", "/"]:
            return await call_next(request)
        
        # Skip for OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Cleanup periodically
        self._cleanup_old_requests(time.time())
        
        # Get client identifier and limit
        client_key = self._get_client_key(request)
        limit = self._get_limit_for_path(request.url.path)
        
        # Check rate limit
        is_limited, count, remaining = self._is_rate_limited(client_key, limit)
        
        if is_limited:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after_seconds": self.window_seconds
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + self.window_seconds),
                    "Retry-After": str(self.window_seconds)
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.window_seconds)
        
        return response


# Predefined limits for different endpoint types
DEFAULT_ENDPOINT_LIMITS = {
    # Auth endpoints - stricter limits
    "/api/v1/auth/login": 10,      # 10 login attempts per minute
    "/api/v1/auth/register": 5,    # 5 registrations per minute
    
    # Export endpoints - moderate limits (heavy operations)
    "/api/v1/finance/reports/export": 20,
    
    # Public endpoints
    "/api/v1/public": 50,
    
    # Default for all other endpoints: 100/min (set in middleware init)
}
