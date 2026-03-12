import pg from 'pg';

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  } else {
    console.warn('Warning: DATABASE_URL is not defined. Database connection will fail.');
  }
}

// Silencing the SSL mode warning by explicitly using verify-full if require is present
if (connectionString && connectionString.includes('sslmode=require')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=no-verify');
} else if (connectionString && !connectionString.includes('sslmode=')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString += `${separator}sslmode=no-verify`;
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Limit connections for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const query = async (text: string, params?: any[]) => {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      lastError = err;
      // 40P01 is the Postgres error code for deadlock_detected
      if (err.code === '40P01') {
        console.warn(`Deadlock detected, retrying (${i + 1}/${maxRetries})...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export default pool;
