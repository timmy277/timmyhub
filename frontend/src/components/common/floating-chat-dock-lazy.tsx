'use client'

import dynamic from 'next/dynamic'

// Lazy-load FloatingChatDock — tách toàn bộ socket.io client, UI chat box (700+ lines),
// form soạn tin, media uploader và icon chat ra khỏi First Load JS chunk của RootLayout.
// Chat dock sẽ tự động tải ở background sau khi trang hoàn tất hydration ban đầu.
export const FloatingChatDock = dynamic(() => import('./floating-chat-box').then((m) => m.FloatingChatDock), {
    ssr: false,
})
