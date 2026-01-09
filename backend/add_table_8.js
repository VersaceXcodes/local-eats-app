import dotenv from "dotenv";
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST || "ep-ancient-dream-abbsot9k-pooler.eu-west-2.aws.neon.tech",
        database: PGDATABASE || "neondb",
        user: PGUSER || "neondb_owner",
        password: PGPASSWORD || "npg_jAS3aITLC5DX",
        port: Number(PGPORT),
        ssl: { require: true },
      }
);

async function createTable() {
  const client = await pool.connect();
  try {
    console.log('Creating table test_sync_table8...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_sync_table8 (
        id SERIAL PRIMARY KEY,
        test_data TEXT
      );
    `);
    console.log('Table test_sync_table8 created successfully.');
    
    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'test_sync_table8';
      `);
      console.log('Columns:', res.rows);

  } catch (e) {
    console.error('Failed to create table:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createTable();
