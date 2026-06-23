export type UserRole = 'advisor' | 'manager'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type TaskSource = 'ai_generated' | 'manual'
export type SatisfactionLevel = 'high' | 'medium' | 'low'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface TaskWithRelations {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  source: TaskSource
  dueDate: string | null
  conversationId: string | null
  ghlTaskId: string | null
  notes: string | null
  assignedAt: Date
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  client: {
    id: string
    name: string
    ghlContactId: string
  }
  assignedTo: {
    id: string
    name: string
    email: string
  }
}

export interface ClientWithStats {
  id: string
  name: string
  ghlContactId: string
  createdAt: Date
  updatedAt: Date
  assignedAdvisor: {
    id: string
    name: string
    email: string
  }
  lastReport?: {
    satisfactionLevel: SatisfactionLevel
    satisfactionScore: number
    weekStart: string
    weekEnd: string
  } | null
  activeTasks: number
  overdueTasks: number
}
