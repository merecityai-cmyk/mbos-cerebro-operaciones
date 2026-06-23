import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  date,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['advisor', 'manager'])
export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'overdue',
])
export const taskSourceEnum = pgEnum('task_source', ['ai_generated', 'manual'])
export const satisfactionEnum = pgEnum('satisfaction_level', [
  'high',
  'medium',
  'low',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('advisor'),
  ghlUserId: varchar('ghl_user_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ghlContactId: varchar('ghl_contact_id', { length: 100 }).notNull().unique(),
  assignedAdvisorId: uuid('assigned_advisor_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const taskRoutingRules = pgTable('task_routing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyword: varchar('keyword', { length: 100 }).notNull(),
  assignedToId: uuid('assigned_to_id')
    .notNull()
    .references(() => users.id),
  priority: integer('priority').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  assignedToId: uuid('assigned_to_id')
    .notNull()
    .references(() => users.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  source: taskSourceEnum('source').notNull().default('ai_generated'),
  conversationId: varchar('conversation_id', { length: 100 }),
  ghlTaskId: varchar('ghl_task_id', { length: 100 }),
  dueDate: date('due_date'),
  notes: text('notes'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const taskAuditLog = pgTable('task_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  field: varchar('field', { length: 50 }).notNull(), // 'status' | 'assignedTo'
  oldValue: varchar('old_value', { length: 255 }),
  newValue: varchar('new_value', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const conversationSnapshots = pgTable('conversation_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  ghlConversationId: varchar('ghl_conversation_id', { length: 100 })
    .notNull()
    .unique(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  lastProcessedAt: timestamp('last_processed_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastMessageId: varchar('last_message_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const weeklyReports = pgTable('weekly_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  weekStart: date('week_start').notNull(),
  weekEnd: date('week_end').notNull(),
  satisfactionLevel: satisfactionEnum('satisfaction_level').notNull(),
  satisfactionScore: integer('satisfaction_score').notNull(),
  satisfactionReasoning: text('satisfaction_reasoning').notNull(),
  tasksTotal: integer('tasks_total').notNull().default(0),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  tasksOverdue: integer('tasks_overdue').notNull().default(0),
  tasksPending: integer('tasks_pending').notNull().default(0),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  conversationSummary: text('conversation_summary').notNull(),
  keyTopics: jsonb('key_topics').$type<string[]>().default([]),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskRoutingRule = typeof taskRoutingRules.$inferSelect
export type WeeklyReport = typeof weeklyReports.$inferSelect
export type ConversationSnapshot = typeof conversationSnapshots.$inferSelect
export type TaskAuditLog = typeof taskAuditLog.$inferSelect
