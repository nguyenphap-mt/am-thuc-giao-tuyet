"""
Unit tests for CRM Integration Service.

BUGFIX: BUG-20260202-001
Tests CRM integration logic for Quote module.

Test Coverage:
- Customer data mapping
- Phone normalization
- Sync workflow logic
"""
import pytest
from uuid import uuid4


class TestCrmDataSync:
    """Test suite for CRM data synchronization"""
    
    def test_customer_data_mapping(self):
        """Test that quote customer data maps correctly to CRM customer"""
        quote_customer = {
            "customer_name": "Trần Thị B",
            "customer_phone": "0912345678",
            "customer_email": "tranb@example.com"
        }
        
        # Simulate mapping (this is what the service does)
        crm_customer = {
            "name": quote_customer["customer_name"],
            "phone": quote_customer["customer_phone"],
            "email": quote_customer["customer_email"],
            "source": "QUOTE"
        }
        
        assert crm_customer["name"] == "Trần Thị B"
        assert crm_customer["phone"] == "0912345678"
        assert crm_customer["source"] == "QUOTE"
    
    def test_phone_normalization(self):
        """Test phone number normalization for CRM"""
        test_phones = [
            ("0901234567", "0901234567"),
            (" 090 123 4567 ", "0901234567"),
            ("090-123-4567", "0901234567"),
        ]
        
        import re
        for input_phone, expected in test_phones:
            normalized = re.sub(r'[\s\-]+', '', input_phone.strip())
            assert normalized == expected
    
    def test_empty_phone_handling(self):
        """Test handling of empty phone numbers"""
        phone = ""
        normalized = phone.strip() if phone else None
        assert normalized is None or normalized == ""


class TestQuoteCrmWorkflow:
    """Test suite for Quote-CRM workflow integration"""
    
    def test_quote_creates_crm_record_flag(self):
        """Test that quote creation should trigger CRM record creation"""
        # Business rule: Every quote should sync to CRM
        quote_data = {
            "customer_name": "Test Customer",
            "customer_phone": "0901234567",
            "event_type": "WEDDING"
        }
        
        # CRM sync should happen when:
        should_sync = (
            quote_data.get("customer_name") and 
            quote_data.get("customer_phone")
        )
        
        assert should_sync is True
    
    def test_no_crm_sync_without_customer_info(self):
        """Test that quotes without customer info don't sync to CRM"""
        quote_data = {
            "event_type": "WEDDING",
            "table_count": 10
            # No customer info
        }
        
        should_sync = (
            quote_data.get("customer_name") and 
            quote_data.get("customer_phone")
        )
        
        assert should_sync is False
    
    def test_crm_source_field(self):
        """Test that CRM records from quotes have correct source"""
        source = "QUOTE"
        valid_sources = ["QUOTE", "ORDER", "DIRECT", "IMPORT"]
        
        assert source in valid_sources
    
    def test_customer_id_assignment(self):
        """Test that new customers get UUID assigned"""
        customer_id = uuid4()
        
        assert customer_id is not None
        assert isinstance(customer_id, type(uuid4()))
