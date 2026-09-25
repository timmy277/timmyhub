'use client'

import type { ReactElement } from 'react'
import dynamic from 'next/dynamic'

import type { AgGridTableProps } from './ag-grid-table'
import { AgGridTableSkeleton } from './ag-grid-table-skeleton'

// Điểm vào duy nhất của AgGridTable: AG Grid chỉ tải khi bảng thực sự render (luật cứng #12 — 0 KB vào gói chung).
// `dynamic()` làm mất generic, nên ép lại kiểu để `columnDefs` vẫn được suy luận theo `TData`.
export const AgGridTable = dynamic(() => import('./ag-grid-table').then((module) => module.AgGridTable), {
    ssr: false,
    loading: () => <AgGridTableSkeleton />,
}) as <TData>(props: AgGridTableProps<TData>) => ReactElement
