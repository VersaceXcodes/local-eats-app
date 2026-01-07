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

async function checkTable() {
  const client = await pool.connect();
  try {
    console.log('Checking table test_sync_table4...');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'test_sync_table4';
    `);
    
    if (res.rows.length > 0) {
      console.log('Table test_sync_table4 exists.');
      
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'test_sync_table4';
      `);
      console.log('Columns:', columns.rows);
    } else {
      console.log('Table test_sync_table4 does not exist.');
    }
  } catch (e) {
    console.error('Failed to check table:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
