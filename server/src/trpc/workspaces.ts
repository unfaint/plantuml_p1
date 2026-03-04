import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from './init.js'
import { workspaces, workspace_members, workspace_invites } from '../db/schema.js'
import { requireWorkspaceMember, getWorkspaceRole } from './workspaceAuth.js'

export const workspacesRouter = router({

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id:         workspaces.id,
        name:       workspaces.name,
        owner_id:   workspaces.owner_id,
        created_at: workspaces.created_at,
        role:       workspace_members.role,
      })
      .from(workspace_members)
      .innerJoin(workspaces, eq(workspace_members.workspace_id, workspaces.id))
      .where(eq(workspace_members.user_id, ctx.userId))
      .orderBy(desc(workspaces.created_at))
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80).trim() }))
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .insert(workspaces)
        .values({ name: input.name, owner_id: ctx.userId })
        .returning()
      await ctx.db
        .insert(workspace_members)
        .values({ workspace_id: workspace!.id, user_id: ctx.userId, role: 'owner' })
      return workspace!
    }),

  rename: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid(), name: z.string().min(1).max(80).trim() }))
    .mutation(async ({ ctx, input }) => {
      const role = await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      if (role !== 'owner') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners can rename' })
      const [ws] = await ctx.db
        .update(workspaces)
        .set({ name: input.name })
        .where(eq(workspaces.id, input.workspace_id))
        .returning()
      return ws!
    }),

  delete: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const role = await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      if (role !== 'owner') throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners can delete' })
      await ctx.db.delete(workspaces).where(eq(workspaces.id, input.workspace_id))
      return { success: true }
    }),

  leave: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const role = await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      if (role === 'owner') throw new TRPCError({ code: 'FORBIDDEN', message: 'Transfer ownership before leaving' })
      await ctx.db.delete(workspace_members).where(
        and(eq(workspace_members.workspace_id, input.workspace_id), eq(workspace_members.user_id, ctx.userId))
      )
      return { success: true }
    }),

  listMembers: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      return ctx.db
        .select({ user_id: workspace_members.user_id, role: workspace_members.role, joined_at: workspace_members.joined_at })
        .from(workspace_members)
        .where(eq(workspace_members.workspace_id, input.workspace_id))
    }),

  invite: protectedProcedure
    .input(z.object({
      workspace_id: z.string().uuid(),
      email:        z.string().email(),
      role:         z.enum(['admin', 'member']).default('member'),
    }))
    .mutation(async ({ ctx, input }) => {
      const callerRole = await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      if (callerRole !== 'owner' && callerRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners and admins can invite' })
      }
      const [invite] = await ctx.db
        .insert(workspace_invites)
        .values({ workspace_id: input.workspace_id, invited_by: ctx.userId, email: input.email.toLowerCase(), role: input.role })
        .returning()
      return { token: invite!.token }
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [invite] = await ctx.db
        .select()
        .from(workspace_invites)
        .where(and(eq(workspace_invites.token, input.token), eq(workspace_invites.used, false)))
        .limit(1)
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found or already used' })
      if (Date.now() - invite.created_at.getTime() > 7 * 24 * 60 * 60 * 1000) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite expired' })
      }
      await ctx.db
        .insert(workspace_members)
        .values({ workspace_id: invite.workspace_id, user_id: ctx.userId, role: invite.role })
        .onConflictDoNothing()
      await ctx.db
        .update(workspace_invites)
        .set({ used: true })
        .where(eq(workspace_invites.token, input.token))
      return { workspace_id: invite.workspace_id }
    }),

  removeMember: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid(), target_user_id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const callerRole = await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      if (callerRole !== 'owner' && callerRole !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
      const targetRole = await getWorkspaceRole(ctx.db, input.workspace_id, input.target_user_id)
      if (targetRole === 'owner') throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot remove the workspace owner' })
      if (callerRole === 'admin' && targetRole === 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admins cannot remove other admins' })
      await ctx.db.delete(workspace_members).where(
        and(eq(workspace_members.workspace_id, input.workspace_id), eq(workspace_members.user_id, input.target_user_id))
      )
      return { success: true }
    }),

  updateRole: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid(), target_user_id: z.string(), role: z.enum(['admin', 'member']) }))
    .mutation(async ({ ctx, input }) => {
      const callerRole = await requireWorkspaceMember(ctx.db, input.workspace_id, ctx.userId)
      if (callerRole !== 'owner' && !(callerRole === 'admin' && input.role === 'member')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners can promote to admin' })
      }
      const targetRole = await getWorkspaceRole(ctx.db, input.workspace_id, input.target_user_id)
      if (targetRole === 'owner') throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot change owner role' })
      await ctx.db
        .update(workspace_members)
        .set({ role: input.role })
        .where(and(eq(workspace_members.workspace_id, input.workspace_id), eq(workspace_members.user_id, input.target_user_id)))
      return { success: true }
    }),
})
