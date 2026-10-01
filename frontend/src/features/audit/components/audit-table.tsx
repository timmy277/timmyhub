'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { AuditLogListQuery, AuditLogPagination, AuditLogSummary } from '@timmyhub/contracts'
import { AUDIT_LOG_LIST_SORT } from '@timmyhub/contracts'

import { AgGridTable, ServerPagination } from '@/components'
import { createAuditColumns } from '@/config'
import type { AuditPermissionFlags } from '@/constants'
import { AUDIT_QUERY_PARAM, AUDIT_TAB, TOAST_ID } from '@/constants'
import { useAuditListQuery } from '@/hooks'

import { buildAuditListHref } from '../audit-list-href'
import { buildAuditTabsHref } from '../audit-tab-query'

interface AuditTableProps {
    rows: AuditLogSummary[]
    pagination: AuditLogPagination
    query: AuditLogListQuery
    permissions: AuditPermissionFlags
    // Có `error` thì lưới thay bằng khối báo lỗi kèm nút thử lại (trạng thái #4 của luật #9).
    error?: string
}

// Danh sách audit log: dữ liệu là **một trang** do Server Component tải về; sắp xếp, lọc và phân trang đều ghi vào URL
// để server đọc lại (api-conventions §6) — lưới không tự lọc nhanh vì nó chỉ có dữ liệu của trang hiện tại.
//
// Khác màn người dùng: audit log là bảng bất biến (ADR-0011) nên **không** có nút thêm/sửa/xoá; cột thao tác chỉ có
// "Xem". Bảng cũng không có ô lọc ở thanh công cụ riêng: mọi chiều lọc đều là bộ lọc **theo cột** trên tiêu đề
// (hành động, dịch vụ, loại/mã đối tượng, tác nhân, khoảng thời gian) và đều đi qua URL.
export function AuditTable({ rows, pagination, query, permissions, error }: AuditTableProps) {
    // ===== State =====
    // Ô tìm kiếm lọc nhanh tại chỗ của AG Grid: bảng audit chưa có tham số URL nào nhận "tìm tổng hợp", nên đây là bộ
    // lọc tại chỗ (chỉ quét trang hiện tại) — thà có còn hơn không, giới hạn đã biết và chấp nhận.
    const [searchInput, setSearchInput] = useState('')

    // ===== Hooks =====
    const t = useTranslations('auditLog')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { isPending, setPageSize, setSort, setFilters, resetList } = useAuditListQuery()

    // ===== Derived =====
    const hrefFor = useCallback(
        (logId: string) => buildAuditTabsHref(pathname, searchParams, { tab: AUDIT_TAB.DETAIL, id: logId }),
        [pathname, searchParams],
    )

    const pageHref = useCallback(
        (patch: { page?: number; pageSize?: number }) => buildAuditListHref(pathname, searchParams, patch),
        [pathname, searchParams],
    )

    const columns = useMemo(
        () =>
            createAuditColumns({
                t,
                canRead: permissions.READ,
                actions: { onDetail: (log) => router.push(hrefFor(log.id)) },
            }),
        [t, permissions.READ, router, hrefFor],
    )

    // Bộ lọc theo cột đang áp, đọc từ URL. Phải ổn định tham chiếu: `AgGridTable` phụ thuộc vào chính object này để
    // đẩy mô hình lọc lên lưới, nên object mới mỗi lần render sẽ ghi lại mô hình ở mọi lần render. `query` là prop mới
    // mỗi lần server render lại nên tách các trường ra trước.
    const {
        action: actionFilter,
        entityType: entityTypeFilter,
        entityId: entityIdFilter,
        service: serviceFilter,
        actorId: actorIdFilter,
        occurredFrom: occurredFromFilter,
        occurredTo: occurredToFilter,
    } = query

    const columnFilters = useMemo(() => {
        const params: Record<string, string> = {}
        if (actionFilter) params[AUDIT_QUERY_PARAM.ACTION] = actionFilter
        if (entityTypeFilter) params[AUDIT_QUERY_PARAM.ENTITY_TYPE] = entityTypeFilter
        if (entityIdFilter) params[AUDIT_QUERY_PARAM.ENTITY_ID] = entityIdFilter
        if (serviceFilter) params[AUDIT_QUERY_PARAM.SERVICE] = serviceFilter
        if (actorIdFilter) params[AUDIT_QUERY_PARAM.ACTOR_ID] = actorIdFilter
        if (occurredFromFilter) params[AUDIT_QUERY_PARAM.OCCURRED_FROM] = occurredFromFilter
        if (occurredToFilter) params[AUDIT_QUERY_PARAM.OCCURRED_TO] = occurredToFilter
        return params
    }, [
        actionFilter,
        entityTypeFilter,
        entityIdFilter,
        serviceFilter,
        actorIdFilter,
        occurredFromFilter,
        occurredToFilter,
    ])

    // ===== Handlers =====
    const handleRefresh = () => {
        toast.info(t('refreshing'), { id: TOAST_ID.AUDIT_REFRESH })
        router.refresh()
    }

    const handleReset = () => {
        setSearchInput('')
        return resetList()
    }

    return (
        <div className="flex flex-col gap-4">
            <AgGridTable<AuditLogSummary>
                rowData={rows}
                columnDefs={columns}
                getRowId={(params) => params.data.id}
                loading={isPending}
                error={error}
                onRefresh={handleRefresh}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                // Sắp xếp đi qua URL: lưới chỉ giữ **một trang** dữ liệu, nên để nó tự sắp xếp thì chỉ xáo 20 dòng
                // đang hiện chứ không sắp xếp cả bảng.
                sortValue={query.sort}
                onSortChange={setSort}
                defaultSortValue={AUDIT_LOG_LIST_SORT.NEWEST}
                // Bộ lọc theo cột cũng đi qua URL như sắp xếp: menu lọc ở tiêu đề mặc định lọc TẠI CHỖ, mà lưới chỉ
                // giữ một trang nên nó chỉ lọc 20 dòng đang hiện.
                filterParams={columnFilters}
                onFilterChange={setFilters}
                onReset={handleReset}
                searchLabel={t('searchLabel')}
                exportFileName={t('exportFileName')}
                // Phân trang do URL quyết định (server trả từng trang), không dùng phân trang trong lưới.
                pagination={false}
            />

            <ServerPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                hasPrev={pagination.hasPrev}
                hasNext={pagination.hasNext}
                buildHref={pageHref}
                onPageSizeChange={setPageSize}
                disabled={isPending}
            />
        </div>
    )
}
