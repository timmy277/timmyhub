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
        // Router Cache: giữ cache 30s cho dynamic route ở client để khi di chuyển qua lại giữa các trang
        // không bị gọi lại server và không chớp lại skeleton.
        staleTimes: {
            dynamic: 30,
            static: 300,
        },
        optimizePackageImports: [
            'lucide-react',
            'date-fns',
            '@ag-grid-community/locale',
            'radix-ui',
            'react-day-picker',
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
            'sonner',
            'next-intl',
        ],
    },
    images: {
        // Tối ưu ảnh: phục vụ AVIF (nén tốt hơn WebP) rồi mới đến WebP, giảm dung lượng tải xuống đáng kể.
        formats: ['image/avif', 'image/webp'],
        // TTL cache ảnh tối ưu — tăng hit ratio cho các lượt tải lại (giảm "Use cache efficiently").
        minimumCacheTTL: 60 * 60 * 24,
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
            { protocol: 'https', hostname: 'images.unsplash.com' },
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
