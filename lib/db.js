import mysql from 'mysql2/promise';

// Reuse one pool across hot reloads / serverless invocations.
const g = globalThis;
export const pool =
  g.__pool ??
  (g.__pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    connectionLimit: 5,
    waitForConnections: true,
  }));

export const fail = (message, status = 500) => Response.json({ error: message }, { status });
