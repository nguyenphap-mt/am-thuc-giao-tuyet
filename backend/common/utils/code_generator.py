"""
Code generation utilities for Quote and Order modules.

UPDATED: 2026-02-22
Format Change: 
- Quote: BG-ddmmyy*** (e.g. BG-220226001)
- Order: ĐH-ddmmyy*** (e.g. ĐH-220226001)
Where *** is sequential 001-999 per day, queried from DB.

This module provides utilities for generating unique codes for various entities
in the Catering ERP system.

Supported Prefixes:
- BG: Báo giá (Quote)
- ĐH: Đơn hàng (Order)
- HD: Hóa đơn (Invoice)
- PN: Phiếu nhập (Receipt)
"""
from datetime import datetime
from typing import Literal, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

import pytz

# Vietnam timezone
VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

# Type alias for supported entity prefixes
EntityPrefix = Literal["BG", "ĐH", "HD", "PN"]

# Mapping prefix to table name for sequence lookup
PREFIX_TABLE_MAP = {
    "BG": "quotes",
    "ĐH": "orders",
}


async def _get_next_sequence(db: AsyncSession, table_name: str, prefix: str, date_str: str) -> int:
    """
    Query DB to find the next sequence number for the given prefix and date.
    
    Args:
        db: Async database session
        table_name: Table to query (quotes or orders)
        prefix: Code prefix (BG or ĐH)
        date_str: Date string in ddmmyy format
    
    Returns:
        Next sequence number (1-999)
    """
    # Pattern to match: PREFIX-ddmmyy followed by digits
    pattern = f"{prefix}-{date_str}%"
    
    result = await db.execute(
        text(f"SELECT code FROM {table_name} WHERE code LIKE :pattern ORDER BY code DESC LIMIT 1"),
        {"pattern": pattern}
    )
    row = result.first()
    
    if row is None:
        return 1
    
    # Extract sequence number from code
    # e.g. "BG-220226005" -> "005" -> 5
    existing_code = row[0]
    # The date part is 6 chars (ddmmyy), prefix varies, dash is 1 char
    # So sequence starts after PREFIX- + ddmmyy = len(prefix) + 1 + 6
    seq_start = len(prefix) + 1 + 6  # PREFIX- = len+1, ddmmyy = 6
    seq_str = existing_code[seq_start:]
    
    try:
        current_max = int(seq_str)
        return current_max + 1
    except (ValueError, IndexError):
        return 1


async def generate_entity_code(
    prefix: EntityPrefix,
    db: Optional[AsyncSession] = None
) -> str:
    """
    Generate unique entity code with date-based sequential format.
    
    New Format: {PREFIX}-ddmmyy{SEQ:03d}
    
    Args:
        prefix: Entity type code
            - BG: Báo giá (Quote)
            - ĐH: Đơn hàng (Order)
            - HD: Hóa đơn (Invoice)
            - PN: Phiếu nhập (Receipt)
        db: AsyncSession for querying sequence (required for BG, ĐH)
    
    Returns:
        Unique code string
        
    Examples:
        >>> await generate_entity_code("BG", db)
        'BG-220226001'
        >>> await generate_entity_code("ĐH", db)
        'ĐH-220226001'
    """
    now = datetime.now(VN_TZ)
    date_str = now.strftime('%d%m%y')  # ddmmyy format (no slashes)
    
    if db is not None and prefix in PREFIX_TABLE_MAP:
        table_name = PREFIX_TABLE_MAP[prefix]
        seq = await _get_next_sequence(db, table_name, prefix, date_str)
    else:
        # Fallback for types without DB lookup (HD, PN) or when db not provided
        import random
        seq = random.randint(1, 999)
    
    return f"{prefix}-{date_str}{seq:03d}"


async def generate_quote_code(db: AsyncSession) -> str:
    """
    Generate unique quote code: BG-ddmmyy***
    
    Args:
        db: AsyncSession for querying sequence
    
    Returns:
        Quote code with format BG-220226001
        
    Example:
        >>> code = await generate_quote_code(db)
        >>> code.startswith("BG-")
        True
    """
    return await generate_entity_code("BG", db)


async def generate_order_code(db: AsyncSession) -> str:
    """
    Generate unique order code: ĐH-ddmmyy***
    
    Args:
        db: AsyncSession for querying sequence
    
    Returns:
        Order code with format ĐH-220226001
        
    Example:
        >>> code = await generate_order_code(db)
        >>> code.startswith("ĐH-")
        True
    """
    return await generate_entity_code("ĐH", db)


async def generate_invoice_code(db: Optional[AsyncSession] = None) -> str:
    """
    Generate unique invoice code: HD-ddmmyy***
    
    Returns:
        Invoice code with format HD-220226001
    """
    return await generate_entity_code("HD", db)


async def generate_receipt_code(db: Optional[AsyncSession] = None) -> str:
    """
    Generate unique receipt code: PN-ddmmyy***
    
    Returns:
        Receipt code with format PN-220226001
    """
    return await generate_entity_code("PN", db)
