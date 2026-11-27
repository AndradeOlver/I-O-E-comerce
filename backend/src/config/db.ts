import sql from 'mssql';
import { env } from './env.js';

const config: sql.config = {
  server: env.DB_SERVER,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT === 'true',
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  },
  pool: { min: 0, max: 10, idleTimeoutMillis: 30000 },
  connectionTimeout: 10000,
  requestTimeout: 15000
};

let poolPromise: Promise<sql.ConnectionPool> | undefined;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((error: unknown) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

export async function closePool(): Promise<void> {
  const pool = await poolPromise;
  poolPromise = undefined;
  if (pool) await pool.close();
}

export async function withTransaction<T>(work: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(await getPool());
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export { sql };
