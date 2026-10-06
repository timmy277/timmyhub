import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { parseISO } from 'date-fns'
import { EyeIcon, ScrollTextIcon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { AuditLogSummary } from '@timmyhub/contracts'
import { AUDIT_LOG_LIST_SORT } from '@timmyhub/contracts'

import { RowActions, StatusBadge, type RowAction } from '@/components'
import {
    AG_GRID_FILTER_KEY,
    AG_GRID_NO_EXPORT,
    AG_GRID_SORT_KEY,
    AUDIT_ACTION_LABEL_KEY,
    AUDIT_ACTOR_TYPE_LABEL_KEY,
    AUDIT_ENTITY_LABEL_KEY,
    AUDIT_QUERY_PARAM,
    AUDIT_RESULT_LABEL_KEY,
    AUDIT_RESULT_TONE,
    SEARCH_DEBOUNCE_MS,
} from '@/constants'
import { compareByLocalDay, formatTimestamp, rowActionsColumnWidth } from '@/utils'

type AuditTranslator = ReturnType<typeof useTranslations<'auditLog'>>

// Cột nào sắp xếp được phía server, và bằng giá trị `sort` nào ở mỗi chiều. Cột còn phải `sortable: true` mới bấm được,
// vì ở chế độ sắp xếp phía server `sortable` là **opt-in** (mặc định tắt) — cột không khai `sortValues` thì không có
// cách nào sắp xếp cho đúng, nên thà không cho bấm còn hơn để lưới tự xáo 20 dòng của một trang.
const SORT_VALUES = {
    occurredAt: { asc: AUDIT_LOG_LIST_SORT.OLDEST, desc: AUDIT_LOG_LIST_SORT.NEWEST },
    action: { asc: AUDIT_LOG_LIST_SORT.ACTION_ASC, desc: AUDIT_LOG_LIST_SORT.ACTION_DESC },
    entityType: { asc: AUDIT_LOG_LIST_SORT.ENTITY_ASC, desc: AUDIT_LOG_LIST_SORT.ENTITY_DESC },
} as const satisfies Record<string, { asc: string; desc: string }>

// Chi tiết toán tử backend diễn tả được: chữ khớp "chứa" (không phân biệt hoa thường), ngày có đúng hai đầu mút
// `occurredFrom`/`occurredTo` khớp 1-1 với `inRange`.
const TEXT_FILTER_PARAMS = {
    filterOptions: ['contains'],
    maxNumConditions: 1,
    debounceMs: SEARCH_DEBOUNCE_MS,
}

const DATE_FILTER_PARAMS = {
    filterOptions: ['inRange'],
    defaultOption: 'inRange',
    maxNumConditions: 1,
    // Mặc định của AG Grid là khoảng MỞ, tức bỏ luôn cả hai ngày ở hai đầu. Backend dùng `gte`/`lte` nên phải khớp lại.
    inRangeInclusive: true,
    // Cắt cả hai vế về ngày lịch địa phương — nhờ vậy phần lọc tại chỗ không cắt oan bản ghi nào mà
    // `occurredFrom`/`occurredTo` phía server đã cho qua.
    comparator: compareByLocalDay,
}

export interface AuditColumnActions {
    onDetail: (log: AuditLogSummary) => void
}

interface CreateAuditColumnsOptions {
    t: AuditTranslator
    canRead: boolean
    actions: AuditColumnActions
}

// Tên hiển thị của tác nhân. Ưu tiên `actorName` (email đã resolve từ backend) vì người đọc hiểu ngay ai làm; chỉ
// rơi về `actorId` khi không tra được tên (tài khoản đã xoá) — và chữ thay thế khi không có id (hệ thống/không rõ).
function actorLabel(log: AuditLogSummary, t: AuditTranslator): string {
    if (log.actorName) return log.actorName
    if (log.actorId) return log.actorId
    return log.actorType === 'SYSTEM' ? t('systemActor') : t('unknownActor')
}

// Mô tả tiếng người của hành động. Mã lạ (backend thêm mới) rơi về chính mã thô để không bao giờ hiện ô trống.
function actionLabel(log: AuditLogSummary, t: AuditTranslator): string {
    const key = AUDIT_ACTION_LABEL_KEY[log.action as keyof typeof AUDIT_ACTION_LABEL_KEY]
    return key ? t(key) : log.action
}

// Tên loại tác nhân (Quản trị viên / Người dùng / Hệ thống) — `actorType` là chuỗi enum tiếng Anh.
export function actorTypeLabel(actorType: string, t: AuditTranslator): string {
    const key = AUDIT_ACTOR_TYPE_LABEL_KEY[actorType as keyof typeof AUDIT_ACTOR_TYPE_LABEL_KEY]
    return key ? t(key) : actorType
}

// Tên loại đối tượng bị tác động (Người dùng / Vai trò hệ thống…).
export function entityTypeLabel(entityType: string, t: AuditTranslator): string {
    const key = AUDIT_ENTITY_LABEL_KEY[entityType as keyof typeof AUDIT_ENTITY_LABEL_KEY]
    return key ? t(key) : entityType
}

// Cột bảng audit log — cùng khuôn `createUserColumns`: hàm thuần, không hook, trang gọi trong `useMemo` với translator
// đã có (luật #22).
export function createAuditColumns({ t, canRead, actions }: CreateAuditColumnsOptions): ColDef<AuditLogSummary>[] {
    const actionCount = canRead ? 1 : 0

    const buildRowActions = (log: AuditLogSummary): RowAction[] => {
        if (!canRead) return []
        return [
            {
                key: 'view',
                label: t('view'),
                ariaLabel: t('rowActionAria', { action: t('view'), target: log.action }),
                icon: EyeIcon,
                onClick: () => actions.onDetail(log),
            },
        ]
    }

    return [
        {
            headerName: t('columnOccurredAt'),
            field: 'occurredAt',
            width: 200,
            flex: 0,
            // `occurredAt` là chuỗi ISO cố định độ dài nên so sánh chuỗi trùng so sánh thời gian — khớp `orderBy` phía
            // server. Chiều mặc định đọc đúng nghĩa: bấm lần đầu ra cũ nhất trước, lần hai ra mới nhất trước.
            sortable: true,
            filter: 'agDateColumnFilter',
            filterParams: DATE_FILTER_PARAMS,
            context: {
                [AG_GRID_SORT_KEY]: SORT_VALUES.occurredAt,
                [AG_GRID_FILTER_KEY]: {
                    kind: 'date',
                    fromParam: AUDIT_QUERY_PARAM.OCCURRED_FROM,
                    toParam: AUDIT_QUERY_PARAM.OCCURRED_TO,
                },
            },
            filterValueGetter: (params) => (params.data ? parseISO(params.data.occurredAt) : null),
            valueFormatter: (params) => formatTimestamp(params.value as string),
        },
        {
            headerName: t('columnAction'),
            field: 'action',
            minWidth: 220,
            sortable: true,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            context: {
                [AG_GRID_SORT_KEY]: SORT_VALUES.action,
                [AG_GRID_FILTER_KEY]: { kind: 'text', param: AUDIT_QUERY_PARAM.ACTION },
            },
            // Hiện mô tả tiếng người ("Tạo người dùng"), không hiện mã thô — mã kỹ thuật nằm ở tab chi tiết. Nhờ vậy
            // cột này đọc được ngay; mã gốc vẫn còn nguyên ở detail cho người cần tra cứu chính xác.
            //
            // Ô lọc vẫn phải khớp **mã** vì backend lọc trên cột `action` của DB, nên `filterValueGetter` trả mã thô
            // trong khi phần hiển thị là mô tả.
            filterValueGetter: (params) => (params.data ? params.data.action : ''),
            cellRenderer: (params: ICellRendererParams<AuditLogSummary>) => {
                const log = params.data
                if (!log) return null
                return (
                    <span className="flex items-center gap-2">
                        <ScrollTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{actionLabel(log, t)}</span>
                    </span>
                )
            },
        },
        {
            headerName: t('columnService'),
            field: 'service',
            width: 140,
            flex: 0,
            sortable: false,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            context: { [AG_GRID_FILTER_KEY]: { kind: 'text', param: AUDIT_QUERY_PARAM.SERVICE } },
        },
        {
            headerName: t('columnEntityType'),
            field: 'entityType',
            width: 160,
            flex: 0,
            sortable: true,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            context: {
                [AG_GRID_SORT_KEY]: SORT_VALUES.entityType,
                [AG_GRID_FILTER_KEY]: { kind: 'text', param: AUDIT_QUERY_PARAM.ENTITY_TYPE },
            },
            // Hiện tên loại đối tượng, lọc vẫn theo mã (`User`, `SystemRole`) vì backend lọc trên cột DB.
            filterValueGetter: (params) => (params.data ? params.data.entityType : ''),
            cellRenderer: (params: ICellRendererParams<AuditLogSummary>) =>
                params.data ? <span className="truncate">{entityTypeLabel(params.data.entityType, t)}</span> : null,
        },
        {
            headerName: t('columnEntityId'),
            field: 'entityId',
            width: 140,
            flex: 0,
            sortable: false,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            context: { [AG_GRID_FILTER_KEY]: { kind: 'text', param: AUDIT_QUERY_PARAM.ENTITY_ID } },
            // Mã đối tượng là cuid dài, chiếm chỗ mà người đọc ít khi cần nguyên văn trên bảng — cắt ngắn kèm
            // tooltip, mã đầy đủ nằm ở tab chi tiết. Lọc vẫn khớp mã đầy đủ vì backend lọc trên cột `entityId`.
            cellRenderer: (params: ICellRendererParams<AuditLogSummary>) =>
                params.data ? (
                    <span className="truncate font-mono text-xs" title={params.data.entityId}>
                        {params.data.entityId}
                    </span>
                ) : null,
        },
        {
            headerName: t('columnActor'),
            colId: 'actor',
            minWidth: 200,
            sortable: false,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            valueGetter: (params) => (params.data ? actorLabel(params.data, t) : ''),
            context: { [AG_GRID_FILTER_KEY]: { kind: 'text', param: AUDIT_QUERY_PARAM.ACTOR_ID } },
            // Lọc theo **id** vì đó là thứ backend nhận, nhưng hiển thị tên người. Dòng có tên thật hiện chữ thường
            // (không mono) để phân biệt với trường hợp chỉ có id — khi đó mới cần mono cho dễ đọc.
            filterValueGetter: (params) => (params.data?.actorId ? params.data.actorId : ''),
            cellRenderer: (params: ICellRendererParams<AuditLogSummary>) => {
                const log = params.data
                if (!log) return null
                if (log.actorName) {
                    return <span className="truncate font-medium">{log.actorName}</span>
                }
                // Không có tên: tài khoản đã xoá (còn id) hoặc tác nhân hệ thống — hiện chữ mờ để không ai đọc nhầm
                // thành một tên thật.
                return (
                    <span className={log.actorId ? 'truncate font-mono text-xs' : 'italic text-muted-foreground'}>
                        {actorLabel(log, t)}
                    </span>
                )
            },
        },
        {
            headerName: t('columnResult'),
            field: 'result',
            width: 140,
            flex: 0,
            sortable: false,
            filter: false,
            cellRenderer: (params: ICellRendererParams<AuditLogSummary>) => {
                const log = params.data
                if (!log) return null
                const tone = AUDIT_RESULT_TONE[log.result as keyof typeof AUDIT_RESULT_TONE]
                const label = AUDIT_RESULT_LABEL_KEY[log.result as keyof typeof AUDIT_RESULT_LABEL_KEY]
                // Giá trị `result` lạ (backend thêm mới) vẫn hiện nguyên chuỗi thay vì vỡ badge.
                return tone && label ? (
                    <StatusBadge tone={tone} label={t(label)} />
                ) : (
                    <span className="text-muted-foreground">{log.result}</span>
                )
            },
        },
        ...(actionCount > 0
            ? [
                  {
                      headerName: t('columnActions'),
                      colId: 'actions',
                      pinned: 'right' as const,
                      width: rowActionsColumnWidth(actionCount),
                      flex: 0,
                      sortable: false,
                      filter: false,
                      resizable: false,
                      suppressHeaderMenuButton: true,
                      context: AG_GRID_NO_EXPORT,
                      cellRenderer: (params: ICellRendererParams<AuditLogSummary>) =>
                          params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
                  } satisfies ColDef<AuditLogSummary>,
              ]
            : []),
    ]
}
