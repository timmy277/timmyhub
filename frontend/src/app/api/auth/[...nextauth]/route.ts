import { handlers } from '@/lib/auth'

// Catch-all route handler NextAuth v5 — phục vụ /api/auth/signin, /signout, /session, /csrf…
export const { GET, POST } = handlers
