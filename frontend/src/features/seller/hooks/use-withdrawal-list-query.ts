'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { WITHDRAWAL_QUERY_PARAM } from '@/constants'

export function useWithdrawalListQuery() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

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
            if (options?.resetPage) params.delete(WITHDRAWAL_QUERY_PARAM.PAGE)

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
        setPage: (page: number) => apply({ [WITHDRAWAL_QUERY_PARAM.PAGE]: page }),
        setPageSize: (pageSize: number) => apply({ [WITHDRAWAL_QUERY_PARAM.PAGE_SIZE]: pageSize }, { resetPage: true }),
        setStatus: (status?: string) => apply({ [WITHDRAWAL_QUERY_PARAM.STATUS]: status }, { resetPage: true }),
        setSearch: (q?: string) => apply({ [WITHDRAWAL_QUERY_PARAM.Q]: q }, { replace: true, resetPage: true }),
        resetList: () => {
            const params = new URLSearchParams(searchParams.toString())
            params.delete(WITHDRAWAL_QUERY_PARAM.PAGE)
            params.delete(WITHDRAWAL_QUERY_PARAM.PAGE_SIZE)
            params.delete(WITHDRAWAL_QUERY_PARAM.STATUS)
            params.delete(WITHDRAWAL_QUERY_PARAM.Q)

            const href = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
            startTransition(() => {
                router.push(href, { scroll: false })
            })
        },
    }
}
