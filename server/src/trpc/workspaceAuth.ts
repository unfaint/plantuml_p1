import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import type { DB } from '../db/client.js'
import { workspace_members, diagrams } from '../db/schema.js'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

/** Returns the caller's role, or throws FORBIDDEN if not a member. */
export async function requireWorkspaceMember(db: DB, workspaceId: string, userId: string): Promise<WorkspaceRole> {
  const [row] = await db
    .select({ role: workspace_members.role })
    .from(workspace_members)
    .where(and(eq(workspace_members.workspace_id, workspaceId), eq(workspace_members.user_id, userId)))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' })
  return row.role
}

/** Returns the caller's role, or null if not a member (never throws). */
export async function getWorkspaceRole(db: DB, workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const [row] = await db
    .select({ role: workspace_members.role })
    .from(workspace_members)
    .where(and(eq(workspace_members.workspace_id, workspaceId), eq(workspace_members.user_id, userId)))
    .limit(1)
  return row?.role ?? null
}

export type EffectiveRole = 'personal-owner' | WorkspaceRole

/**
 * Resolves who the caller is relative to a diagram and returns the diagram + their effective role.
 * Throws NOT_FOUND or FORBIDDEN if unauthorized.
 */
export async function resolveDiagramPermission(
  db: DB,
  diagramId: string,
  userId: string,
): Promise<{ diagram: typeof diagrams.$inferSelect; effectiveRole: EffectiveRole }> {
  const [diagram] = await db
    .select()
    .from(diagrams)
    .where(eq(diagrams.id, diagramId))
    .limit(1)

  if (!diagram) throw new TRPCError({ code: 'NOT_FOUND' })

  if (!diagram.workspace_id) {
    if (diagram.user_id !== userId) throw new TRPCError({ code: 'FORBIDDEN' })
    return { diagram, effectiveRole: 'personal-owner' }
  }

  const role = await getWorkspaceRole(db, diagram.workspace_id, userId)
  if (!role) throw new TRPCError({ code: 'FORBIDDEN' })
  return { diagram, effectiveRole: role }
}
