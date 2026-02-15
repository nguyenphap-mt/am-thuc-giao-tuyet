"""
Code generation utilities for Quote and Order modules.

BUGFIX: BUG-20260202-004
Root Cause: RC-BUG-20260202-004 - Duplicate code generation logic across multiple endpoints
Solution: Centralized code generation with configurable prefix and year

This module provides utilities for generating unique codes for various entities
in the Catering ERP system following the pattern: {PREFIX}-YYYYNNNNNN

Supported Prefixes:
- BG: Báo giá (Quote)
- DH: Đơn hàng (Order)
- HD: Hóa đơn (Invoice)
- PN: Phiếu nhập (Receipt)
"""
from datetime import datetime
import random
from typing import Literal

# Type alias for supported entity prefixes
EntityPrefix = Literal["BG", "DH", "HD", "PN"]


def generate_entity_code(
    prefix: EntityPrefix,
    year: int | None = None
) -> str:
    """
    Generate unique entity code with format: {PREFIX}-YYYYNNNNNN
    
    Args:
        prefix: Entity type code
            - BG: Báo giá (Quote)
            - DH: Đơn hàng (Order)  
            - HD: Hóa đơn (Invoice)
            - PN: Phiếu nhập (Receipt)
        year: Year to use in code (defaults to current year)
    
    Returns:
        Unique code string in format {PREFIX}-YYYYNNNNNN
        
    Examples:
        >>> generate_entity_code("BG")
        'BG-2026123456'
        >>> generate_entity_code("DH", 2025)
        'DH-2025654321'
        
    Notes:
        - Random suffix is 6 digits (100000-999999)
        - Not guaranteed unique across multiple concurrent calls
        - Database unique constraint should be enforced separately
    """
    if year is None:
        year = datetime.now().year
    
    # Generate 6-digit random suffix
    random_suffix = random.randint(100000, 999999)
    
    return f"{prefix}-{year}{random_suffix}"


def generate_quote_code() -> str:
    """
    Generate unique quote code: BG-YYYYNNNNNN
    
    Returns:
        Quote code with format BG-2026123456
        
    Example:
        >>> code = generate_quote_code()
        >>> code.startswith("BG-2026")
        True
    """
    return generate_entity_code("BG")


def generate_order_code() -> str:
    """
    Generate unique order code: DH-YYYYNNNNNN
    
    Returns:
        Order code with format DH-2026123456
        
    Example:
        >>> code = generate_order_code()
        >>> code.startswith("DH-2026")
        True
    """
    return generate_entity_code("DH")


def generate_invoice_code() -> str:
    """
    Generate unique invoice code: HD-YYYYNNNNNN
    
    Returns:
        Invoice code with format HD-2026123456
    """
    return generate_entity_code("HD")


def generate_receipt_code() -> str:
    """
    Generate unique receipt code: PN-YYYYNNNNNN
    
    Returns:
        Receipt code with format PN-2026123456
    """
    return generate_entity_code("PN")
