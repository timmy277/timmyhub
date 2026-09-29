'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { USER_COLUMN_FILTER_PARAMS, USER_QUERY_PARAM } from '@/constants'

// Trạng thái danh sách người dùng sống trong URL: phân trang, tìm kiếm và bộ lọc đều do server đọc lại từ đó
// (api-conventions §6). Nhờ vậy tải lại trang, chia sẻ link hay quay lại bằng nút Back đều ra đúng màn hình cũ —
// điều mà state trong RAM không làm được.
//
// `isPending` của `useTransition` là trạng thái "đang tải" thật của lần điều hướng (Next dựng lại Server Component),
// dùng để khoá nút và phủ overlay lưới.
export function useUserListQuery() {
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
            if (options?.resetPage) params.delete(USER_QUERY_PARAM.PAGE)

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
        setPageSize: (pageSize: number) => apply({ [USER_QUERY_PARAM.PAGE_SIZE]: pageSize }, { resetPage: true }),
        setSearch: (search: string) => apply({ [USER_QUERY_PARAM.SEARCH]: search }, { resetPage: true, replace: true }),
        setRole: (role: string) => apply({ [USER_QUERY_PARAM.ROLE]: role }, { resetPage: true }),
        setStatus: (status: string) => apply({ [USER_QUERY_PARAM.STATUS]: status }, { resetPage: true }),
        // Đổi thứ tự sắp xếp là đổi toàn bộ dãy dữ liệu, nên về trang 1: giữ nguyên số trang cũ chỉ khiến người dùng
        // nhìn thấy một lát cắt vô nghĩa của thứ tự mới. Đi bằng `push` để nút Back trả lại đúng thứ tự vừa xem.
        setSort: (sort: string) => apply({ [USER_QUERY_PARAM.SORT]: sort }, { resetPage: true }),
        // Bộ lọc theo cột ở tiêu đề lưới gửi lên **cả tập** tham số đang áp chứ không gửi từng khoá, nên phải xoá hết
        // bốn khoá rồi ghi lại: chỉ ghi đè khoá đang có thì khoá vừa bị bỏ trên lưới vẫn nằm trên URL, và server vẫn
        // lọc theo nó — người dùng bỏ bộ lọc mà dữ liệu không về như cũ.
        setFilters: (params: Record<string, string>) => {
            const updates: Record<string, string | undefined> = {}
            for (const key of USER_COLUMN_FILTER_PARAMS) updates[key] = params[key]
            apply(updates, { resetPage: true })
        },
        // "Đặt lại" phải xoá từ khoá, sắp xếp và bộ lọc cột trong **một** lần điều hướng: gọi `apply()` hai lần trong
        // cùng một nhịp thì lần sau ghi đè lần trước vì cả hai cùng đọc một ảnh chụp `searchParams`.
        //
        // Trả về `true` khi thật sự có điều hướng. URL vốn đã sạch thì trả `false` để bảng tự kéo lưới về trạng thái
        // hiện tại tại chỗ, thay vì đẩy thêm một mục lịch sử không thay đổi gì.
        //
        // Cố ý KHÔNG đụng vào `role`/`status`: hai ô đó là bộ lọc của thanh công cụ, vốn không nằm trong "đặt lại"
        // từ trước tới nay. Giữ nguyên phạm vi cũ thay vì lặng lẽ đổi hành vi của nút.
        resetList: () => {
            const resettable = [
                USER_QUERY_PARAM.PAGE,
                USER_QUERY_PARAM.SEARCH,
                USER_QUERY_PARAM.SORT,
                ...USER_COLUMN_FILTER_PARAMS,
            ]
            if (!resettable.some((key) => searchParams.has(key))) return false

            const updates: Record<string, string | undefined> = {}
            for (const key of resettable) updates[key] = undefined
            apply(updates, { replace: true })
            return true
        },
    }
}
