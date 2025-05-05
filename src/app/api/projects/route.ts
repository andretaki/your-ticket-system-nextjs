import { NextResponse } from 'next/server';
import { db } from '@/db'; // Adjust path if needed
import { projects } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';

// GET /api/projects - Fetches all projects
export async function GET() {
  try {
    const allProjects = await db.query.projects.findMany({
      orderBy: (projects, { asc }) => [asc(projects.name)], // Order alphabetically
    });
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Creates a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body; // Include description if added

    if (!name || typeof name !== 'string' || name.trim() === '') {
       return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Optional: Check if project name already exists
    const existing = await db.query.projects.findFirst({ where: eq(projects.name, name.trim()) });
    if (existing) {
        return NextResponse.json({ error: 'Project name already exists' }, { status: 409 }); // Conflict
    }

    const newProjectData = {
      name: name.trim(),
      description: description || null, // Handle optional description
    };

    const [insertedProject] = await db.insert(projects).values(newProjectData).returning();

    return NextResponse.json({ message: 'Project successfully created!', project: insertedProject }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating project:', error);
     // Check for unique constraint violation specifically
    if (error.code === '23505') { // PostgreSQL unique violation code
         return NextResponse.json({ error: 'Project name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
} 