"""
SQLAlchemy ORM Models for Finance Module
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, Text, Boolean, Numeric, ForeignKey, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base


class AccountingPeriodModel(Base):
    """SQLAlchemy ORM Model for Accounting Period (Kỳ kế toán)"""
    __tablename__ = "accounting_periods"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Period Info
    name = Column(String(100), nullable=False)  # e.g., "Tháng 01/2026"
    period_type = Column(String(20), nullable=False, default='MONTHLY')  # MONTHLY, QUARTERLY, YEARLY
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Status: OPEN (can add journals), CLOSING (review), CLOSED (locked)
    status = Column(String(20), nullable=False, default='OPEN')
    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Closing balances (snapshot)
    closing_total_debit = Column(Numeric(18, 2), nullable=True)
    closing_total_credit = Column(Numeric(18, 2), nullable=True)
    closing_retained_earnings = Column(Numeric(18, 2), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AccountModel(Base):
    """SQLAlchemy ORM Model for Chart of Accounts (Hệ thống tài khoản)"""
    __tablename__ = "accounts"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Account Info
    code = Column(String(50), nullable=False)  # 111, 112, 131, etc.
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    journal_lines = relationship("JournalLineModel", back_populates="account")


class JournalModel(Base):
    """SQLAlchemy ORM Model for Journal Entry (Bút toán kế toán)"""
    __tablename__ = "journals"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Journal Info
    code = Column(String(50), nullable=False)  # JNL-202601-001
    date = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(Text)
    total_amount = Column(Numeric(15, 2), default=0)
    
    # Reference to source document
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # Order ID, PO ID, etc.
    reference_type = Column(String(50), nullable=True)  # ORDER, PURCHASE_ORDER, SALARY
    
    # Journal Status Workflow (FIN-001)
    status = Column(String(20), default='DRAFT')  # DRAFT, POSTED, REVERSED
    posted_at = Column(DateTime(timezone=True), nullable=True)
    posted_by = Column(UUID(as_uuid=True), nullable=True)  # User who posted
    reversed_journal_id = Column(UUID(as_uuid=True), nullable=True)  # Reference to reversal journal
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    lines = relationship("JournalLineModel", back_populates="journal", cascade="all, delete-orphan")


class JournalLineModel(Base):
    """SQLAlchemy ORM Model for Journal Line (Chi tiết bút toán)"""
    __tablename__ = "journal_lines"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Journal reference
    journal_id = Column(UUID(as_uuid=True), ForeignKey("journals.id", ondelete="CASCADE"), nullable=False)
    
    # Account reference
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    
    # Amounts (Double-entry)
    debit = Column(Numeric(15, 2), default=0)
    credit = Column(Numeric(15, 2), default=0)
    description = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    journal = relationship("JournalModel", back_populates="lines")
    account = relationship("AccountModel", back_populates="journal_lines")


class FinanceTransactionModel(Base):
    """SQLAlchemy ORM Model for Finance Transactions (Thu/Chi tiền)"""
    __tablename__ = "finance_transactions"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Transaction Info
    code = Column(String(50), nullable=False)  # THU-202601-001, CHI-202601-001
    type = Column(String(20), nullable=False)  # RECEIPT, PAYMENT
    category = Column(String(50))  # ORDER, PROCUREMENT, SALARY, OPERATING
    
    # Amount
    amount = Column(Numeric(15, 2), nullable=False)
    payment_method = Column(String(20))  # CASH, BANK_TRANSFER, CARD
    
    # Reference to source
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    reference_type = Column(String(20), nullable=True)  # ORDER, PURCHASE_ORDER, SALARY
    
    # Details
    description = Column(Text)
    transaction_date = Column(Date, nullable=False)
    
    # Accounting link
    journal_id = Column(UUID(as_uuid=True), ForeignKey("journals.id"), nullable=True)
    
    # Audit
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BudgetModel(Base):
    """SQLAlchemy ORM Model for Budget (Ngân sách)"""
    __tablename__ = "budgets"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Budget Info
    code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Period
    period_type = Column(String(20), nullable=False, default='ANNUAL')  # ANNUAL, QUARTERLY, MONTHLY
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    fiscal_year = Column(String(10), nullable=False)
    
    # Status
    status = Column(String(20), nullable=False, default='DRAFT')  # DRAFT, ACTIVE, CLOSED, ARCHIVED
    
    # Totals
    total_amount = Column(Numeric(15, 2), default=0)
    
    # Approval
    created_by = Column(UUID(as_uuid=True), nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    lines = relationship("BudgetLineModel", back_populates="budget", cascade="all, delete-orphan")


class BudgetLineModel(Base):
    """SQLAlchemy ORM Model for Budget Line (Chi tiết ngân sách)"""
    __tablename__ = "budget_lines"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Budget reference
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False)
    
    # Account reference (optional)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    
    # Line info
    category = Column(String(100))
    line_name = Column(String(255), nullable=False)
    
    # Amounts
    budgeted_amount = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Monthly breakdown (optional)
    jan_amount = Column(Numeric(15, 2), default=0)
    feb_amount = Column(Numeric(15, 2), default=0)
    mar_amount = Column(Numeric(15, 2), default=0)
    apr_amount = Column(Numeric(15, 2), default=0)
    may_amount = Column(Numeric(15, 2), default=0)
    jun_amount = Column(Numeric(15, 2), default=0)
    jul_amount = Column(Numeric(15, 2), default=0)
    aug_amount = Column(Numeric(15, 2), default=0)
    sep_amount = Column(Numeric(15, 2), default=0)
    oct_amount = Column(Numeric(15, 2), default=0)
    nov_amount = Column(Numeric(15, 2), default=0)
    dec_amount = Column(Numeric(15, 2), default=0)
    
    # Notes
    note = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    budget = relationship("BudgetModel", back_populates="lines")
    account = relationship("AccountModel")


class PeriodAuditLogModel(Base):
    """SQLAlchemy ORM Model for Period Audit Log (Lịch sử thao tác kỳ kế toán)"""
    __tablename__ = "period_audit_log"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Period reference
    period_id = Column(UUID(as_uuid=True), ForeignKey("accounting_periods.id", ondelete="CASCADE"), nullable=False)
    
    # Action info
    action = Column(String(50), nullable=False)  # CLOSE, REOPEN, CREATE, DELETE
    performed_by = Column(UUID(as_uuid=True), nullable=True)
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text, nullable=True)
    extra_data = Column(Text, nullable=True)  # JSON string for extra data
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PeriodCloseChecklistModel(Base):
    """SQLAlchemy ORM Model for Period Close Checklist (Checklist đóng kỳ)"""
    __tablename__ = "period_close_checklist"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Tenant ID (RLS)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Period reference
    period_id = Column(UUID(as_uuid=True), ForeignKey("accounting_periods.id", ondelete="CASCADE"), nullable=False)
    
    # Check info
    check_name = Column(String(100), nullable=False)
    check_key = Column(String(50), nullable=False)  # journals_posted, ar_reconciled, etc.
    check_order = Column(Numeric(5, 0), nullable=False, default=0)
    is_automated = Column(Boolean, default=False)  # TRUE = system checks automatically
    is_completed = Column(Boolean, default=False)
    completed_by = Column(UUID(as_uuid=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
