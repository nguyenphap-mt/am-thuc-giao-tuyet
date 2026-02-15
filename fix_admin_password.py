"""Script to fix admin password hash in database"""
from sqlalchemy import create_engine, text
from backend.core.auth.security import get_password_hash

# Generate new bcrypt hash for admin123
engine = create_engine('postgresql://postgres:postgres@localhost:5432/catering_db')
new_hash = get_password_hash('admin123')
print('New hash:', new_hash)

with engine.begin() as conn:
    result = conn.execute(
        text("UPDATE users SET hashed_password = :hash WHERE email = 'admin@catering.com'"),
        {'hash': new_hash}
    )
    print('Rows updated:', result.rowcount)
    
    # Verify the update
    check = conn.execute(text("SELECT email, hashed_password FROM users WHERE email = 'admin@catering.com'"))
    for row in check:
        print(f"User: {row[0]}, Hash starts with: {row[1][:20]}...")

print('Password update complete!')
