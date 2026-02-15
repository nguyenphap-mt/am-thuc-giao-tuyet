# Seed HR employees data
import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
cur = conn.cursor()

# Use existing tenant ID
TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

# Bypass RLS for seeding
cur.execute(f"SET app.current_tenant = '{TENANT_ID}'")

# Check if employees exist
cur.execute("SELECT COUNT(*) FROM employees WHERE tenant_id = %s::uuid", (TENANT_ID,))
count = cur.fetchone()[0]

if count == 0:
    # Seed sample employees
    employees = [
        ('Nguyen Van Bep', 'CHEF', '0912345678', True, 0),
        ('Tran Thi Phuc Vu', 'WAITER', '0912345679', False, 50000),
        ('Le Van Tai', 'DRIVER', '0912345680', True, 0),
        ('Pham Thi Hoa', 'CHEF', '0912345681', True, 0),
        ('Hoang Minh Duc', 'WAITER', '0912345682', False, 45000),
    ]
    
    for name, role, phone, fulltime, rate in employees:
        cur.execute(f'''
            INSERT INTO employees (tenant_id, full_name, role_type, phone, is_fulltime, hourly_rate)
            VALUES ('{TENANT_ID}'::uuid, %s, %s, %s, %s, %s)
        ''', (name, role, phone, fulltime, rate))
    
    conn.commit()
    print(f'Seeded {len(employees)} employees')
else:
    print(f'Found {count} existing employees, skipping seed')

conn.close()
