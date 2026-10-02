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
    images: {
        // Cho phép next/image tối ưu ảnh từ các nguồn lưu trữ media:
        // - localhost: backend dev server — Next.js optimizer follow rewrite /uploads/* → localhost:3001
        //   dangerouslyAllowLocalIP bật để optimizer vượt SSRF protection trong dev (an toàn vì chỉ chạy local)
        // - Supabase Storage: *.supabase.co/storage/v1/object/public/...
        // - AWS S3 / CloudFront: *.amazonaws.com
        dangerouslyAllowSVG: false,
        dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
        remotePatterns: [
            { protocol: 'http', hostname: 'localhost', port: '3001' },
            { protocol: 'http', hostname: '127.0.0.1', port: '3001' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '*.supabase.in' },
            { protocol: 'https', hostname: '*.amazonaws.com' },
            { protocol: 'https', hostname: '*.cloudfront.net' },
        ],
    },
    // Proxy /uploads/* về backend — tránh CORS và cho phép xem ảnh local
    // qua cùng origin (localhost:3000) mà không cần cấu hình thêm ở client.
    async rewrites() {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
        return [
            {
                source: '/uploads/:path*',
                destination: `${backendUrl}/uploads/:path*`,
            },
        ]
    },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
