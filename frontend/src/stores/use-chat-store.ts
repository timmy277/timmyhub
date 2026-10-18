import { create } from 'zustand'
import type { ConversationDto } from '@timmyhub/contracts'

interface ChatStoreState {
    // Header dropdown popover open state
    isDropdownOpen: boolean
    setDropdownOpen: (open: boolean) => void
    toggleDropdown: () => void

    // Floating chat boxes dock at bottom-right
    openConversations: ConversationDto[]
    minimizedIds: string[]
    activeConversationId: string | null

    // Realtime Online Presence: userId -> { isOnline: boolean; lastSeenAt?: string }
    onlineUsers: Record<string, { isOnline: boolean; lastSeenAt?: string }>

    // Actions
    openChat: (conversation: ConversationDto) => void
    closeChat: (conversationId: string) => void
    minimizeChat: (conversationId: string) => void
    restoreChat: (conversationId: string) => void
    toggleMinimize: (conversationId: string) => void
    closeAllChats: () => void
    setActiveConversationId: (id: string | null) => void
    isChatOpenAndActive: (conversationId: string) => boolean
    setUserPresence: (userId: string, isOnline: boolean, lastSeenAt?: string) => void
    setPresenceState: (state: Record<string, { isOnline: boolean; lastSeenAt?: string }>) => void
    isUserOnline: (userId?: string | null) => boolean
    getUserLastSeen: (userId?: string | null) => string | undefined
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
    isDropdownOpen: false,
    setDropdownOpen: (open) => set({ isDropdownOpen: open }),
    toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),

    openConversations: [],
    minimizedIds: [],
    activeConversationId: null,

    openChat: (conversation) =>
        set((state) => {
            const exists = state.openConversations.some((c) => c.id === conversation.id)
            const newMinimized = state.minimizedIds.filter((id) => id !== conversation.id)

            if (exists) {
                // Đã mở: chỉ cần bỏ minimize và đưa lên đầu
                const reordered = [conversation, ...state.openConversations.filter((c) => c.id !== conversation.id)]
                return {
                    openConversations: reordered,
                    minimizedIds: newMinimized,
                    isDropdownOpen: false,
                    activeConversationId: conversation.id,
                }
            }

            // Nếu chưa mở: thêm vào danh sách, tối đa 3 khung chat cùng lúc (như Facebook)
            const updated = [conversation, ...state.openConversations].slice(0, 3)
            return {
                openConversations: updated,
                minimizedIds: newMinimized,
                isDropdownOpen: false,
                activeConversationId: conversation.id,
            }
        }),

    closeChat: (conversationId) =>
        set((state) => ({
            openConversations: state.openConversations.filter((c) => c.id !== conversationId),
            minimizedIds: state.minimizedIds.filter((id) => id !== conversationId),
            activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        })),

    minimizeChat: (conversationId) =>
        set((state) => ({
            minimizedIds: state.minimizedIds.includes(conversationId)
                ? state.minimizedIds
                : [...state.minimizedIds, conversationId],
            activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        })),

    restoreChat: (conversationId) =>
        set((state) => ({
            minimizedIds: state.minimizedIds.filter((id) => id !== conversationId),
            activeConversationId: conversationId,
        })),

    toggleMinimize: (conversationId) =>
        set((state) => {
            const isCurrentlyMinimized = state.minimizedIds.includes(conversationId)
            const newMinimized = isCurrentlyMinimized
                ? state.minimizedIds.filter((id) => id !== conversationId)
                : [...state.minimizedIds, conversationId]
            return {
                minimizedIds: newMinimized,
                activeConversationId: isCurrentlyMinimized ? conversationId : null,
            }
        }),

    onlineUsers: {},

    closeAllChats: () => set({ openConversations: [], minimizedIds: [], activeConversationId: null }),

    setActiveConversationId: (id) => set({ activeConversationId: id }),

    isChatOpenAndActive: (conversationId) => {
        const state = get()
        // Kiểm tra nếu là active id (ví dụ đang ở trang /seller/chat hoặc đang click vào chat box)
        if (state.activeConversationId === conversationId) return true

        // Hoặc kiểm tra xem có đang mở floating chat box không bị minimize không
        const isFloatingOpen = state.openConversations.some(
            (c) => c.id === conversationId && !state.minimizedIds.includes(conversationId),
        )
        return isFloatingOpen
    },

    setUserPresence: (userId, isOnline, lastSeenAt) =>
        set((state) => ({
            onlineUsers: {
                ...state.onlineUsers,
                [userId]: { isOnline, lastSeenAt },
            },
        })),

    setPresenceState: (newState) =>
        set((state) => ({
            onlineUsers: {
                ...state.onlineUsers,
                ...newState,
            },
        })),

    isUserOnline: (userId) => {
        if (!userId) return false
        return Boolean(get().onlineUsers[userId]?.isOnline)
    },

    getUserLastSeen: (userId) => {
        if (!userId) return undefined
        return get().onlineUsers[userId]?.lastSeenAt
    },
}))
