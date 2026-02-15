import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%%menu%%' OR table_name LIKE '%%set%%' OR table_name='categories' OR table_name='recipes')")
print([r[0] for r in cur.fetchall()])
conn.close()
