# Seed users data for testing
import psycopg2
from passlib.context import CryptContext
import uuid

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
cur = conn.cursor()

# Use existing tenant ID (same as seed_hr.py)  
TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bypass RLS for seeding
cur.execute(f"SET app.current_tenant = '{TENANT_ID}'")

# Check if users exist
cur.execute("SELECT COUNT(*) FROM users WHERE tenant_id = %s::uuid", (TENANT_ID,))
count = cur.fetchone()[0]

if count == 0:
    # Seed sample users
    users = [
        ('admin@catering.com', 'Admin User', 'super_admin', 'Admin@123', '0901234567'),
        ('admin@amthucgiatuyet.vn', 'Admin ATGT', 'super_admin', 'Admin@123', '0901234568'),
        ('manager@catering.com', 'Manager User', 'manager', 'Manager@123', '0901234569'),
        ('staff@catering.com', 'Staff User', 'staff', 'Staff@123', '0901234570'),
    ]
    
    for email, full_name, role, password, phone in users:
        hashed_password = pwd_context.hash(password)
        user_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, is_active, phone_number, status)
            VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s)
        ''', (user_id, TENANT_ID, email, hashed_password, full_name, role, True, phone, 'ACTIVE'))
    
    conn.commit()
    print(f'Seeded {len(users)} users')
    print('Admin credentials:')
    print('  Email: admin@catering.com')
    print('  Password: Admin@123')
else:
    print(f'Found {count} existing users, skipping seed')
    cur.execute("SELECT email, full_name, role FROM users WHERE tenant_id = %s::uuid", (TENANT_ID,))
    for row in cur.fetchall():
        print(f'  - {row[0]} ({row[1]}) - {row[2]}')

conn.close()
