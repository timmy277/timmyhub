'use client'

import { SessionProvider } from 'next-auth/react'

// SessionProvider của next-auth/react — chỉ để client gọi được getSession/signIn/signOut qua HTTP.
// Session thật vẫn là JWT mã hoá trong cookie HttpOnly; provider không chứa token nào (REQ-IDN-023).
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
}
