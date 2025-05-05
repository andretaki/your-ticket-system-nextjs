import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';

// Create connection string from environment variables
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tickets_db';

// Create PostgreSQL client with postgres.js
const client = postgres(connectionString);

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export for use in API routes
export default db; 