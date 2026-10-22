import { create } from 'zustand'

export interface AuthModalOptions {
    title?: string
    message?: string
    callbackUrl?: string
    confirmText?: string
}

interface AuthModalState {
    isOpen: boolean
    title: string
    message: string
    callbackUrl: string
    confirmText: string
    openModal: (options?: AuthModalOptions) => void
    closeModal: () => void
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    isOpen: false,
    title: 'Yêu cầu đăng nhập',
    message: 'Vui lòng đăng nhập để tiếp tục trải nghiệm đầy đủ tính năng trên TimmyHub.',
    callbackUrl: '',
    confirmText: 'Đăng nhập ngay',
    openModal: (options) =>
        set({
            isOpen: true,
            title: options?.title || 'Yêu cầu đăng nhập',
            message:
                options?.message ||
                'Vui lòng đăng nhập tài khoản để tiếp tục trải nghiệm đầy đủ tính năng trên TimmyHub.',
            callbackUrl:
                options?.callbackUrl ||
                (typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''),
            confirmText: options?.confirmText || 'Đăng nhập ngay',
        }),
    closeModal: () => set({ isOpen: false }),
}))
