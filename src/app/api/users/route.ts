import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

// GET /api/users - Fetches all users (for dropdowns, etc.)
export async function GET() {
  try {
    const allUsers = await db.query.users.findMany({
      where: eq(users.isExternal, false), // Only return internal users (employees)
      columns: {
        // Select only the necessary columns to avoid sending sensitive data
        id: true,
        name: true,
        email: true,
        role: true, // Include role if useful for display or filtering later
      },
      orderBy: (users, { asc }) => [asc(users.name)], // Order alphabetically by name
    });

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('API Error [GET /api/users]:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// Optional: Add POST for creating users later if needed via API
// export async function POST(request: Request) { ... } 