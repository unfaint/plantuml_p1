import { z } from 'zod'
import { eq, desc, max, and, isNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from './init.js'
import { diagrams, diagram_versions } from '../db/schema.js'
import { requireWorkspaceMember, getWorkspaceRole, resolveDiagramPermission } from './workspaceAuth.js'

const STARTER_SOURCE = `@startuml
title My Diagram

actor User
participant "App" as App
participant "Server" as Server

User -> App : action
App -> Server : request
Server --> App : response
App --> User : result
@enduml
`

export const diagramsRouter = router({

  list: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const workspaceId = input?.workspace_id ?? null

      if (workspaceId) {
        await requireWorkspaceMember(ctx.db, workspaceId, ctx.userId)
        return ctx.db
          .select({ id: diagrams.id, title: diagrams.title, is_public: diagrams.is_public, updated_at: diagrams.updated_at, workspace_id: diagrams.workspace_id, user_id: diagrams.user_id })
          .from(diagrams)
          .where(eq(diagrams.workspace_id, workspaceId))
          .orderBy(desc(diagrams.updated_at))
      }

      return ctx.db
        .select({ id: diagrams.id, title: diagrams.title, is_public: diagrams.is_public, updated_at: diagrams.updated_at, workspace_id: diagrams.workspace_id, user_id: diagrams.user_id })
        .from(diagrams)
        .where(and(eq(diagrams.user_id, ctx.userId), isNull(diagrams.workspace_id)))
        .orderBy(desc(diagrams.updated_at))
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [diagram] = await ctx.db
        .select()
        .from(diagrams)
        .where(eq(diagrams.id, input.id))
        .limit(1)

      if (!diagram) throw new TRPCError({ code: 'NOT_FOUND', message: 'Diagram not found' })

      if (!diagram.is_public) {
        if (diagram.workspace_id) {
          const role = ctx.userId ? await getWorkspaceRole(ctx.db, diagram.workspace_id, ctx.userId) : null
          if (!role) throw new TRPCError({ code: 'FORBIDDEN', message: 'This diagram is private' })
        } else {
          if (diagram.user_id !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'This diagram is private' })
        }
      }

      const versions = await ctx.db
        .select()
        .from(diagram_versions)
        .where(eq(diagram_versions.diagram_id, input.id))
        .orderBy(desc(diagram_versions.version))

      return { ...diagram, versions }
    }),

  create: protectedProcedure
    .input(z.object({ workspace_id: z.string().uuid().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input?.workspace_id ?? null
      if (workspaceId) {
        await requireWorkspaceMember(ctx.db, workspaceId, ctx.userId)
      }
      const [diagram] = await ctx.db
        .insert(diagrams)
        .values({ user_id: ctx.userId, workspace_id: workspaceId, title: 'Untitled Diagram' })
        .returning()
      await ctx.db
        .insert(diagram_versions)
        .values({ diagram_id: diagram!.id, version: 1, source: STARTER_SOURCE })
      return diagram!
    }),

  save: protectedProcedure
    .input(z.object({ id: z.string().uuid(), title: z.string().min(1).max(255).optional(), source: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { diagram } = await resolveDiagramPermission(ctx.db, input.id, ctx.userId)

      const updates: Partial<typeof diagrams.$inferInsert> = { updated_at: new Date() }
      if (input.title !== undefined) updates.title = input.title

      const [updated] = await ctx.db
        .update(diagrams)
        .set(updates)
        .where(eq(diagrams.id, input.id))
        .returning()

      if (input.source !== undefined) {
        const [{ maxVersion }] = await ctx.db
          .select({ maxVersion: max(diagram_versions.version) })
          .from(diagram_versions)
          .where(eq(diagram_versions.diagram_id, input.id))
        const nextVersion = (maxVersion ?? 0) + 1
        await ctx.db
          .insert(diagram_versions)
          .values({ diagram_id: input.id, version: nextVersion, source: input.source })
      }

      return { ...updated!, workspace_id: diagram.workspace_id }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { effectiveRole } = await resolveDiagramPermission(ctx.db, input.id, ctx.userId)
      if (effectiveRole === 'member') throw new TRPCError({ code: 'FORBIDDEN', message: 'Members cannot delete diagrams' })
      await ctx.db.delete(diagrams).where(eq(diagrams.id, input.id))
      return { success: true }
    }),

  togglePublic: protectedProcedure
    .input(z.object({ id: z.string().uuid(), is_public: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { effectiveRole } = await resolveDiagramPermission(ctx.db, input.id, ctx.userId)
      if (effectiveRole === 'member') throw new TRPCError({ code: 'FORBIDDEN', message: 'Members cannot change visibility' })
      const [diagram] = await ctx.db
        .update(diagrams)
        .set({ is_public: input.is_public, updated_at: new Date() })
        .where(eq(diagrams.id, input.id))
        .returning()
      return diagram!
    }),
})
