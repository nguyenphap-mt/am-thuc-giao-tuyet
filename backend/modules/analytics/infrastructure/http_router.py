"""
HTTP Router for Analytics Module - Reports Hub
Cross-module aggregation queries for comprehensive reporting.
Database: PostgreSQL (catering_db)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, extract, case, cast, Float, text
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, CurrentTenant

# Import models from other modules for cross-module queries
from backend.modules.order.domain.models import OrderModel, OrderItemModel
from backend.modules.quote.domain.models import QuoteModel
from backend.modules.inventory.domain.models import InventoryItemModel, InventoryTransactionModel, InventoryLotModel, InventoryStockModel
from backend.modules.procurement.domain.models import PurchaseOrderModel, SupplierModel
from backend.modules.finance.domain.models import JournalModel, JournalLineModel, FinanceTransactionModel
from backend.modules.hr.domain.models import EmployeeModel, TimesheetModel, PayrollItemModel, PayrollPeriodModel
from backend.modules.crm.domain.models import CustomerModel

router = APIRouter(tags=["Analytics & Reports"])

# ============ RESPONSE MODELS ============

class OverviewStats(BaseModel):
    """Cross-module overview KPIs"""
    revenue_month: float = 0
    revenue_prev_month: float = 0
    revenue_trend: float = 0
    expenses_month: float = 0
    expenses_trend: float = 0
    profit_month: float = 0
    profit_margin: float = 0
    orders_month: int = 0
    orders_trend: float = 0
    inventory_value: float = 0
    inventory_warning: int = 0
    receivables_total: float = 0
    receivables_overdue: int = 0
    employees_active: int = 0
    customers_total: int = 0
    new_customers: int = 0

class RevenueByPeriod(BaseModel):
    period: str
    revenue: float = 0
    expenses: float = 0
    profit: float = 0
    orders_count: int = 0

class TopCustomer(BaseModel):
    customer_name: str
    total_revenue: float = 0
    orders_count: int = 0

class TopMenuItem(BaseModel):
    item_name: str
    quantity: int = 0
    revenue: float = 0

class SalesReport(BaseModel):
    revenue_by_period: List[RevenueByPeriod] = []
    top_customers: List[TopCustomer] = []
    top_items: List[TopMenuItem] = []
    avg_order_value: float = 0
    conversion_rate: float = 0
    total_quotes: int = 0
    total_orders: int = 0

class InventoryMovement(BaseModel):
    period: str
    imports_value: float = 0
    exports_value: float = 0
    net_value: float = 0

class TopInventoryItem(BaseModel):
    item_name: str
    quantity_used: float = 0
    unit: str = ""

class ExpiringLot(BaseModel):
    item_name: str
    lot_number: str
    quantity: float = 0
    expiry_date: Optional[date] = None
    days_until_expiry: int = 0

class InventoryReport(BaseModel):
    movements: List[InventoryMovement] = []
    top_consumed: List[TopInventoryItem] = []
    expiring_lots: List[ExpiringLot] = []
    total_value: float = 0
    total_sku: int = 0
    warning_items: int = 0
    out_of_stock: int = 0
    turnover_rate: float = 0

class SupplierSpend(BaseModel):
    supplier_name: str
    total_spend: float = 0
    po_count: int = 0

class POStatusBreakdown(BaseModel):
    status: str
    count: int = 0
    total_value: float = 0

class ProcurementReport(BaseModel):
    total_spend: float = 0
    total_pos: int = 0
    spend_trend: List[RevenueByPeriod] = []
    top_suppliers: List[SupplierSpend] = []
    po_status_breakdown: List[POStatusBreakdown] = []
    avg_po_value: float = 0

class HRSummaryCard(BaseModel):
    label: str
    value: float = 0
    unit: str = ""

class DepartmentHeadcount(BaseModel):
    department: str
    count: int = 0

class HRReport(BaseModel):
    total_employees: int = 0
    active_employees: int = 0
    total_hours_month: float = 0
    total_payroll_month: float = 0
    department_headcount: List[DepartmentHeadcount] = []
    summary_cards: List[HRSummaryCard] = []

# ============ HELPER ============

def calc_trend(current: float, previous: float) -> float:
    """Calculate percentage trend"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)

def get_month_range(offset: int = 0):
    """Get first and last day of month with offset (0=current, -1=previous)"""
    today = date.today()
    first = today.replace(day=1)
    if offset < 0:
        for _ in range(abs(offset)):
            first = (first - timedelta(days=1)).replace(day=1)
    last = (first.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return first, last


# ============ ENDPOINTS ============

@router.get("/overview", response_model=OverviewStats)
async def get_analytics_overview(
    tenant_id: CurrentTenant,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Cross-module overview KPIs for Reports Hub"""
    try:
        # Use provided date range or default to current month
        if from_date and to_date:
            cur_start = from_date
            cur_end = to_date
            # Previous period = same duration shifted backward
            delta = (to_date - from_date).days + 1
            prev_end = from_date - timedelta(days=1)
            prev_start = prev_end - timedelta(days=delta - 1)
        else:
            cur_start, cur_end = get_month_range(0)
            prev_start, prev_end = get_month_range(-1)

        # Revenue: sum of active/completed orders in range
        REVENUE_STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "DELIVERED", "PAID"]
        rev_cur = await db.execute(
            select(func.coalesce(func.sum(OrderModel.final_amount), 0))
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(REVENUE_STATUSES),
                OrderModel.event_date >= cur_start,
                OrderModel.event_date <= cur_end,
            ))
        )
        revenue_month = float(rev_cur.scalar() or 0)

        rev_prev = await db.execute(
            select(func.coalesce(func.sum(OrderModel.final_amount), 0))
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(REVENUE_STATUSES),
                OrderModel.event_date >= prev_start,
                OrderModel.event_date <= prev_end,
            ))
        )
        revenue_prev = float(rev_prev.scalar() or 0)

        # Expenses: use finance transactions (PAYMENT type)
        exp_result = await db.execute(
            select(func.coalesce(func.sum(FinanceTransactionModel.amount), 0))
            .where(and_(
                FinanceTransactionModel.tenant_id == tenant_id,
                FinanceTransactionModel.type == "EXPENSE",
                FinanceTransactionModel.transaction_date >= cur_start,
                FinanceTransactionModel.transaction_date <= cur_end,
            ))
        )
        expenses_month = float(exp_result.scalar() or 0)

        exp_prev_result = await db.execute(
            select(func.coalesce(func.sum(FinanceTransactionModel.amount), 0))
            .where(and_(
                FinanceTransactionModel.tenant_id == tenant_id,
                FinanceTransactionModel.type == "EXPENSE",
                FinanceTransactionModel.transaction_date >= prev_start,
                FinanceTransactionModel.transaction_date <= prev_end,
            ))
        )
        expenses_prev = float(exp_prev_result.scalar() or 0)

        # Orders count
        orders_cur = await db.execute(
            select(func.count(OrderModel.id))
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.created_at >= datetime.combine(cur_start, datetime.min.time()),
                OrderModel.created_at <= datetime.combine(cur_end, datetime.max.time()),
            ))
        )
        orders_month = orders_cur.scalar() or 0

        orders_prev = await db.execute(
            select(func.count(OrderModel.id))
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.created_at >= datetime.combine(prev_start, datetime.min.time()),
                OrderModel.created_at <= datetime.combine(prev_end, datetime.max.time()),
            ))
        )
        orders_prev_count = orders_prev.scalar() or 0

        # Inventory value & warnings (join with stock table for quantities)
        inv_stats = await db.execute(
            select(
                func.coalesce(func.sum(InventoryStockModel.quantity * InventoryItemModel.cost_price), 0),
                func.count(func.distinct(InventoryItemModel.id)),
                func.sum(case(
                    (and_(InventoryStockModel.quantity > 0, InventoryStockModel.quantity <= InventoryItemModel.min_stock), 1),
                    else_=0
                )),
                func.sum(case(
                    (InventoryStockModel.quantity <= 0, 1),
                    else_=0
                )),
            )
            .join(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
            .where(InventoryItemModel.tenant_id == tenant_id)
        )
        inv_row = inv_stats.one()
        inventory_value = float(inv_row[0] or 0)
        total_sku = inv_row[1] or 0
        warning_items = int(inv_row[2] or 0)
        out_of_stock = int(inv_row[3] or 0)

        # Receivables (unpaid orders = balance_amount > 0)
        recv = await db.execute(
            select(
                func.coalesce(func.sum(OrderModel.balance_amount), 0),
                func.count(OrderModel.id),
            )
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.balance_amount > 0,
                OrderModel.status.notin_(["CANCELLED"]),
            ))
        )
        recv_row = recv.one()
        receivables_total = float(recv_row[0] or 0)
        receivables_overdue = recv_row[1] or 0

        # Employees
        emp_count = await db.execute(
            select(func.count(EmployeeModel.id))
            .where(and_(
                EmployeeModel.tenant_id == tenant_id,
                EmployeeModel.is_active == True,
            ))
        )
        active_employees = emp_count.scalar() or 0

        # Customers
        cust_total = await db.execute(
            select(func.count(CustomerModel.id))
            .where(CustomerModel.tenant_id == tenant_id)
        )
        customers_total = cust_total.scalar() or 0

        cust_new = await db.execute(
            select(func.count(CustomerModel.id))
            .where(and_(
                CustomerModel.tenant_id == tenant_id,
                CustomerModel.created_at >= datetime.combine(cur_start, datetime.min.time()),
            ))
        )
        new_customers = cust_new.scalar() or 0

        profit_month = revenue_month - expenses_month
        profit_margin = round((profit_month / revenue_month * 100), 1) if revenue_month > 0 else 0

        return OverviewStats(
            revenue_month=revenue_month,
            revenue_prev_month=revenue_prev,
            revenue_trend=calc_trend(revenue_month, revenue_prev),
            expenses_month=expenses_month,
            expenses_trend=calc_trend(expenses_month, expenses_prev),
            profit_month=profit_month,
            profit_margin=profit_margin,
            orders_month=orders_month,
            orders_trend=calc_trend(float(orders_month), float(orders_prev_count)),
            inventory_value=inventory_value,
            inventory_warning=warning_items,
            receivables_total=receivables_total,
            receivables_overdue=receivables_overdue,
            employees_active=active_employees,
            customers_total=customers_total,
            new_customers=new_customers,
        )
    except Exception as e:
        logger.error(f"Analytics overview error: {e}")
        return OverviewStats()


@router.get("/sales", response_model=SalesReport)
async def get_sales_report(
    tenant_id: CurrentTenant,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    group_by: str = Query("month", pattern="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
):
    """Sales & Revenue reports"""
    try:
        if not from_date:
            from_date = date.today().replace(day=1) - timedelta(days=180)
        if not to_date:
            to_date = date.today()

        # Revenue by period
        if group_by == "day":
            period_expr = func.to_char(OrderModel.event_date, 'DD/MM')
        elif group_by == "week":
            period_expr = func.concat(text("'W'"), extract('week', OrderModel.event_date))
        else:
            period_expr = func.to_char(OrderModel.event_date, 'MM/YYYY')

        rev_query = await db.execute(
            select(
                period_expr.label("period"),
                func.coalesce(func.sum(OrderModel.total_amount), 0).label("revenue"),
                func.count(OrderModel.id).label("orders_count"),
            )
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(["COMPLETED", "DELIVERED", "CONFIRMED"]),
                OrderModel.event_date >= from_date,
                OrderModel.event_date <= to_date,
            ))
            .group_by(period_expr)
            .order_by(period_expr)
        )
        revenue_by_period = [
            RevenueByPeriod(period=str(r.period), revenue=float(r.revenue), orders_count=r.orders_count)
            for r in rev_query.all()
        ]

        # Top customers by revenue
        top_cust_query = await db.execute(
            select(
                OrderModel.customer_name,
                func.coalesce(func.sum(OrderModel.total_amount), 0).label("total_revenue"),
                func.count(OrderModel.id).label("orders_count"),
            )
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(["COMPLETED", "DELIVERED"]),
                OrderModel.event_date >= from_date,
                OrderModel.event_date <= to_date,
            ))
            .group_by(OrderModel.customer_name)
            .order_by(desc("total_revenue"))
            .limit(10)
        )
        top_customers = [
            TopCustomer(customer_name=r.customer_name or "N/A", total_revenue=float(r.total_revenue), orders_count=r.orders_count)
            for r in top_cust_query.all()
        ]

        # Top menu items
        top_items_query = await db.execute(
            select(
                OrderItemModel.item_name,
                func.sum(OrderItemModel.quantity).label("total_qty"),
                func.coalesce(func.sum(OrderItemModel.quantity * OrderItemModel.unit_price), 0).label("total_rev"),
            )
            .join(OrderModel, OrderItemModel.order_id == OrderModel.id)
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(["COMPLETED", "DELIVERED"]),
                OrderModel.event_date >= from_date,
                OrderModel.event_date <= to_date,
            ))
            .group_by(OrderItemModel.item_name)
            .order_by(desc("total_rev"))
            .limit(10)
        )
        top_items = [
            TopMenuItem(item_name=r.item_name or "N/A", quantity=int(r.total_qty or 0), revenue=float(r.total_rev or 0))
            for r in top_items_query.all()
        ]

        # Avg order value
        avg_query = await db.execute(
            select(func.coalesce(func.avg(OrderModel.total_amount), 0))
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(["COMPLETED", "DELIVERED"]),
                OrderModel.event_date >= from_date,
                OrderModel.event_date <= to_date,
            ))
        )
        avg_order_value = float(avg_query.scalar() or 0)

        # Conversion rate: quotes → orders
        quotes_count = await db.execute(
            select(func.count(QuoteModel.id))
            .where(and_(
                QuoteModel.tenant_id == tenant_id,
                QuoteModel.created_at >= datetime.combine(from_date, datetime.min.time()),
            ))
        )
        total_quotes = quotes_count.scalar() or 0

        orders_count = await db.execute(
            select(func.count(OrderModel.id))
            .where(and_(
                OrderModel.tenant_id == tenant_id,
                OrderModel.created_at >= datetime.combine(from_date, datetime.min.time()),
            ))
        )
        total_orders = orders_count.scalar() or 0

        conversion_rate = round((total_orders / total_quotes * 100), 1) if total_quotes > 0 else 0

        return SalesReport(
            revenue_by_period=revenue_by_period,
            top_customers=top_customers,
            top_items=top_items,
            avg_order_value=avg_order_value,
            conversion_rate=conversion_rate,
            total_quotes=total_quotes,
            total_orders=total_orders,
        )
    except Exception as e:
        logger.error(f"Sales report error: {e}")
        return SalesReport()


@router.get("/inventory", response_model=InventoryReport)
async def get_inventory_report(
    tenant_id: CurrentTenant,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Inventory analysis reports"""
    try:
        if not from_date:
            from_date = date.today().replace(day=1) - timedelta(days=90)
        if not to_date:
            to_date = date.today()

        # Inventory stats (join with stock table)
        inv_stats = await db.execute(
            select(
                func.coalesce(func.sum(InventoryStockModel.quantity * InventoryItemModel.cost_price), 0),
                func.count(func.distinct(InventoryItemModel.id)),
                func.sum(case((and_(InventoryStockModel.quantity > 0, InventoryStockModel.quantity <= InventoryItemModel.min_stock), 1), else_=0)),
                func.sum(case((InventoryStockModel.quantity <= 0, 1), else_=0)),
            )
            .join(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
            .where(InventoryItemModel.tenant_id == tenant_id)
        )
        inv_row = inv_stats.one()

        # Stock movements by month
        movements_query = await db.execute(
            select(
                func.to_char(InventoryTransactionModel.created_at, 'MM/YYYY').label("period"),
                func.coalesce(func.sum(case(
                    (InventoryTransactionModel.transaction_type == "IMPORT", InventoryTransactionModel.quantity * InventoryTransactionModel.unit_price),
                    else_=0
                )), 0).label("imports_value"),
                func.coalesce(func.sum(case(
                    (InventoryTransactionModel.transaction_type == "EXPORT", InventoryTransactionModel.quantity * InventoryTransactionModel.unit_price),
                    else_=0
                )), 0).label("exports_value"),
            )
            .where(and_(
                InventoryTransactionModel.tenant_id == tenant_id,
                InventoryTransactionModel.created_at >= datetime.combine(from_date, datetime.min.time()),
                InventoryTransactionModel.created_at <= datetime.combine(to_date, datetime.max.time()),
            ))
            .group_by("period")
            .order_by("period")
        )
        movements = [
            InventoryMovement(
                period=str(r.period),
                imports_value=float(r.imports_value),
                exports_value=float(r.exports_value),
                net_value=float(r.imports_value) - float(r.exports_value),
            )
            for r in movements_query.all()
        ]

        # Top consumed items (by export quantity)
        top_consumed = await db.execute(
            select(
                InventoryItemModel.name,
                func.coalesce(func.sum(InventoryTransactionModel.quantity), 0).label("qty"),
                InventoryItemModel.uom,
            )
            .join(InventoryItemModel, InventoryTransactionModel.item_id == InventoryItemModel.id)
            .where(and_(
                InventoryTransactionModel.tenant_id == tenant_id,
                InventoryTransactionModel.transaction_type == "EXPORT",
                InventoryTransactionModel.created_at >= datetime.combine(from_date, datetime.min.time()),
            ))
            .group_by(InventoryItemModel.name, InventoryItemModel.uom)
            .order_by(desc("qty"))
            .limit(10)
        )
        top_items = [
            TopInventoryItem(item_name=r.name, quantity_used=float(r.qty), unit=r.uom or "")
            for r in top_consumed.all()
        ]

        # Expiring lots (next 30 days)
        expiring = await db.execute(
            select(InventoryLotModel)
            .join(InventoryItemModel, InventoryLotModel.item_id == InventoryItemModel.id)
            .where(and_(
                InventoryLotModel.tenant_id == tenant_id,
                InventoryLotModel.remaining_quantity > 0,
                InventoryLotModel.expiry_date != None,
                InventoryLotModel.expiry_date <= date.today() + timedelta(days=30),
            ))
            .order_by(InventoryLotModel.expiry_date)
            .limit(20)
        )
        expiring_lots = []
        for lot in expiring.scalars().all():
            # Get item name
            item = await db.execute(
                select(InventoryItemModel.name).where(InventoryItemModel.id == lot.item_id)
            )
            item_name = item.scalar() or "N/A"
            days_left = (lot.expiry_date.date() - date.today()).days if lot.expiry_date else 0
            expiring_lots.append(ExpiringLot(
                item_name=item_name,
                lot_number=lot.lot_number or "",
                quantity=float(lot.remaining_quantity),
                expiry_date=lot.expiry_date.date() if lot.expiry_date else None,
                days_until_expiry=max(0, days_left),
            ))

        return InventoryReport(
            movements=movements,
            top_consumed=top_items,
            expiring_lots=expiring_lots,
            total_value=float(inv_row[0] or 0),
            total_sku=inv_row[1] or 0,
            warning_items=int(inv_row[2] or 0),
            out_of_stock=int(inv_row[3] or 0),
        )
    except Exception as e:
        logger.error(f"Inventory report error: {e}")
        return InventoryReport()


@router.get("/procurement", response_model=ProcurementReport)
async def get_procurement_report(
    tenant_id: CurrentTenant,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Procurement analysis reports"""
    try:
        if not from_date:
            from_date = date.today().replace(day=1) - timedelta(days=180)
        if not to_date:
            to_date = date.today()

        # Total spend
        spend = await db.execute(
            select(
                func.coalesce(func.sum(PurchaseOrderModel.total_amount), 0),
                func.count(PurchaseOrderModel.id),
            )
            .where(and_(
                PurchaseOrderModel.tenant_id == tenant_id,
                PurchaseOrderModel.created_at >= datetime.combine(from_date, datetime.min.time()),
                PurchaseOrderModel.created_at <= datetime.combine(to_date, datetime.max.time()),
            ))
        )
        spend_row = spend.one()
        total_spend = float(spend_row[0] or 0)
        total_pos = spend_row[1] or 0

        # Top suppliers
        top_sup = await db.execute(
            select(
                SupplierModel.name,
                func.coalesce(func.sum(PurchaseOrderModel.total_amount), 0).label("total"),
                func.count(PurchaseOrderModel.id).label("cnt"),
            )
            .join(SupplierModel, PurchaseOrderModel.supplier_id == SupplierModel.id)
            .where(and_(
                PurchaseOrderModel.tenant_id == tenant_id,
                PurchaseOrderModel.created_at >= datetime.combine(from_date, datetime.min.time()),
            ))
            .group_by(SupplierModel.name)
            .order_by(desc("total"))
            .limit(10)
        )
        top_suppliers = [
            SupplierSpend(supplier_name=r.name, total_spend=float(r.total), po_count=r.cnt)
            for r in top_sup.all()
        ]

        # PO status breakdown
        po_status = await db.execute(
            select(
                PurchaseOrderModel.status,
                func.count(PurchaseOrderModel.id).label("cnt"),
                func.coalesce(func.sum(PurchaseOrderModel.total_amount), 0).label("total"),
            )
            .where(and_(
                PurchaseOrderModel.tenant_id == tenant_id,
                PurchaseOrderModel.created_at >= datetime.combine(from_date, datetime.min.time()),
            ))
            .group_by(PurchaseOrderModel.status)
        )
        po_breakdown = [
            POStatusBreakdown(status=r.status or "UNKNOWN", count=r.cnt, total_value=float(r.total))
            for r in po_status.all()
        ]

        # Spend by month trend
        spend_trend = await db.execute(
            select(
                func.to_char(PurchaseOrderModel.created_at, 'MM/YYYY').label("period"),
                func.coalesce(func.sum(PurchaseOrderModel.total_amount), 0).label("revenue"),
                func.count(PurchaseOrderModel.id).label("orders_count"),
            )
            .where(and_(
                PurchaseOrderModel.tenant_id == tenant_id,
                PurchaseOrderModel.created_at >= datetime.combine(from_date, datetime.min.time()),
            ))
            .group_by("period")
            .order_by("period")
        )
        spend_periods = [
            RevenueByPeriod(period=str(r.period), revenue=float(r.revenue), orders_count=r.orders_count)
            for r in spend_trend.all()
        ]

        return ProcurementReport(
            total_spend=total_spend,
            total_pos=total_pos,
            spend_trend=spend_periods,
            top_suppliers=top_suppliers,
            po_status_breakdown=po_breakdown,
            avg_po_value=round(total_spend / total_pos, 0) if total_pos > 0 else 0,
        )
    except Exception as e:
        logger.error(f"Procurement report error: {e}")
        return ProcurementReport()


@router.get("/hr", response_model=HRReport)
async def get_hr_report(
    tenant_id: CurrentTenant,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """HR analysis reports"""
    try:
        if not from_date:
            from_date = date.today().replace(day=1)
        if not to_date:
            to_date = date.today()

        # Employee counts
        emp_total = await db.execute(
            select(func.count(EmployeeModel.id))
            .where(EmployeeModel.tenant_id == tenant_id)
        )
        total_employees = emp_total.scalar() or 0

        emp_active = await db.execute(
            select(func.count(EmployeeModel.id))
            .where(and_(
                EmployeeModel.tenant_id == tenant_id,
                EmployeeModel.is_active == True,
            ))
        )
        active_employees = emp_active.scalar() or 0

        # Department/Role headcount
        dept_query = await db.execute(
            select(
                EmployeeModel.role_type,
                func.count(EmployeeModel.id).label("cnt"),
            )
            .where(and_(
                EmployeeModel.tenant_id == tenant_id,
                EmployeeModel.is_active == True,
            ))
            .group_by(EmployeeModel.role_type)
            .order_by(desc("cnt"))
        )
        dept_headcount = [
            DepartmentHeadcount(department=r.role_type or "Không xác định", count=r.cnt)
            for r in dept_query.all()
        ]

        # Total hours this month (from timesheets)
        hours_result = await db.execute(
            select(func.coalesce(func.sum(TimesheetModel.total_hours), 0))
            .where(and_(
                TimesheetModel.tenant_id == tenant_id,
                TimesheetModel.work_date >= from_date,
                TimesheetModel.work_date <= to_date,
            ))
        )
        total_hours = float(hours_result.scalar() or 0)

        # Total payroll (from payroll items)
        payroll_result = await db.execute(
            select(func.coalesce(func.sum(PayrollItemModel.net_salary), 0))
            .where(and_(
                PayrollItemModel.tenant_id == tenant_id,
                PayrollItemModel.created_at >= datetime.combine(from_date, datetime.min.time()),
                PayrollItemModel.created_at <= datetime.combine(to_date, datetime.max.time()),
            ))
        )
        total_payroll = float(payroll_result.scalar() or 0)

        return HRReport(
            total_employees=total_employees,
            active_employees=active_employees,
            total_hours_month=total_hours,
            total_payroll_month=total_payroll,
            department_headcount=dept_headcount,
            summary_cards=[
                HRSummaryCard(label="Tổng nhân viên", value=float(total_employees), unit="người"),
                HRSummaryCard(label="Đang hoạt động", value=float(active_employees), unit="người"),
                HRSummaryCard(label="Giờ làm tháng", value=total_hours, unit="giờ"),
                HRSummaryCard(label="Tổng lương", value=total_payroll, unit="VNĐ"),
            ],
        )
    except Exception as e:
        logger.error(f"HR report error: {e}")
        return HRReport()
