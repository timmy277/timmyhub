'use client'

import { useEffect, useState } from 'react'
import type { ColumnPinnedType, GridApi } from 'ag-grid-community'
import { ArrowLeftToLineIcon, ArrowRightToLineIcon, PinOffIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, Checkbox, Label } from '@/components/ui'

interface ColumnSnapshot {
    id: string
    name: string
    visible: boolean
    pinned: ColumnPinnedType
}

// Chụp trạng thái cột thành object thuần — đọc thẳng `api` trong render sẽ bị React Compiler memo theo tham chiếu
// `api` (không đổi), danh sách không bao giờ cập nhật.
function readColumns<TData>(api: GridApi<TData>): ColumnSnapshot[] {
    return api
        .getAllGridColumns()
        .filter((column) => {
            const colDef = column.getColDef()
            return Boolean(colDef.headerName) && !colDef.lockVisible
        })
        .map((column) => ({
            id: column.getColId(),
            name: api.getDisplayNameForColumn(column, 'header') ?? column.getColId(),
            visible: column.isVisible(),
            pinned: column.getPinned(),
        }))
}

const PIN_OPTIONS = [
    { value: 'left', labelKey: 'pinLeft', Icon: ArrowLeftToLineIcon },
    { value: null, labelKey: 'unpin', Icon: PinOffIcon },
    { value: 'right', labelKey: 'pinRight', Icon: ArrowRightToLineIcon },
] as const

interface ColumnManagementProps<TData> {
    api: GridApi<TData>
}

// Bảng quản lý cột như bản gốc: ẩn/hiện và ghim trái/bỏ ghim/ghim phải từng cột. Đồng bộ hai chiều — kéo ghim,
// ẩn cột từ menu header của AG Grid cũng phản chiếu lại đây qua event `displayedColumnsChanged`.
export function ColumnManagement<TData>({ api }: ColumnManagementProps<TData>) {
    const t = useTranslations('agGridTable')
    const [columns, setColumns] = useState(() => readColumns(api))

    useEffect(() => {
        const refresh = () => setColumns(readColumns(api))
        api.addEventListener('displayedColumnsChanged', refresh)
        return () => {
            if (!api.isDestroyed()) api.removeEventListener('displayedColumnsChanged', refresh)
        }
    }, [api])

    return (
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {columns.map((column) => {
                const checkboxId = `column-toggle-${column.id}`
                return (
                    <li key={column.id} className="flex items-center justify-between gap-3 rounded-md px-1 py-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <Checkbox
                                id={checkboxId}
                                checked={column.visible}
                                onCheckedChange={(checked) => api.setColumnsVisible([column.id], checked === true)}
                            />
                            <Label htmlFor={checkboxId} className="truncate font-normal">
                                {column.name}
                            </Label>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={column.name}>
                            {PIN_OPTIONS.map(({ value, labelKey, Icon }) => {
                                const active = (column.pinned ?? null) === value
                                return (
                                    <Button
                                        key={labelKey}
                                        type="button"
                                        size="icon-sm"
                                        variant={active ? 'secondary' : 'ghost'}
                                        aria-label={t(labelKey)}
                                        aria-pressed={active}
                                        className={active ? 'text-primary' : 'text-muted-foreground'}
                                        onClick={() =>
                                            api.applyColumnState({ state: [{ colId: column.id, pinned: value }] })
                                        }
                                    >
                                        <Icon className="size-4" />
                                    </Button>
                                )
                            })}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
