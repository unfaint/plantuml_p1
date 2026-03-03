import { pgTable, uuid, text, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core'

export const diagrams = pgTable('diagrams', {
  id:         uuid('id').primaryKey().defaultRandom(),
  user_id:    text('user_id').notNull(),
  title:      text('title').notNull(),
  is_public:  boolean('is_public').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const diagram_versions = pgTable('diagram_versions', {
  id:         uuid('id').primaryKey().defaultRandom(),
  diagram_id: uuid('diagram_id').notNull().references(() => diagrams.id, { onDelete: 'cascade' }),
  version:    integer('version').notNull(),
  source:     text('source').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({ uniq: unique().on(t.diagram_id, t.version) }))
