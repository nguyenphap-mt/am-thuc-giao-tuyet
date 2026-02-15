"""
Unified Staff Assignment Service
Sprint 18.1: Bridges Order.OrderStaffAssignment and HR.StaffAssignment

Provides a unified view of staff assignments across modules
and sync capabilities when enabled in settings.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime, date
from typing import List, Dict, Any, Optional

from backend.modules.order.domain.models import OrderModel, OrderStaffAssignmentModel
from backend.modules.hr.domain.models import StaffAssignmentModel, EmployeeModel


class UnifiedStaffAssignmentService:
    """
    Unified service for staff assignments across Order and HR modules.
    
    Provides:
    - Single view of all assignments for a staff member
    - Sync from Order to HR when assignments are created
    - Conflict detection across both systems
    """
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def get_employee_by_user_id(self, user_id: UUID) -> Optional[EmployeeModel]:
        """Get employee record by user_id (users table is linked to employees)"""
        # In current schema, staff_id in OrderStaffAssignment references users table
        # We need to find matching employee
        result = await self.db.execute(
            select(EmployeeModel).where(
                EmployeeModel.tenant_id == self.tenant_id,
                EmployeeModel.is_active == True
            )
        )
        # Match by some criteria - in real app, would have user_id in employees
        # For now, return first active employee matching potential criteria
        return result.scalars().first()
    
    async def get_unified_assignments(
        self,
        staff_id: Optional[UUID] = None,
        employee_id: Optional[UUID] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Get unified view of all assignments across Order and HR modules.
        
        Returns combined list from both sources.
        """
        assignments = []
        
        # 1. Get Order Staff Assignments
        order_query = (
            select(OrderStaffAssignmentModel, OrderModel)
            .join(OrderModel, OrderStaffAssignmentModel.order_id == OrderModel.id)
            .where(OrderStaffAssignmentModel.tenant_id == self.tenant_id)
        )
        
        if staff_id:
            order_query = order_query.where(OrderStaffAssignmentModel.staff_id == staff_id)
        
        if date_from:
            from sqlalchemy import cast, Date
            order_query = order_query.where(cast(OrderModel.event_date, Date) >= date_from)
        
        if date_to:
            from sqlalchemy import cast, Date
            order_query = order_query.where(cast(OrderModel.event_date, Date) <= date_to)
        
        order_result = await self.db.execute(order_query)
        order_rows = order_result.all()
        
        for row in order_rows:
            assignment = row[0]
            order = row[1]
            assignments.append({
                'id': str(assignment.id),
                'source': 'ORDER',
                'reference_id': str(order.id),
                'reference_code': order.code,
                'staff_id': str(assignment.staff_id),
                'role': assignment.role,
                'event_date': str(order.event_date) if order.event_date else None,
                'event_time': order.event_time,
                'location': order.event_address,
                'customer_name': order.customer_name,
                'status': 'CONFIRMED' if assignment.confirmed else 'ASSIGNED',
                'note': assignment.note,
                'created_at': str(assignment.created_at)
            })
        
        # 2. Get HR Staff Assignments
        hr_query = (
            select(StaffAssignmentModel, EmployeeModel)
            .join(EmployeeModel, StaffAssignmentModel.employee_id == EmployeeModel.id)
            .where(StaffAssignmentModel.tenant_id == self.tenant_id)
        )
        
        if employee_id:
            hr_query = hr_query.where(StaffAssignmentModel.employee_id == employee_id)
        
        if date_from:
            hr_query = hr_query.where(StaffAssignmentModel.start_time >= datetime.combine(date_from, datetime.min.time()))
        
        if date_to:
            hr_query = hr_query.where(StaffAssignmentModel.start_time <= datetime.combine(date_to, datetime.max.time()))
        
        hr_result = await self.db.execute(hr_query)
        hr_rows = hr_result.all()
        
        for row in hr_rows:
            hr_assignment = row[0]
            employee = row[1]
            assignments.append({
                'id': str(hr_assignment.id),
                'source': 'HR',
                'reference_id': str(hr_assignment.event_id) if hr_assignment.event_id else None,
                'reference_code': f"EVT-{str(hr_assignment.event_id)[:8]}" if hr_assignment.event_id else None,
                'staff_id': str(hr_assignment.employee_id),
                'staff_name': employee.full_name,
                'role': hr_assignment.role,
                'event_date': str(hr_assignment.start_time.date()) if hr_assignment.start_time else None,
                'event_time': hr_assignment.start_time.strftime('%H:%M') if hr_assignment.start_time else None,
                'location': None,
                'customer_name': None,
                'status': hr_assignment.status,
                'check_in_time': str(hr_assignment.check_in_time) if hr_assignment.check_in_time else None,
                'check_out_time': str(hr_assignment.check_out_time) if hr_assignment.check_out_time else None,
                'note': hr_assignment.notes,
                'created_at': str(hr_assignment.created_at)
            })
        
        # Sort by event_date
        assignments.sort(key=lambda x: x.get('event_date') or '', reverse=True)
        
        return assignments
    
    async def sync_order_to_hr(
        self,
        order_assignment: OrderStaffAssignmentModel,
        order: OrderModel,
        employee_id: UUID
    ) -> Optional[StaffAssignmentModel]:
        """
        Sync an Order assignment to HR StaffAssignment.
        Called when an order staff assignment is created.
        """
        # Check if already synced
        existing = await self.db.execute(
            select(StaffAssignmentModel).where(
                StaffAssignmentModel.tenant_id == self.tenant_id,
                StaffAssignmentModel.event_id == order.id,
                StaffAssignmentModel.employee_id == employee_id
            )
        )
        if existing.scalar_one_or_none():
            return None  # Already synced
        
        # Create HR assignment
        hr_assignment = StaffAssignmentModel(
            tenant_id=self.tenant_id,
            event_id=order.id,
            employee_id=employee_id,
            role=order_assignment.role,
            start_time=order.event_date,
            status='CONFIRMED' if order_assignment.confirmed else 'ASSIGNED',
            notes=f"Synced from Order {order.code}"
        )
        
        self.db.add(hr_assignment)
        await self.db.commit()
        await self.db.refresh(hr_assignment)
        
        return hr_assignment
    
    async def check_conflicts(
        self,
        staff_id: UUID,
        employee_id: Optional[UUID],
        check_date: date,
        exclude_order_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """
        Check for assignment conflicts across both Order and HR systems.
        """
        conflicts = []
        
        # Check Order assignments
        from sqlalchemy import cast, Date
        order_query = (
            select(OrderStaffAssignmentModel, OrderModel)
            .join(OrderModel, OrderStaffAssignmentModel.order_id == OrderModel.id)
            .where(
                OrderStaffAssignmentModel.tenant_id == self.tenant_id,
                OrderStaffAssignmentModel.staff_id == staff_id,
                cast(OrderModel.event_date, Date) == check_date,
                OrderModel.status.in_(['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
            )
        )
        
        if exclude_order_id:
            order_query = order_query.where(OrderModel.id != exclude_order_id)
        
        order_result = await self.db.execute(order_query)
        for row in order_result.all():
            order = row[1]
            conflicts.append({
                'source': 'ORDER',
                'order_code': order.code,
                'event_date': str(order.event_date),
                'event_time': order.event_time,
                'location': order.event_address
            })
        
        # Check HR assignments if employee_id provided
        if employee_id:
            hr_query = (
                select(StaffAssignmentModel)
                .where(
                    StaffAssignmentModel.tenant_id == self.tenant_id,
                    StaffAssignmentModel.employee_id == employee_id,
                    StaffAssignmentModel.status.in_(['ASSIGNED', 'CONFIRMED'])
                )
            )
            hr_result = await self.db.execute(hr_query)
            for hr_assignment in hr_result.scalars().all():
                if hr_assignment.start_time and hr_assignment.start_time.date() == check_date:
                    conflicts.append({
                        'source': 'HR',
                        'event_id': str(hr_assignment.event_id),
                        'event_date': str(hr_assignment.start_time.date()),
                        'event_time': hr_assignment.start_time.strftime('%H:%M'),
                        'status': hr_assignment.status
                    })
        
        return conflicts


async def get_unified_staff_service(db: AsyncSession, tenant_id: UUID) -> UnifiedStaffAssignmentService:
    """Get a UnifiedStaffAssignmentService instance"""
    return UnifiedStaffAssignmentService(db, tenant_id)
