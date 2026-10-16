import type { MetadataRoute } from 'next'

import { ROUTE } from '@/constants'

// `robots.txt` là chỉ dẫn, không phải hàng rào: nó chặn bot lịch sự, còn `(protected)/layout.tsx` mới là chỗ phát
// thẻ `<meta name="robots" content="noindex">` thật. Cần cả hai vì bot có thể vào thẳng URL con mà không đọc file này.
//
// Hiện chỉ `/login` là trang công khai; toàn bộ nhóm `(protected)` nằm sau đăng nhập. Khi có trang catalog công khai
// thì thêm vào `allow` và bỏ khỏi `disallow`.
//
// Chưa khai `sitemap`: dự án chưa có `app/sitemap.ts` nên trỏ tới `/sitemap.xml` chỉ tạo ra một 404.
export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', ROUTE.LOGIN, '/products/', '/shops/'],
                disallow: [
                    '/api/',
                    ROUTE.DASHBOARD,
                    ROUTE.USERS,
                    ROUTE.ROLES,
                    ROUTE.PERMISSIONS,
                    ROUTE.ADMIN_CATEGORIES,
                    ROUTE.ADMIN_VOUCHERS,
                    ROUTE.ADMIN_CAMPAIGNS,
                    ROUTE.CART,
                    ROUTE.CHECKOUT,
                    ROUTE.ORDERS,
                    ROUTE.ACCOUNT,
                    '/seller/',
                    '/my-vouchers',
                    '/payment',
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    }
}
