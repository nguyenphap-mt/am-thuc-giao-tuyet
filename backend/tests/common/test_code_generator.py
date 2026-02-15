"""
Unit tests for code_generator utility module.

BUGFIX: BUG-20260202-004
Root Cause: RC-BUG-20260202-004 - No tests for code generation logic
Solution: Comprehensive pytest test suite for all code generation functions
"""
import pytest
import re
from backend.common.utils.code_generator import (
    generate_entity_code,
    generate_quote_code,
    generate_order_code,
    generate_invoice_code,
    generate_receipt_code
)


class TestGenerateEntityCode:
    """Test suite for generate_entity_code function"""
    
    def test_generates_code_with_correct_format(self):
        """Test that code follows PREFIX-YYYYNNNNNN format"""
        code = generate_entity_code("BG")
        
        # Should match pattern: BG-2026123456
        pattern = r'^BG-\d{10}$'
        assert re.match(pattern, code), f"Code '{code}' does not match expected format"
    
    def test_uses_current_year_by_default(self):
        """Test that code uses current year when no year specified"""
        from datetime import datetime
        current_year = datetime.now().year
        
        code = generate_entity_code("DH")
        
        assert code.startswith(f"DH-{current_year}"), f"Code should start with DH-{current_year}"
    
    def test_uses_specified_year(self):
        """Test that code uses specified year when provided"""
        code = generate_entity_code("HD", year=2025)
        
        assert code.startswith("HD-2025"), "Code should start with HD-2025"
    
    def test_generates_unique_codes(self):
        """Test that consecutive calls generate different codes"""
        code1 = generate_entity_code("BG")
        code2 = generate_entity_code("BG")
        
        # While not guaranteed, statistically very unlikely with 6-digit random suffix
        assert code1 != code2, "Consecutive codes should be different"
    
    def test_supports_all_entity_types(self):
        """Test that all entity prefixes work correctly"""
        prefixes = ["BG", "DH", "HD", "PN"]
        
        for prefix in prefixes:
            code = generate_entity_code(prefix)
            assert code.startswith(f"{prefix}-"), f"Code should start with {prefix}-"
    
    def test_random_suffix_is_6_digits(self):
        """Test that random suffix is always 6 digits"""
        code = generate_entity_code("BG", year=2026)
        
        # Extract suffix: "BG-2026123456" -> "123456"
        suffix = code.split("-")[1][4:]  # Remove year prefix, keep last 6 digits
        
        assert len(suffix) == 6, f"Suffix '{suffix}' should be 6 digits"
        assert suffix.isdigit(), f"Suffix '{suffix}' should be all digits"
        assert 100000 <= int(suffix) <= 999999, f"Suffix '{suffix}' should be in range 100000-999999"


class TestGenerateQuoteCode:
    """Test suite for generate_quote_code function"""
    
    def test_generates_quote_code_with_bg_prefix(self):
        """Test that quote code starts with BG prefix"""
        code = generate_quote_code()
        
        assert code.startswith("BG-"), "Quote code should start with 'BG-'"
    
    def test_quote_code_format(self):
        """Test that quote code follows BG-YYYYNNNNNN format"""
        code = generate_quote_code()
        
        pattern = r'^BG-\d{10}$'
        assert re.match(pattern, code), f"Quote code '{code}' does not match expected format"
    
    def test_generates_different_quote_codes(self):
        """Test that multiple calls generate different codes"""
        codes = [generate_quote_code() for _ in range(5)]
        
        assert len(codes) == len(set(codes)), "All generated quote codes should be unique"


class TestGenerateOrderCode:
    """Test suite for generate_order_code function"""
    
    def test_generates_order_code_with_dh_prefix(self):
        """Test that order code starts with DH prefix"""
        code = generate_order_code()
        
        assert code.startswith("DH-"), "Order code should start with 'DH-'"
    
    def test_order_code_format(self):
        """Test that order code follows DH-YYYYNNNNNN format"""
        code = generate_order_code()
        
        pattern = r'^DH-\d{10}$'
        assert re.match(pattern, code), f"Order code '{code}' does not match expected format"
    
    def test_generates_different_order_codes(self):
        """Test that multiple calls generate different codes"""
        codes = [generate_order_code() for _ in range(5)]
        
        assert len(codes) == len(set(codes)), "All generated order codes should be unique"


class TestGenerateInvoiceCode:
    """Test suite for generate_invoice_code function"""
    
    def test_generates_invoice_code_with_hd_prefix(self):
        """Test that invoice code starts with HD prefix"""
        code = generate_invoice_code()
        
        assert code.startswith("HD-"), "Invoice code should start with 'HD-'"
    
    def test_invoice_code_format(self):
        """Test that invoice code follows HD-YYYYNNNNNN format"""
        code = generate_invoice_code()
        
        pattern = r'^HD-\d{10}$'
        assert re.match(pattern, code), f"Invoice code '{code}' does not match expected format"


class TestGenerateReceiptCode:
    """Test suite for generate_receipt_code function"""
    
    def test_generates_receipt_code_with_pn_prefix(self):
        """Test that receipt code starts with PN prefix"""
        code = generate_receipt_code()
        
        assert code.startswith("PN-"), "Receipt code should start with 'PN-'"
    
    def test_receipt_code_format(self):
        """Test that receipt code follows PN-YYYYNNNNNN format"""
        code = generate_receipt_code()
        
        pattern = r'^PN-\d{10}$'
        assert re.match(pattern, code), f"Receipt code '{code}' does not match expected format"


class TestCodeGeneratorIntegration:
    """Integration tests for code generator usage"""
    
    def test_different_entity_types_generate_different_prefixes(self):
        """Test that different entity types have different prefixes"""
        quote_code = generate_quote_code()
        order_code = generate_order_code()
        invoice_code = generate_invoice_code()
        receipt_code = generate_receipt_code()
        
        assert quote_code.startswith("BG-")
        assert order_code.startswith("DH-")
        assert invoice_code.startswith("HD-")
        assert receipt_code.startswith("PN-")
    
    def test_no_collision_between_entity_types(self):
        """Test that different entity types don't collide"""
        codes = [
            generate_quote_code(),
            generate_order_code(),
            generate_invoice_code(),
            generate_receipt_code()
        ]
        
        # Should all be unique due to different prefixes
        assert len(codes) == len(set(codes)), "Codes from different entity types should be unique"
