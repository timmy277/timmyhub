export const CHAT_ROUTE = {
    ROOT: 'v1/chat',
    CONVERSATIONS: 'conversations',
    CONVERSATION_DETAIL: 'conversations/:id',
    MESSAGES: 'conversations/:id/messages',
    READ: 'conversations/:id/read',
    SEND: 'messages',
} as const

export const CHAT_EVENT = {
    MESSAGE_SENT: 'chat.message_sent',
    CONVERSATION_READ: 'chat.conversation_read',
} as const
