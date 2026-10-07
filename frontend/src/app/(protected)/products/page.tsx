import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { parseProductTabs, ProductManagementPage } from '@/features/products'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('products')
    return {
        title: `${t('title')} · TimmyHub`,
    }
}

interface ProductsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Trang Quản lý sản phẩm dùng kiến trúc Tab & AgGridTable chuẩn (giống Users, Roles, Seller Applications):
// - Tab "Danh sách": Bảng AG Grid hiển thị danh sách sản phẩm (Admin duyệt toàn sàn, Seller xem sản phẩm của shop).
// - Tab "Tạo sản phẩm": Form tạo mới sản phẩm kèm tải lên hình ảnh/video trực tiếp (cho Seller).
// - Dynamic tabs "Chi tiết: [Tên sản phẩm]": Xem chi tiết, thống kê, bảng phân loại biến thể, và duyệt/tạm ngưng.
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
    const resolvedParams = await searchParams
    const tabs = parseProductTabs(resolvedParams)

    return <ProductManagementPage tabs={tabs} />
}
