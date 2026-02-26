// Timesheet module shared types

export interface TimesheetResponse {
 id: string;
 tenant_id: string;
 employee_id: string;
 employee_name: string | null;
 employee_role: string | null;
 assignment_id: string | null;
 work_date: string;
 scheduled_start: string | null;
 scheduled_end: string | null;
 actual_start: string | null;
 actual_end: string | null;
 total_hours: number;
 overtime_hours: number;
 status: 'PENDING' | 'APPROVED' | 'REJECTED';
 approved_by: string | null;
 approved_at: string | null;
 source: 'MANUAL' | 'AUTO_ORDER' | 'IMPORT' | null;
 order_id: string | null;
 order_code: string | null;
 customer_name: string | null;
 event_location: string | null;
 notes: string | null;
 created_at: string;
 updated_at: string;
 // Time editing audit fields
 original_start: string | null;
 original_end: string | null;
 time_edited_by: string | null;
 time_edited_at: string | null;
 edit_reason: string | null;
}

export interface UnattendedAssignment {
 assignment_id: string;
 employee_id: string;
 employee_name: string | null;
 employee_role: string | null;
 employee_phone: string | null;
 order_id: string | null;
 order_code: string | null;
 customer_name: string | null;
 event_location: string | null;
 start_time: string | null;
 end_time: string | null;
 assignment_status: string;
 work_date: string | null;
 is_overdue: boolean;
 overdue_days: number;
}

export interface TimesheetSummary {
 employee_id: string;
 employee_name: string;
 total_days: number;
 total_hours: number;
 overtime_hours: number;
 pending_count: number;
 approved_count: number;
}

export interface TimesheetTodayStats {
 date: string;
 total_employees: number;
 checked_in: number;
 not_checked_in: number;
 checked_out: number;
 timesheets: TimesheetResponse[];
}

export type QuickFilter = 'today' | 'week' | 'month' | 'custom';
export type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
