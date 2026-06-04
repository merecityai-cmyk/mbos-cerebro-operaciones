// Claude AI output types

export interface ExtractedTask {
  title: string
  description: string
  dueDate: string | null // YYYY-MM-DD o null
  taskType: string
}

export interface ConversationAnalysisResult {
  tasks: ExtractedTask[]
}

export interface SatisfactionAnalysisResult {
  satisfactionLevel: 'high' | 'medium' | 'low'
  satisfactionScore: number // 1-10
  reasoning: string
  conversationSummary: string
  keyTopics: string[]
}
