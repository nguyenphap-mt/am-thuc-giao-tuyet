"""
Unit tests for code_generator utility module.

Updated: 2026-02-22
Format: BG-ddmmyy*** and ĐH-ddmmyy***
Tests use mock AsyncSession to verify date-based sequential code generation.
"""
import pytest
import re
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from backend.common.utils.code_generator import (
    generate_entity_code,
    generate_quote_code,
    generate_order_code,
    generate_invoice_code,
    generate_receipt_code
)


def _make_mock_db(existing_code=None):
    """Create a mock AsyncSession that returns an existing code for sequence lookup."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    
    if existing_code:
        mock_row = MagicMock()
        mock_row.__getitem__ = lambda self, idx: existing_code
        mock_result.first.return_value = mock_row
    else:
        mock_result.first.return_value = None
    
    mock_db.execute.return_value = mock_result
    return mock_db


@pytest.mark.asyncio
class TestGenerateEntityCode:
    """Test suite for generate_entity_code function"""
    
    async def test_generates_code_with_correct_format(self):
        """Test that code follows PREFIX-ddmmyy*** format"""
        mock_db = _make_mock_db()
        code = await generate_entity_code("BG", mock_db)
        
        # Should match pattern: BG-ddmmyy001 (12 chars total)
        pattern = r'^BG-\d{6}\d{3}$'
        assert re.match(pattern, code), f"Code '{code}' does not match expected format BG-ddmmyy***"
    
    async def test_uses_current_date(self):
        """Test that code uses current date"""
        mock_db = _make_mock_db()
        code = await generate_entity_code("ĐH", mock_db)
        
        # Extract date part (after ĐH-)
        # ĐH is 2 bytes in Python str but we use string slicing
        prefix_end = code.index('-') + 1
        date_part = code[prefix_end:prefix_end + 6]  # ddmmyy
        today = datetime.now().strftime('%d%m%y')
        assert date_part == today, f"Date part '{date_part}' should match today '{today}'"
    
    async def test_first_code_of_day_is_001(self):
        """Test that first code of the day starts at 001"""
        mock_db = _make_mock_db()  # No existing code
        code = await generate_entity_code("BG", mock_db)
        
        seq = code[-3:]  # Last 3 chars
        assert seq == "001", f"First sequence should be 001, got {seq}"
    
    async def test_increments_sequence(self):
        """Test that sequence increments from existing codes"""
        today = datetime.now().strftime('%d%m%y')
        existing_code = f"BG-{today}005"
        mock_db = _make_mock_db(existing_code)
        
        code = await generate_entity_code("BG", mock_db)
        
        seq = code[-3:]
        assert seq == "006", f"Sequence should be 006 after 005, got {seq}"
    
    async def test_supports_all_entity_types(self):
        """Test that all entity prefixes work correctly"""
        prefixes = ["BG", "ĐH", "HD", "PN"]
        
        for prefix in prefixes:
            mock_db = _make_mock_db()
            code = await generate_entity_code(prefix, mock_db)
            assert code.startswith(f"{prefix}-"), f"Code should start with {prefix}-"


@pytest.mark.asyncio
class TestGenerateQuoteCode:
    """Test suite for generate_quote_code function"""
    
    async def test_generates_quote_code_with_bg_prefix(self):
        """Test that quote code starts with BG prefix"""
        mock_db = _make_mock_db()
        code = await generate_quote_code(mock_db)
        
        assert code.startswith("BG-"), "Quote code should start with 'BG-'"
    
    async def test_quote_code_format(self):
        """Test that quote code follows BG-ddmmyy*** format"""
        mock_db = _make_mock_db()
        code = await generate_quote_code(mock_db)
        
        pattern = r'^BG-\d{6}\d{3}$'
        assert re.match(pattern, code), f"Quote code '{code}' does not match expected format"
    
    async def test_first_quote_of_day(self):
        """Test first quote of the day is 001"""
        mock_db = _make_mock_db()
        code = await generate_quote_code(mock_db)
        
        assert code.endswith("001"), f"First quote should end with 001, got {code}"


@pytest.mark.asyncio
class TestGenerateOrderCode:
    """Test suite for generate_order_code function"""
    
    async def test_generates_order_code_with_dh_prefix(self):
        """Test that order code starts with ĐH prefix"""
        mock_db = _make_mock_db()
        code = await generate_order_code(mock_db)
        
        assert code.startswith("ĐH-"), "Order code should start with 'ĐH-'"
    
    async def test_order_code_format(self):
        """Test that order code follows ĐH-ddmmyy*** format"""
        mock_db = _make_mock_db()
        code = await generate_order_code(mock_db)
        
        # ĐH- followed by 6 digits (date) and 3 digits (seq)
        assert code.startswith("ĐH-")
        rest = code[3:]  # After ĐH-
        pattern = r'^\d{6}\d{3}$'
        assert re.match(pattern, rest), f"Order code '{code}' does not match expected format"
    
    async def test_sequence_increments(self):
        """Test that order sequence increments correctly"""
        today = datetime.now().strftime('%d%m%y')
        existing_code = f"ĐH-{today}010"
        mock_db = _make_mock_db(existing_code)
        
        code = await generate_order_code(mock_db)
        assert code.endswith("011"), f"Sequence should be 011 after 010, got {code}"


@pytest.mark.asyncio
class TestGenerateInvoiceCode:
    """Test suite for generate_invoice_code function"""
    
    async def test_generates_invoice_code_with_hd_prefix(self):
        """Test that invoice code starts with HD prefix"""
        code = await generate_invoice_code()
        assert code.startswith("HD-"), "Invoice code should start with 'HD-'"
    
    async def test_invoice_code_format(self):
        """Test that invoice code follows HD-ddmmyy*** format"""
        code = await generate_invoice_code()
        
        pattern = r'^HD-\d{6}\d{3}$'
        assert re.match(pattern, code), f"Invoice code '{code}' does not match expected format"


@pytest.mark.asyncio
class TestGenerateReceiptCode:
    """Test suite for generate_receipt_code function"""
    
    async def test_generates_receipt_code_with_pn_prefix(self):
        """Test that receipt code starts with PN prefix"""
        code = await generate_receipt_code()
        assert code.startswith("PN-"), "Receipt code should start with 'PN-'"
    
    async def test_receipt_code_format(self):
        """Test that receipt code follows PN-ddmmyy*** format"""
        code = await generate_receipt_code()
        
        pattern = r'^PN-\d{6}\d{3}$'
        assert re.match(pattern, code), f"Receipt code '{code}' does not match expected format"


@pytest.mark.asyncio
class TestCodeGeneratorIntegration:
    """Integration tests for code generator usage"""
    
    async def test_different_entity_types_generate_different_prefixes(self):
        """Test that different entity types have different prefixes"""
        mock_db = _make_mock_db()
        
        quote_code = await generate_quote_code(mock_db)
        order_code = await generate_order_code(mock_db)
        invoice_code = await generate_invoice_code()
        receipt_code = await generate_receipt_code()
        
        assert quote_code.startswith("BG-")
        assert order_code.startswith("ĐH-")
        assert invoice_code.startswith("HD-")
        assert receipt_code.startswith("PN-")
    
    async def test_no_collision_between_entity_types(self):
        """Test that different entity types don't collide"""
        mock_db = _make_mock_db()
        
        codes = [
            await generate_quote_code(mock_db),
            await generate_order_code(mock_db),
            await generate_invoice_code(),
            await generate_receipt_code()
        ]
        
        # Should all be unique due to different prefixes
        assert len(codes) == len(set(codes)), "Codes from different entity types should be unique"
