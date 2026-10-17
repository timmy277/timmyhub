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

    // Actions
    openChat: (conversation: ConversationDto) => void
    closeChat: (conversationId: string) => void
    minimizeChat: (conversationId: string) => void
    restoreChat: (conversationId: string) => void
    toggleMinimize: (conversationId: string) => void
    closeAllChats: () => void
}

export const useChatStore = create<ChatStoreState>((set) => ({
    isDropdownOpen: false,
    setDropdownOpen: (open) => set({ isDropdownOpen: open }),
    toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),

    openConversations: [],
    minimizedIds: [],

    openChat: (conversation) =>
        set((state) => {
            const exists = state.openConversations.some((c) => c.id === conversation.id)
            const newMinimized = state.minimizedIds.filter((id) => id !== conversation.id)

            if (exists) {
                // Đã mở: chỉ cần bỏ minimize và đưa lên đầu
                const reordered = [
                    conversation,
                    ...state.openConversations.filter((c) => c.id !== conversation.id),
                ]
                return {
                    openConversations: reordered,
                    minimizedIds: newMinimized,
                    isDropdownOpen: false,
                }
            }

            // Nếu chưa mở: thêm vào danh sách, tối đa 3 khung chat cùng lúc (như Facebook)
            const updated = [conversation, ...state.openConversations].slice(0, 3)
            return {
                openConversations: updated,
                minimizedIds: newMinimized,
                isDropdownOpen: false,
            }
        }),

    closeChat: (conversationId) =>
        set((state) => ({
            openConversations: state.openConversations.filter((c) => c.id !== conversationId),
            minimizedIds: state.minimizedIds.filter((id) => id !== conversationId),
        })),

    minimizeChat: (conversationId) =>
        set((state) => ({
            minimizedIds: state.minimizedIds.includes(conversationId)
                ? state.minimizedIds
                : [...state.minimizedIds, conversationId],
        })),

    restoreChat: (conversationId) =>
        set((state) => ({
            minimizedIds: state.minimizedIds.filter((id) => id !== conversationId),
        })),

    toggleMinimize: (conversationId) =>
        set((state) => ({
            minimizedIds: state.minimizedIds.includes(conversationId)
                ? state.minimizedIds.filter((id) => id !== conversationId)
                : [...state.minimizedIds, conversationId],
        })),

    closeAllChats: () => set({ openConversations: [], minimizedIds: [] }),
}))
