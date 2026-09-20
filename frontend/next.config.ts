import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    // Package workspace dùng chung FE/BE — bắt Next tự transpile thay vì coi như node_modules bên ngoài,
    // để HMR nhận thay đổi của package này giống code trong frontend/ (vẫn cần `pnpm -C shared/contracts run dev` chạy song song).
    transpilePackages: ['@timmyhub/contracts'],
}

export default nextConfig
