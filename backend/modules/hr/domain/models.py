"""
SQLAlchemy ORM Models for HR Module
Database: PostgreSQL (catering_db)
"""

from sqlalchemy import Column, String, ForeignKey, DECIMAL, DateTime, Date, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.core.database import Base


class EmployeeModel(Base):
    """Employee entity - staff members for catering events"""
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Link to User account (for login/auth)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), unique=True, nullable=True)
    
    # Basic info
    full_name = Column(String(100), nullable=False)
    role_type = Column(String(50), default='WAITER')  # CHEF, WAITER, DRIVER
    phone = Column(String(50))
    email = Column(String(100))
    
    # Employment status
    is_fulltime = Column(Boolean, default=False)
    hourly_rate = Column(DECIMAL(15, 2), default=0)
    base_salary = Column(DECIMAL(15, 2), default=0)  # Monthly base salary for fulltime employees
    is_active = Column(Boolean, default=True)
    
    # Per-employee payroll configuration (NULL = use tenant default from PayrollSettingsModel)
    allowance_meal = Column(DECIMAL(12, 2), nullable=True)        # Override meal allowance
    allowance_transport = Column(DECIMAL(12, 2), nullable=True)   # Override transport allowance
    allowance_phone = Column(DECIMAL(12, 2), nullable=True)       # Override phone allowance
    allowance_other = Column(DECIMAL(12, 2), nullable=True)       # Other allowances
    
    # Insurance configuration
    insurance_salary_base = Column(DECIMAL(15, 2), nullable=True) # Base for BHXH calc (NULL = use gross)
    rate_social_override = Column(DECIMAL(5, 4), nullable=True)   # Override BHXH rate (e.g., 0.08 = 8%)
    rate_health_override = Column(DECIMAL(5, 4), nullable=True)   # Override BHYT rate
    rate_unemployment_override = Column(DECIMAL(5, 4), nullable=True)  # Override BHTN rate
    
    # Extended info
    id_number = Column(String(20))  # CCCD/CMND
    date_of_birth = Column(Date)
    address = Column(Text)
    bank_account = Column(String(50))
    bank_name = Column(String(100))
    avatar_url = Column(Text)
    emergency_contact = Column(String(100))
    joined_date = Column(Date, server_default=func.current_date())
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    assignments = relationship("StaffAssignmentModel", back_populates="employee")
    timesheets = relationship("TimesheetModel", back_populates="employee")


class StaffAssignmentModel(Base):
    """Staff assignment to events/orders"""
    __tablename__ = "staff_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    event_id = Column(UUID(as_uuid=True))  # References events/orders
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"))
    
    role = Column(String(50))  # Role in this specific event
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    
    status = Column(String(50), default='ASSIGNED')  # ASSIGNED, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED
    check_in_time = Column(DateTime(timezone=True))
    check_out_time = Column(DateTime(timezone=True))
    
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("EmployeeModel", back_populates="assignments")
    timesheets = relationship("TimesheetModel", back_populates="assignment")


class TimesheetModel(Base):
    """Timesheet for tracking work hours"""
    __tablename__ = "timesheets"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("staff_assignments.id"))
    order_id = Column(UUID(as_uuid=True))  # Link to order for auto-created timesheets
    
    work_date = Column(Date, nullable=False)
    scheduled_start = Column(DateTime(timezone=True))
    scheduled_end = Column(DateTime(timezone=True))
    actual_start = Column(DateTime(timezone=True))  # Check-in time
    actual_end = Column(DateTime(timezone=True))    # Check-out time
    
    total_hours = Column(DECIMAL(5, 2), default=0)
    overtime_hours = Column(DECIMAL(5, 2), default=0)
    
    status = Column(String(20), default='PENDING')  # PENDING, APPROVED, REJECTED
    approved_by = Column(UUID(as_uuid=True))
    approved_at = Column(DateTime(timezone=True))
    
    source = Column(String(20), default='MANUAL')  # MANUAL, AUTO_ORDER, IMPORT
    notes = Column(Text)
    
    # Time editing audit fields
    original_start = Column(DateTime(timezone=True))  # Original check-in before edits
    original_end = Column(DateTime(timezone=True))    # Original check-out before edits
    time_edited_by = Column(UUID(as_uuid=True))       # Who edited the times
    time_edited_at = Column(DateTime(timezone=True))  # When times were edited
    edit_reason = Column(Text)                        # Reason for editing
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("EmployeeModel", back_populates="timesheets")
    assignment = relationship("StaffAssignmentModel", back_populates="timesheets")


class PayrollPeriodModel(Base):
    """Payroll period (monthly)"""
    __tablename__ = "payroll_periods"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    period_name = Column(String(50), nullable=False)  # "01/2026"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default='DRAFT')  # DRAFT, CALCULATED, APPROVED, PAID
    
    calculated_at = Column(DateTime(timezone=True))
    calculated_by = Column(UUID(as_uuid=True))
    approved_by = Column(UUID(as_uuid=True))
    approved_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    
    total_employees = Column(DECIMAL(10, 0), default=0)
    total_gross = Column(DECIMAL(15, 2), default=0)
    total_deductions = Column(DECIMAL(15, 2), default=0)
    total_net = Column(DECIMAL(15, 2), default=0)
    
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    items = relationship("PayrollItemModel", back_populates="period")


class PayrollItemModel(Base):
    """Payroll item for each employee"""
    __tablename__ = "payroll_items"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    period_id = Column(UUID(as_uuid=True), ForeignKey("payroll_periods.id"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    
    # Work hours
    regular_hours = Column(DECIMAL(6, 2), default=0)
    overtime_hours = Column(DECIMAL(6, 2), default=0)
    weekend_hours = Column(DECIMAL(6, 2), default=0)
    holiday_hours = Column(DECIMAL(6, 2), default=0)
    night_hours = Column(DECIMAL(6, 2), default=0)
    # total_hours is GENERATED column in DB - don't include in ORM
    
    # Base salary
    base_salary = Column(DECIMAL(12, 2), default=0)
    hourly_rate = Column(DECIMAL(10, 2), default=0)
    
    # Earnings
    regular_pay = Column(DECIMAL(12, 2), default=0)
    overtime_pay = Column(DECIMAL(12, 2), default=0)
    weekend_pay = Column(DECIMAL(12, 2), default=0)
    holiday_pay = Column(DECIMAL(12, 2), default=0)
    night_pay = Column(DECIMAL(12, 2), default=0)
    
    # Allowances
    allowance_meal = Column(DECIMAL(12, 2), default=0)
    allowance_transport = Column(DECIMAL(12, 2), default=0)
    allowance_phone = Column(DECIMAL(12, 2), default=0)
    allowance_other = Column(DECIMAL(12, 2), default=0)
    bonus = Column(DECIMAL(12, 2), default=0)
    
    # Deductions
    deduction_social_ins = Column(DECIMAL(12, 2), default=0)
    deduction_health_ins = Column(DECIMAL(12, 2), default=0)
    deduction_unemployment = Column(DECIMAL(12, 2), default=0)
    deduction_tax = Column(DECIMAL(12, 2), default=0)
    deduction_advance = Column(DECIMAL(12, 2), default=0)
    deduction_other = Column(DECIMAL(12, 2), default=0)
    
    # Totals - GENERATED columns in PostgreSQL, must be defined in ORM to read
    # FIX 2024-02-04: Added so API can access DB-computed values
    gross_salary = Column(DECIMAL(12, 2), server_default="0")  # DB GENERATED ALWAYS
    total_deductions = Column(DECIMAL(12, 2), server_default="0")  # DB GENERATED ALWAYS
    net_salary = Column(DECIMAL(12, 2), default=0)
    
    status = Column(String(20), default='PENDING')  # PENDING, ADJUSTED, FINALIZED
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    period = relationship("PayrollPeriodModel", back_populates="items")
    employee = relationship("EmployeeModel")



class SalaryAdvanceModel(Base):
    """Salary advance requests"""
    __tablename__ = "salary_advances"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    request_date = Column(Date, nullable=False, server_default=func.current_date())
    reason = Column(Text)
    status = Column(String(20), default='PENDING')  # PENDING, APPROVED, REJECTED, PAID, DEDUCTED
    
    approved_by = Column(UUID(as_uuid=True))
    approved_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    deducted_in_period = Column(UUID(as_uuid=True), ForeignKey("payroll_periods.id"))
    deducted_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("EmployeeModel")


class VietnamHolidayModel(Base):
    """Vietnam public holidays for payroll calculation"""
    __tablename__ = "vietnam_holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    year = Column(DECIMAL(4, 0), nullable=False)
    holiday_date = Column(Date, nullable=False)
    holiday_name = Column(String(100), nullable=False)
    is_lunar = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ PHASE 5: LEAVE MANAGEMENT ============

class LeaveTypeModel(Base):
    """Leave types (Annual, Sick, Personal, etc.)"""
    __tablename__ = "leave_types"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    days_per_year = Column(DECIMAL(5, 1), default=0)
    is_paid = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeaveBalanceModel(Base):
    """Employee leave balance per year"""
    __tablename__ = "leave_balances"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    year = Column(DECIMAL(4, 0), nullable=False)
    entitled_days = Column(DECIMAL(5, 1), default=0)
    used_days = Column(DECIMAL(5, 1), default=0)
    pending_days = Column(DECIMAL(5, 1), default=0)
    carry_over_days = Column(DECIMAL(5, 1), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("EmployeeModel")
    leave_type = relationship("LeaveTypeModel")


class LeaveRequestModel(Base):
    """Leave request from employee"""
    __tablename__ = "leave_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(DECIMAL(5, 1), nullable=False)
    
    reason = Column(Text)
    
    status = Column(String(20), default='PENDING')  # PENDING, APPROVED, REJECTED, CANCELLED
    
    approved_by = Column(UUID(as_uuid=True))
    approved_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("EmployeeModel")
    leave_type = relationship("LeaveTypeModel")


class PayrollSettingsModel(Base):
    """Tenant-level payroll configuration for allowances, insurance, and multipliers"""
    __tablename__ = "payroll_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    
    # Default allowances (monthly, for fulltime employees)
    default_allowance_meal = Column(DECIMAL(12, 2), default=500000)
    default_allowance_transport = Column(DECIMAL(12, 2), default=300000)
    default_allowance_phone = Column(DECIMAL(12, 2), default=200000)
    default_allowance_other = Column(DECIMAL(12, 2), default=0)
    
    # Default base salary
    default_base_salary = Column(DECIMAL(15, 2), default=8000000)
    
    # Insurance rates (as decimal, e.g., 0.08 = 8%)
    rate_social_insurance = Column(DECIMAL(5, 4), default=0.08)    # BHXH: 8%
    rate_health_insurance = Column(DECIMAL(5, 4), default=0.015)   # BHYT: 1.5%
    rate_unemployment = Column(DECIMAL(5, 4), default=0.01)        # BHTN: 1%
    
    # Overtime multipliers (Vietnam Labor Law)
    multiplier_overtime = Column(DECIMAL(4, 2), default=1.50)      # 150%
    multiplier_weekend = Column(DECIMAL(4, 2), default=2.00)       # 200%
    multiplier_holiday = Column(DECIMAL(4, 2), default=3.00)       # 300%
    multiplier_night = Column(DECIMAL(4, 2), default=0.30)         # +30%
    
    # Working hours configuration
    standard_working_days_per_month = Column(Integer, default=26)
    standard_hours_per_day = Column(Integer, default=8)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LeaveApprovalHistoryModel(Base):
    """Audit trail for leave request approval workflow"""
    __tablename__ = "leave_approval_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    leave_request_id = Column(UUID(as_uuid=True), ForeignKey("leave_requests.id", ondelete="CASCADE"), nullable=False)
    
    # Action details
    action = Column(String(20), nullable=False)  # SUBMITTED, APPROVED, REJECTED, CANCELLED
    action_by = Column(UUID(as_uuid=True))  # NULL for system actions
    action_by_name = Column(String(255))  # Denormalized for audit
    action_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Comment/reason
    comment = Column(Text)
    
    # Approval chain tracking
    approval_level = Column(Integer, default=1)  # 1=Team Lead, 2=HR, 3=Final
    
    # Status tracking
    previous_status = Column(String(20))
    new_status = Column(String(20), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    leave_request = relationship("LeaveRequestModel")


class NotificationModel(Base):
    """In-app notifications for users"""
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text)
    type = Column(String(50), nullable=False)  # LEAVE_APPROVED, LEAVE_REJECTED, etc.
    
    # Reference to related entity
    reference_type = Column(String(50))  # leave_request, timesheet, etc.
    reference_id = Column(UUID(as_uuid=True))
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
