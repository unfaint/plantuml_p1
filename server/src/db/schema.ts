import { pgTable, uuid, text, boolean, timestamp, integer, unique, pgEnum } from 'drizzle-orm/pg-core'

export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member'])

export const workspaces = pgTable('workspaces', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       text('name').notNull(),
  owner_id:   text('owner_id').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workspace_members = pgTable('workspace_members', {
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  user_id:      text('user_id').notNull(),
  role:         workspaceRoleEnum('role').notNull().default('member'),
  joined_at:    timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  pk: { primaryKey: [t.workspace_id, t.user_id] },
}))

export const workspace_invites = pgTable('workspace_invites', {
  id:           uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  invited_by:   text('invited_by').notNull(),
  email:        text('email').notNull(),
  role:         workspaceRoleEnum('role').notNull().default('member'),
  token:        uuid('token').notNull().unique().defaultRandom(),
  used:         boolean('used').notNull().default(false),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const diagrams = pgTable('diagrams', {
  id:           uuid('id').primaryKey().defaultRandom(),
  user_id:      text('user_id').notNull(),
  workspace_id: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  title:        text('title').notNull(),
  is_public:    boolean('is_public').notNull().default(false),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const diagram_versions = pgTable('diagram_versions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  diagram_id: uuid('diagram_id').notNull().references(() => diagrams.id, { onDelete: 'cascade' }),
  version:    integer('version').notNull(),
  source:     text('source').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({ uniq: unique().on(t.diagram_id, t.version) }))
