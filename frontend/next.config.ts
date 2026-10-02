import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
    reactCompiler: true,
    compress: true,
    poweredByHeader: false,
    // Package workspace dùng chung FE/BE — bắt Next tự transpile thay vì coi như node_modules bên ngoài,
    // để HMR nhận thay đổi của package này giống code trong frontend/ (vẫn cần `pnpm -C shared/contracts run dev` chạy song song).
    transpilePackages: ['@timmyhub/contracts'],
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', '@ag-grid-community/locale', 'radix-ui'],
    },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
