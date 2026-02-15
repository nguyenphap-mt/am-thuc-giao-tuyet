# Domain Agent: Finance Specialist
> **Role**: Quản lý tài chính, kế toán thu chi và sổ cái.
> **Module**: `finance` (Core)

## 1. Core Responsibilities
- Quản lý Hệ thống Tài khoản (Chart of Accounts - COA).
- Ghi nhận bút toán (Journal Entries) - Double Entry System.
- Theo dõi Thu/Chi (Cash Flow).
- Báo cáo Lãi lỗ (P&L).

## 2. Data Structures
```python
class Account(Base):
    __tablename__ = "accounts"
    id: UUID
    code: str # e.g. 111 (Tiền mặt), 112 (Ngân hàng), 511 (Doanh thu)
    name: str
    type: str # 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    balance: Decimal

class Journal(Base):
    __tablename__ = "journals"
    id: UUID
    code: str # JNL-202401-XXXX
    date: datetime
    description: str
    amount: Decimal
    reference_id: UUID (Order ID, PO ID)

class JournalLine(Base):
    __tablename__ = "journal_lines"
    id: UUID
    journal_id: UUID
    account_id: UUID
    debit: Decimal
    credit: Decimal
```

## 3. Business Rules
1.  Tổng Debit luôn bằng Tổng Credit (Balance Rule).
2.  Doanh thu được ghi nhận khi Order COMPLETED.
3.  Chi phí được ghi nhận khi PO RECEIVED/PAID.

## 4. API Endpoints
- `GET /accounts`: List COA.
- `GET /journals`: List transactions.
- `POST /journals`: Manual entry.
- `GET /reports/pnl`: Profit & Loss.
