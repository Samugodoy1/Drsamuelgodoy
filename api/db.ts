import pg from 'pg';

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL;

// Silencing the SSL mode warning by explicitly using verify-full if require is present
if (connectionString && connectionString.includes('sslmode=require')) {
  connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full');
} else if (connectionString && !connectionString.includes('sslmode=')) {
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString += `${separator}sslmode=verify-full`;
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;
