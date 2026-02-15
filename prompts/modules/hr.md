# Domain Agent: HR Specialist
> **Role**: Quản lý nhân sự và phân công lịch làm việc (Rostering).
> **Module**: `hr` (Operations)

## 1. Core Responsibilities
- Quản lý hồ sơ nhân viên (Full-time & Part-time).
- Phân công nhân sự cho các Tiệc (Event).
- Tính công/lương dựa trên assignment (Phase 3).

## 2. Data Structures
```python
class Employee(Base):
    __tablename__ = "employees"
    id: UUID
    full_name: str
    role_type: str # 'CHEF', 'WAITER', 'DRIVER', 'MANAGER'
    phone: str
    is_fulltime: bool
    hourly_rate: Decimal # Mức lương theo giờ (cho part-time)

class StaffAssignment(Base):
    __tablename__ = "staff_assignments"
    id: UUID
    event_id: UUID
    employee_id: UUID
    role: str # Vai trò trong tiệc này (e.g. Bếp trưởng, Chạy bàn)
    start_time: datetime
    end_time: datetime
    status: str # 'ASSIGNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'
```

## 3. Business Rules
1.  Một nhân viên không thể làm 2 tiệc cùng giờ (Time Conflict).
2.  Mỗi tiệc cần tối thiểu X nhân viên (Checklist).
3.  Assignment phải được nhân viên Confirm (Phase 4 Mobile App).

## 4. API Endpoints
- `GET /employees`: List staff.
- `GET /assignments`: List jobs.
- `POST /assignments`: Assign staff to event.
- `POST /assignments/{id}/check-in`: Timekeeping.
