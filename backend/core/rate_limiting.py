"""
Rate Limiting Configuration for FastAPI.

BUGFIX: ISS-002 - No Rate Limiting
Uses slowapi for distributed rate limiting with in-memory storage.

Configuration:
- Read endpoints: 60/minute per IP
- Write endpoints: 20/minute per IP
- Delete/Convert: 10/minute per IP (higher protection)
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request


# Create limiter instance with IP-based rate limiting
limiter = Limiter(key_func=get_remote_address)


# Rate limit decorators for different endpoint types
RATE_LIMITS = {
    "read": "60/minute",      # List, Get endpoints
    "write": "20/minute",     # Create, Update endpoints  
    "delete": "10/minute",    # Delete endpoints (highest protection)
    "convert": "10/minute",   # Conversion endpoints (irreversible)
    "export": "30/minute",    # Export/Download endpoints
}


def get_rate_limit_exceeded_handler():
    """Get the rate limit exceeded handler for FastAPI."""
    return _rate_limit_exceeded_handler


def get_rate_limit_exception():
    """Get the RateLimitExceeded exception for FastAPI exception handler."""
    return RateLimitExceeded
