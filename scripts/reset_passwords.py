"""Script to reset password for user"""
import psycopg2
from passlib.context import CryptContext

# Create password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to database
conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/catering_db")
cur = conn.cursor()

# Check existing users
print("=== Existing Users ===")
cur.execute("SELECT id, email, hashed_password FROM users LIMIT 10")
rows = cur.fetchall()
for r in rows:
    print(f"ID: {r[0]}, Email: {r[1]}, Hash: {r[2][:30] if r[2] else 'None'}...")

# Generate new password hash
new_hash = pwd_context.hash("password")
print(f"\n=== New password hash for 'password': ===")
print(new_hash)

# Update all users with the new password
print("\n=== Updating all user passwords ===")
cur.execute("UPDATE users SET hashed_password = %s", (new_hash,))
conn.commit()
print(f"Updated {cur.rowcount} users")

# Verify update
print("\n=== Verifying password hash ===")
cur.execute("SELECT email, hashed_password FROM users LIMIT 5")
rows = cur.fetchall()
for r in rows:
    is_valid = pwd_context.verify("password", r[1])
    print(f"{r[0]}: valid={is_valid}")

cur.close()
conn.close()
print("\n=== Done ===")
