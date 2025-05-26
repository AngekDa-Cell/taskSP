// filepath: src/lib/pgPool.ts
import { Pool } from 'pg';

let pool: Pool;

function getPgPool() {
  if (!pool) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL environment variable is not set.');
    }
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Descomenta y ajusta para producción si es necesario
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

export default getPgPool;