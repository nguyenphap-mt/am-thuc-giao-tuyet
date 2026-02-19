"""
Journal Service for Finance Auto-Integration
Sprint 17.1: Auto-create Journal entries from Order Payments
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from backend.modules.finance.domain.models import (
    JournalModel, JournalLineModel, AccountModel, FinanceTransactionModel
)


class JournalService:
    """Service for auto-creating journal entries from business transactions"""
    
    # Default tenant (should come from request context in production)
    DEFAULT_TENANT_ID = UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")
    
    # Standard account codes
    ACCOUNT_CASH = "111"       # Tiền mặt
    ACCOUNT_BANK = "112"       # Tiền gửi ngân hàng
    ACCOUNT_RECEIVABLE = "131" # Phải thu khách hàng
    ACCOUNT_REVENUE = "511"    # Doanh thu bán hàng
    ACCOUNT_SALARY = "642"     # Chi phí tiền lương
    ACCOUNT_PAYABLE = "331"    # Phải trả người bán
    
    def __init__(self, db: AsyncSession, tenant_id: UUID = None):
        self.db = db
        self.tenant_id = tenant_id or self.DEFAULT_TENANT_ID
    
    async def get_or_create_account(self, code: str, name: str, account_type: str) -> AccountModel:
        """Get existing account or create if not exists"""
        result = await self.db.execute(
            select(AccountModel).where(
                AccountModel.tenant_id == self.tenant_id,
                AccountModel.code == code
            )
        )
        account = result.scalar_one_or_none()
        
        if not account:
            account = AccountModel(
                tenant_id=self.tenant_id,
                code=code,
                name=name,
                type=account_type,
                is_active=True
            )
            self.db.add(account)
            await self.db.flush()
        
        return account
    
    async def generate_journal_code(self, prefix: str = "JNL") -> str:
        """Generate unique journal code like JNL-202601-001"""
        year_month = datetime.now().strftime("%Y%m")
        
        # Count existing journals for this month
        result = await self.db.execute(
            select(func.count(JournalModel.id)).where(
                JournalModel.tenant_id == self.tenant_id,
                JournalModel.code.like(f"{prefix}-{year_month}%")
            )
        )
        count = result.scalar() or 0
        
        return f"{prefix}-{year_month}-{str(count + 1).zfill(3)}"
    
    async def create_journal_from_payment(
        self,
        payment_id: UUID,
        order_id: UUID,
        amount: Decimal,
        payment_method: str,
        description: str
    ) -> JournalModel:
        """
        Create double-entry journal when order payment is received.
        
        Debit: Cash/Bank (111/112)
        Credit: Revenue (511) or Receivable (131)
        """
        # Get or create accounts
        if payment_method in ['CASH', 'TIEN_MAT']:
            debit_account = await self.get_or_create_account(
                self.ACCOUNT_CASH, "Tiền mặt", "ASSET"
            )
        else:
            debit_account = await self.get_or_create_account(
                self.ACCOUNT_BANK, "Tiền gửi ngân hàng", "ASSET"
            )
        
        credit_account = await self.get_or_create_account(
            self.ACCOUNT_REVENUE, "Doanh thu bán hàng", "REVENUE"
        )
        
        # Create journal entry
        journal_code = await self.generate_journal_code("THU")
        journal = JournalModel(
            tenant_id=self.tenant_id,
            code=journal_code,
            description=description or f"Thu tiền đơn hàng #{order_id}",
            total_amount=amount,
            reference_id=order_id,
            reference_type="ORDER_PAYMENT"
        )
        self.db.add(journal)
        await self.db.flush()
        
        # Create debit line (Cash/Bank)
        debit_line = JournalLineModel(
            tenant_id=self.tenant_id,
            journal_id=journal.id,
            account_id=debit_account.id,
            debit=amount,
            credit=Decimal("0"),
            description=f"Thu tiền - {debit_account.name}"
        )
        self.db.add(debit_line)
        
        # Create credit line (Revenue)
        credit_line = JournalLineModel(
            tenant_id=self.tenant_id,
            journal_id=journal.id,
            account_id=credit_account.id,
            debit=Decimal("0"),
            credit=amount,
            description=f"Doanh thu - {credit_account.name}"
        )
        self.db.add(credit_line)
        
        # Create finance transaction record
        transaction = FinanceTransactionModel(
            tenant_id=self.tenant_id,
            code=journal_code,
            type="RECEIPT",
            category="ORDER",
            amount=amount,
            payment_method=payment_method,
            reference_id=order_id,
            reference_type="ORDER",
            description=description or f"Thu tiền đơn hàng",
            transaction_date=datetime.now().date(),
            journal_id=journal.id
        )
        self.db.add(transaction)
        
        # Use flush instead of commit — let the caller control transaction boundary
        # BUGFIX: Previously called commit() here, but caller also commits → double-commit
        await self.db.flush()
        return journal
    
    async def create_journal_from_payroll(
        self,
        payroll_period_id: UUID,
        total_amount: Decimal,
        payment_method: str = "TRANSFER",
        description: str = None
    ) -> JournalModel:
        """
        Create double-entry journal when payroll is approved.
        
        Debit: Salary Expense (642)
        Credit: Cash/Bank (111/112)
        """
        # Get or create accounts
        debit_account = await self.get_or_create_account(
            self.ACCOUNT_SALARY, "Chi phí tiền lương", "EXPENSE"
        )
        
        if payment_method in ['CASH', 'TIEN_MAT']:
            credit_account = await self.get_or_create_account(
                self.ACCOUNT_CASH, "Tiền mặt", "ASSET"
            )
        else:
            credit_account = await self.get_or_create_account(
                self.ACCOUNT_BANK, "Tiền gửi ngân hàng", "ASSET"
            )
        
        # Create journal entry
        journal_code = await self.generate_journal_code("CHI")
        journal = JournalModel(
            tenant_id=self.tenant_id,
            code=journal_code,
            description=description or f"Chi lương kỳ #{payroll_period_id}",
            total_amount=total_amount,
            reference_id=payroll_period_id,
            reference_type="PAYROLL"
        )
        self.db.add(journal)
        await self.db.flush()
        
        # Create debit line (Salary Expense)
        debit_line = JournalLineModel(
            tenant_id=self.tenant_id,
            journal_id=journal.id,
            account_id=debit_account.id,
            debit=total_amount,
            credit=Decimal("0"),
            description=f"Chi phí lương - {debit_account.name}"
        )
        self.db.add(debit_line)
        
        # Create credit line (Cash/Bank)
        credit_line = JournalLineModel(
            tenant_id=self.tenant_id,
            journal_id=journal.id,
            account_id=credit_account.id,
            debit=Decimal("0"),
            credit=total_amount,
            description=f"Chi tiền - {credit_account.name}"
        )
        self.db.add(credit_line)
        
        # Create finance transaction record
        transaction = FinanceTransactionModel(
            tenant_id=self.tenant_id,
            code=journal_code,
            type="PAYMENT",
            category="SALARY",
            amount=total_amount,
            payment_method=payment_method,
            reference_id=payroll_period_id,
            reference_type="PAYROLL",
            description=description or f"Chi lương nhân viên",
            transaction_date=datetime.now().date(),
            journal_id=journal.id
        )
        self.db.add(transaction)
        
        # Use flush instead of commit — let the caller control transaction boundary
        await self.db.flush()
        return journal


    async def create_journal_from_po_payment(
        self,
        po_id: UUID,
        po_code: str,
        total_amount: Decimal,
        supplier_name: str = "",
        payment_method: str = "TRANSFER",
        description: str = None
    ) -> JournalModel:
        """
        Create double-entry journal when PO is marked as PAID.
        
        Debit: Accounts Payable (331) - Reduces liability
        Credit: Cash/Bank (111/112) - Reduces cash
        """
        # Get or create accounts
        debit_account = await self.get_or_create_account(
            self.ACCOUNT_PAYABLE, "Phải trả người bán", "LIABILITY"
        )
        
        if payment_method in ['CASH', 'TIEN_MAT']:
            credit_account = await self.get_or_create_account(
                self.ACCOUNT_CASH, "Tiền mặt", "ASSET"
            )
        else:
            credit_account = await self.get_or_create_account(
                self.ACCOUNT_BANK, "Tiền gửi ngân hàng", "ASSET"
            )
        
        # Create journal entry
        journal_code = await self.generate_journal_code("CHI")
        desc = description or f"Thanh toán {po_code} - NCC: {supplier_name}"
        journal = JournalModel(
            tenant_id=self.tenant_id,
            code=journal_code,
            description=desc,
            total_amount=total_amount,
            reference_id=po_id,
            reference_type="PURCHASE_ORDER"
        )
        self.db.add(journal)
        await self.db.flush()
        
        # Create debit line (Accounts Payable - reduce liability)
        debit_line = JournalLineModel(
            tenant_id=self.tenant_id,
            journal_id=journal.id,
            account_id=debit_account.id,
            debit=total_amount,
            credit=Decimal("0"),
            description=f"Giảm công nợ NCC - {po_code}"
        )
        self.db.add(debit_line)
        
        # Create credit line (Cash/Bank - reduce cash)
        credit_line = JournalLineModel(
            tenant_id=self.tenant_id,
            journal_id=journal.id,
            account_id=credit_account.id,
            debit=Decimal("0"),
            credit=total_amount,
            description=f"Chi tiền thanh toán NCC - {credit_account.name}"
        )
        self.db.add(credit_line)
        
        # Create finance transaction record
        transaction = FinanceTransactionModel(
            tenant_id=self.tenant_id,
            code=journal_code,
            type="PAYMENT",
            category="PROCUREMENT",
            amount=total_amount,
            payment_method=payment_method,
            reference_id=po_id,
            reference_type="PURCHASE_ORDER",
            description=desc,
            transaction_date=datetime.now().date(),
            journal_id=journal.id
        )
        self.db.add(transaction)
        
        # Do NOT commit here - let the caller (procurement router) commit
        await self.db.flush()
        return journal


# Singleton-like function to get service instance
async def get_journal_service(db: AsyncSession) -> JournalService:
    return JournalService(db)
