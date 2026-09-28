'use client'

import { getSession } from 'next-auth/react'

export { getSession }

// Chốt chặn: chỉ file này được phép gọi `getSession` từ bundle client (`next-auth/react`) — toàn bộ app
// import qua đây (`@/lib/auth-session`) để không chỗ nào tự tạo đường đọc phiên riêng, và để interceptor
// axios (lib/auth.ts) chỉ phụ thuộc đúng một điểm này.
