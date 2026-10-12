import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
let schemaReady: Promise<void> | null = null;

export async function ensurePharmacyInventorySchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      await sql`
        CREATE TABLE IF NOT EXISTS pharmacy_inventory (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          medicine_name TEXT NOT NULL,
          strength TEXT NOT NULL DEFAULT '',
          batch_number TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
          reorder_level INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
          expires_on DATE,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (medicine_name, strength, batch_number)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS pharmacy_inventory_transactions (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          item_id UUID NOT NULL REFERENCES pharmacy_inventory(id),
          actor_email TEXT NOT NULL,
          quantity_change INTEGER NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;
    })();
  }
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}
