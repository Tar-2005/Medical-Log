import { Pool } from 'pg';

// Initialize a standard PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment below if your Raspberry Pi DB requires SSL:
  // ssl: {
  //   rejectUnauthorized: false
  // }
});

// Handle connection pool errors to prevent Node from crashing
pool.on('error', (err, client) => {
  console.error('Unexpected database error on idle client:', err);
});

// Simple test function to verify connection
export const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database Connected Successfully');
    client.release(); // Always release the client back to the pool
  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
  }
};

export default pool;
