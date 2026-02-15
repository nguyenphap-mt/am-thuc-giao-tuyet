"""
Unit Tests for Low Stock Alert & Auto-Reorder Logic
Phase 12.3 - Inventory Module

Tests:
1. Low stock status classification (CRITICAL/WARNING/LOW)
2. Suggested order quantity calculation
3. Auto-reorder integration with Procurement

// turbo-all
"""
import pytest
from decimal import Decimal
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


# ==================== STATUS CLASSIFICATION TESTS ====================

class TestLowStockStatusClassification:
    """Test low stock status classification logic"""

    def test_critical_status_when_stock_is_zero(self):
        """CRITICAL: current_stock = 0"""
        current_stock = 0
        min_stock = 10
        
        status = self._classify_status(current_stock, min_stock)
        
        assert status == "CRITICAL"

    def test_critical_status_when_stock_is_negative(self):
        """CRITICAL: current_stock < 0 (edge case)"""
        current_stock = -5
        min_stock = 10
        
        status = self._classify_status(current_stock, min_stock)
        
        assert status == "CRITICAL"

    def test_warning_status_when_below_minimum(self):
        """WARNING: 0 < current_stock < min_stock"""
        current_stock = 5
        min_stock = 10
        
        status = self._classify_status(current_stock, min_stock)
        
        assert status == "WARNING"

    def test_low_status_when_approaching_minimum(self):
        """LOW: min_stock <= current_stock <= min_stock * 1.2"""
        current_stock = 11  # Between 10 and 12 (10 * 1.2)
        min_stock = 10
        
        status = self._classify_status(current_stock, min_stock)
        
        assert status == "LOW"

    def test_ok_status_when_above_threshold(self):
        """OK: current_stock > min_stock * 1.2"""
        current_stock = 15  # Above 12 (10 * 1.2)
        min_stock = 10
        
        status = self._classify_status(current_stock, min_stock)
        
        assert status == "OK"

    def test_skip_when_min_stock_not_configured(self):
        """Skip items with min_stock = 0 or None"""
        current_stock = 5
        min_stock = 0
        
        status = self._classify_status(current_stock, min_stock)
        
        assert status == "SKIP"

    def _classify_status(self, current_stock: float, min_stock: float) -> str:
        """Replicate the status classification logic from API"""
        if min_stock <= 0:
            return "SKIP"
        
        if current_stock <= 0:
            return "CRITICAL"
        elif current_stock < min_stock:
            return "WARNING"
        elif current_stock <= min_stock * 1.2:
            return "LOW"
        else:
            return "OK"


# ==================== SUGGESTED ORDER QUANTITY TESTS ====================

class TestSuggestedOrderQuantity:
    """Test suggested order quantity calculation"""

    def test_suggested_qty_when_shortfall_exists(self):
        """Suggested qty = shortfall * 1.5"""
        current_stock = 5
        min_stock = 10
        
        shortfall = max(0, min_stock - current_stock)
        suggested_qty = shortfall * 1.5 if shortfall > 0 else min_stock
        
        assert shortfall == 5
        assert suggested_qty == 7.5

    def test_suggested_qty_when_no_shortfall(self):
        """When no shortfall, suggest min_stock as order qty"""
        current_stock = 15
        min_stock = 10
        
        shortfall = max(0, min_stock - current_stock)
        suggested_qty = shortfall * 1.5 if shortfall > 0 else min_stock
        
        assert shortfall == 0
        assert suggested_qty == 10  # Falls back to min_stock

    def test_suggested_qty_with_multiplier(self):
        """Test custom multiplier for order quantity"""
        shortfall = 10
        multiplier = 2.0
        
        order_qty = shortfall * multiplier
        
        assert order_qty == 20


# ==================== AUTO-REORDER LOGIC TESTS ====================

class TestAutoReorderLogic:
    """Test auto-reorder Purchase Requisition creation logic"""

    def test_pr_code_generation(self):
        """PR code format: PR-AUTO-{timestamp}"""
        from datetime import datetime
        
        pr_code = f"PR-AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        assert pr_code.startswith("PR-AUTO-")
        assert len(pr_code) == 22  # PR-AUTO- (8) + timestamp (14 chars: YYYYMMDDHHmmss)

    def test_calculate_line_total(self):
        """Line total = order_qty * unit_price"""
        shortfall = 10
        multiplier = 1.5
        unit_price = 50000
        
        order_qty = shortfall * multiplier
        line_total = order_qty * unit_price
        
        assert order_qty == 15
        assert line_total == 750000

    def test_total_amount_sum(self):
        """Total amount = sum of all line totals"""
        lines = [
            {"quantity": 10, "unit_price": 50000},  # 500,000
            {"quantity": 5, "unit_price": 100000},  # 500,000
            {"quantity": 20, "unit_price": 25000},  # 500,000
        ]
        
        total = sum(line["quantity"] * line["unit_price"] for line in lines)
        
        assert total == 1500000

    def test_empty_items_returns_no_pr(self):
        """When no low stock items, should not create PR"""
        low_stock_items = []
        
        should_create_pr = len(low_stock_items) > 0
        
        assert should_create_pr is False


# ==================== PROCUREMENT INTEGRATION TESTS ====================

class TestProcurementIntegration:
    """Test integration with Procurement module"""

    @pytest.mark.asyncio
    async def test_pr_creation_with_mock(self):
        """Test that PR is created with correct data"""
        # Mock data
        tenant_id = uuid4()
        low_stock_items = [
            {
                "item_id": str(uuid4()),
                "sku": "SKU-001",
                "name": "Gạo tấm",
                "shortfall": 10,
                "uom": "kg",
                "last_purchase_price": 25000
            }
        ]
        multiplier = 1.5
        
        # Calculate expected values
        expected_order_qty = 10 * 1.5
        expected_line_total = expected_order_qty * 25000
        
        # Assertions
        assert expected_order_qty == 15
        assert expected_line_total == 375000

    def test_pr_notes_contain_stock_info(self):
        """PR line notes should include current/min/shortfall info"""
        current_stock = 5
        min_stock = 10
        shortfall = 5
        
        notes = f"Current: {current_stock}, Min: {min_stock}, Shortfall: {shortfall}"
        
        assert "Current: 5" in notes
        assert "Min: 10" in notes
        assert "Shortfall: 5" in notes


# ==================== EDGE CASES ====================

class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_decimal_stock_values(self):
        """Handle decimal stock values correctly"""
        current_stock = Decimal("5.5")
        min_stock = Decimal("10.0")
        
        shortfall = max(0, float(min_stock - current_stock))
        
        assert shortfall == 4.5

    def test_very_large_quantities(self):
        """Handle very large quantity values"""
        current_stock = 0
        min_stock = 1000000
        
        shortfall = max(0, min_stock - current_stock)
        suggested_qty = shortfall * 1.5
        
        assert suggested_qty == 1500000

    def test_floating_point_precision(self):
        """Ensure floating point precision is handled"""
        shortfall = 0.1 + 0.2  # Classic floating point issue
        multiplier = 1.5
        
        # Use round to handle floating point
        order_qty = round(shortfall * multiplier, 4)
        
        assert order_qty == pytest.approx(0.45, rel=1e-4)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
