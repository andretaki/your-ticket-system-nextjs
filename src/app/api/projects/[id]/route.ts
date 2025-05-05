import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

// DELETE /api/projects/[id]
export async function DELETE(
  request: Request, // request object is still passed even if not used directly
  { params }: { params: { id: string } }
) {
   try {
    const projectId = parseInt(params.id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // TODO: Consider what should happen to tickets associated with this project
    // If project_id in tickets is SET NULL ON DELETE (as scripted), deleting the project orphans tickets.
    // If you want to prevent deletion if tickets exist, you'd check first:
    // const associatedTickets = await db.query.tickets.findFirst({ where: eq(tickets.projectId, projectId), columns: { id: true } });
    // if (associatedTickets) {
    //   return NextResponse.json({ error: 'Cannot delete project with associated tickets' }, { status: 409 }); // Conflict
    // }

    const [deletedProject] = await db
        .delete(projects)
        .where(eq(projects.id, projectId))
        .returning({ deletedId: projects.id }); // Check if anything was deleted

    if (!deletedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted.' });
  } catch (error) {
    console.error(`Error deleting project ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

// Optional: Add GET by ID and PUT/PATCH for updates if needed later
// export async function GET(...) { ... }
// export async function PUT(...) { ... } 