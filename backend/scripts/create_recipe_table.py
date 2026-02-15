# Script to create Recipe table
import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/catering_db')
cur = conn.cursor()

# Create recipes table
cur.execute("""
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    menu_item_id UUID NOT NULL,
    menu_item_name VARCHAR(255) NOT NULL,
    ingredient_id UUID NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity_per_unit DECIMAL(15, 4) NOT NULL DEFAULT 1,
    uom VARCHAR(50) NOT NULL DEFAULT 'kg',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
""")

# Create indexes
cur.execute('CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON recipes(tenant_id);')
cur.execute('CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);')
cur.execute('CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_id);')

conn.commit()
cur.close()
conn.close()
print('Recipes table created successfully!')
