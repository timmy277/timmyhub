'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { AUDIT_COLUMN_FILTER_PARAMS, AUDIT_QUERY_PARAM } from '@/constants'

// Trạng thái danh sách audit log sống trong URL: phân trang, sắp xếp và bộ lọc đều do server đọc lại từ đó
// (api-conventions §6). Nhờ vậy tải lại trang, chia sẻ link hay quay lại bằng nút Back đều ra đúng màn hình cũ.
//
// `isPending` của `useTransition` là trạng thái "đang tải" thật của lần điều hướng (Next dựng lại Server Component),
// dùng để khoá nút và phủ overlay lưới.
export function useAuditListQuery() {
    // ===== Hooks =====
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // ===== Handlers =====
    const apply = useCallback(
        (
            updates: Record<string, string | number | undefined>,
            options?: { replace?: boolean; resetPage?: boolean },
        ) => {
            const params = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(updates)) {
                if (value === undefined || value === '') params.delete(key)
                else params.set(key, String(value))
            }
            // Đổi bộ lọc hay từ khoá thì bắt đầu lại từ trang 1, nếu không người dùng sẽ rơi vào trang trống.
            if (options?.resetPage) params.delete(AUDIT_QUERY_PARAM.PAGE)

            const href = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
            startTransition(() => {
                if (options?.replace) router.replace(href, { scroll: false })
                else router.push(href, { scroll: false })
            })
        },
        [pathname, router, searchParams],
    )

    return {
        isPending,
        // Đổi số trang không đi qua đây: các ô số trang là `<Link>` thật trỏ tới URL của trang đó (xem
        // `ServerPagination`), nên không cần một hàm điều hướng bằng JS nữa.
        setPageSize: (pageSize: number) => apply({ [AUDIT_QUERY_PARAM.PAGE_SIZE]: pageSize }, { resetPage: true }),
        // Đổi thứ tự sắp xếp là đổi toàn bộ dãy dữ liệu, nên về trang 1. Đi bằng `push` để nút Back trả lại đúng thứ
        // tự vừa xem.
        setSort: (sort: string) => apply({ [AUDIT_QUERY_PARAM.SORT]: sort }, { resetPage: true }),
        // Bộ lọc theo cột ở tiêu đề lưới gửi lên **cả tập** tham số đang áp chứ không gửi từng khoá, nên phải xoá hết
        // các khoá rồi ghi lại: chỉ ghi đè khoá đang có thì khoá vừa bị bỏ trên lưới vẫn nằm trên URL, và server vẫn
        // lọc theo nó.
        setFilters: (params: Record<string, string>) => {
            const updates: Record<string, string | undefined> = {}
            for (const key of AUDIT_COLUMN_FILTER_PARAMS) updates[key] = params[key]
            apply(updates, { resetPage: true })
        },
        // Bộ lọc ở thanh công cụ (dịch vụ, kết quả) — một khoá một lần.
        setToolbarFilter: (key: string, value: string) => apply({ [key]: value }, { resetPage: true }),
        // "Đặt lại" phải xoá sắp xếp và bộ lọc cột trong **một** lần điều hướng: gọi `apply()` hai lần trong cùng một
        // nhịp thì lần sau ghi đè lần trước vì cả hai cùng đọc một ảnh chụp `searchParams`.
        //
        // Trả về `true` khi thật sự có điều hướng. URL vốn đã sạch thì trả `false` để bảng tự kéo lưới về trạng thái
        // hiện tại tại chỗ, thay vì đẩy thêm một mục lịch sử không thay đổi gì.
        //
        // Cố ý KHÔNG đụng vào hai ô lọc của thanh công cụ (`service`/`result` không nằm trong danh sách này trừ
        // `service` vốn là bộ lọc theo cột): giữ nguyên phạm vi giống nút "Đặt lại" của màn người dùng.
        resetList: () => {
            const resettable = [AUDIT_QUERY_PARAM.PAGE, AUDIT_QUERY_PARAM.SORT, ...AUDIT_COLUMN_FILTER_PARAMS]
            if (!resettable.some((key) => searchParams.has(key))) return false

            const updates: Record<string, string | undefined> = {}
            for (const key of resettable) updates[key] = undefined
            apply(updates, { replace: true })
            return true
        },
    }
}
