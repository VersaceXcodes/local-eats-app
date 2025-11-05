import dotenv from "dotenv";
import fs from "fs";
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


async function initDb() {
  const client = await pool.connect();
  try {
    console.log('Reading SQL file...');
    const sql = fs.readFileSync(`./db.sql`, "utf-8");
    
    console.log('Executing SQL commands...');
    await client.query(sql);
    
    console.log('Database initialization completed successfully');
  } catch (e) {
    console.error('Database initialization failed:', e);
    throw e;
  } finally {
    client.release();
  }
}

// Execute initialization
initDb().catch(console.error);
