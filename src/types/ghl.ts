// GoHighLevel API v2 response types

export interface GHLConversation {
  id: string
  contactId: string
  locationId: string
  lastMessageBody: string
  lastMessageDate: string
  type: string
  unreadCount: number
  fullName?: string
  contactName?: string
  email?: string
  phone?: string
}

export interface GHLMessage {
  id: string
  conversationId: string
  body: string
  direction: 'inbound' | 'outbound'
  status: string
  createdAt: string
  dateAdded: string
  type: number
  userId?: string
  contactId?: string
}

export interface GHLTask {
  id: string
  title: string
  body: string
  assignedTo: string
  dueDate: string
  completed: boolean
  contactId: string
}

export interface GHLContact {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  companyName?: string
  locationId: string
}

export interface GHLConversationsResponse {
  conversations: GHLConversation[]
  total: number
}

export interface GHLMessagesResponse {
  messages: {
    messages: GHLMessage[]
    nextPage: boolean
    lastMessageId?: string
  }
}

export interface GHLTaskResponse {
  task: GHLTask
}
