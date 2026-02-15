import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_order():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/catering_db')
    async with engine.begin() as conn:
        # Find order by code
        result = await conn.execute(text("""
            SELECT id, code, status, event_date, completed_at
            FROM orders WHERE code = 'DH-2026336135'
        """))
        order = result.fetchone()
        if order:
            print(f'=== ORDER DETAILS ===')
            print(f'ID: {order[0]}')
            print(f'Code: {order[1]}')
            print(f'Status: {order[2]}')
            print(f'Event Date: {order[3]}')
            print(f'Completed At: {order[4]}')
            order_id = order[0]
            
            # Check HR StaffAssignments
            result2 = await conn.execute(text(f"""
                SELECT sa.id, e.full_name, sa.role, sa.status, sa.start_time, sa.end_time
                FROM staff_assignments sa
                LEFT JOIN employees e ON sa.employee_id = e.id
                WHERE sa.event_id = '{order_id}'
            """))
            rows = result2.fetchall()
            print(f'\n=== HR STAFF ASSIGNMENTS ({len(rows)} found) ===')
            for row in rows:
                print(f'{row[1]} | Role: {row[2]} | Status: {row[3]}')
                
            # Check existing timesheets for this order
            result3 = await conn.execute(text(f"""
                SELECT t.id, e.full_name, t.work_date, t.total_hours, t.source, t.status
                FROM timesheets t
                LEFT JOIN employees e ON t.employee_id = e.id
                WHERE t.order_id = '{order_id}'
            """))
            rows3 = result3.fetchall()
            print(f'\n=== EXISTING TIMESHEETS ({len(rows3)} found) ===')
            for row in rows3:
                print(f'{row[1]} | Date: {row[2]} | Hours: {row[3]} | Source: {row[4]} | Status: {row[5]}')
        else:
            print('Order DH-2026336135 not found!')
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_order())
