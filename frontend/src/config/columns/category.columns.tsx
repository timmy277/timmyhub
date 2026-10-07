import Image from 'next/image'
import type { useTranslations } from 'next-intl'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EditIcon, EyeIcon, FolderTreeIcon, LayersIcon, PackageIcon, Trash2Icon } from 'lucide-react'

import type { CategoryItem } from '@timmyhub/contracts'

import { Badge, RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone } from '@/constants'
import { formatTimestamp, rowActionsColumnWidth } from '@/utils'

type CategoriesTranslator = ReturnType<typeof useTranslations<'categories'>>

export interface CategoryColumnActions {
    onDetail: (category: CategoryItem) => void
    onEdit?: (category: CategoryItem) => void
    onDelete?: (category: CategoryItem) => void
}

interface CreateCategoryColumnsOptions {
    t: CategoriesTranslator
    actions: CategoryColumnActions
    canUpdate?: boolean
    canDelete?: boolean
}

// Cột bảng danh mục — cùng khuôn `createAuditColumns`/`createUserColumns`: hàm thuần, không hook, trang gọi trong
// `useMemo` với translator đã có (luật #22). Cột ảnh đứng riêng (như cột ảnh sản phẩm) thay vì nhét chung vào cột tên.
export function createCategoryColumns({
    t,
    actions,
    canUpdate = true,
    canDelete = true,
}: CreateCategoryColumnsOptions): ColDef<CategoryItem>[] {
    const buildRowActions = (category: CategoryItem): RowAction[] => {
        const rowActions: RowAction[] = [
            {
                key: 'view',
                label: t('actions.viewAndEdit'),
                ariaLabel: `${t('actions.viewAndEdit')} ${category.name}`,
                icon: EyeIcon,
                onClick: () => actions.onDetail(category),
            },
        ]

        if (canUpdate && actions.onEdit) {
            rowActions.push({
                key: 'edit',
                label: t('actions.quickEdit'),
                ariaLabel: `${t('actions.quickEdit')} ${category.name}`,
                icon: EditIcon,
                onClick: () => actions.onEdit!(category),
            })
        }

        if (canDelete && actions.onDelete) {
            rowActions.push({
                key: 'delete',
                label: t('actions.delete'),
                ariaLabel: `${t('actions.delete')} ${category.name}`,
                icon: Trash2Icon,
                destructive: true,
                disabled: (category.productCount ?? 0) > 0 || (category.childrenCount ?? 0) > 0,
                onClick: () => actions.onDelete!(category),
            })
        }

        return rowActions
    }

    return [
        {
            headerName: t('columns.image'),
            colId: 'image',
            width: 80,
            minWidth: 80,
            maxWidth: 80,
            sortable: false,
            filter: false,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const cat = params.data
                if (!cat) return null

                return (
                    <div className="flex items-center justify-center size-full py-1">
                        <div className="relative size-10 rounded-lg bg-muted border border-border/70 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                            {cat.image ? (
                                <Image src={cat.image} alt={cat.name} fill sizes="40px" className="object-cover" />
                            ) : (
                                <FolderTreeIcon className="size-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            field: 'name',
            headerName: t('columns.name'),
            minWidth: 200,
            flex: 2,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const cat = params.data
                if (!cat) return null

                return (
                    <div className="flex items-center size-full py-1">
                        <span className="font-semibold text-foreground text-xs truncate">{cat.name}</span>
                    </div>
                )
            },
        },
        {
            field: 'slug',
            headerName: t('columns.slug'),
            minWidth: 160,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const slug = params.value as string
                if (!slug) return '--'
                return (
                    <code className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                        {slug}
                    </code>
                )
            },
        },
        {
            field: 'parentName',
            headerName: t('columns.parent'),
            minWidth: 150,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const cat = params.data
                if (!cat) return null
                if (!cat.parentId) {
                    return (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                            {t('rootCategory')}
                        </Badge>
                    )
                }
                return <span className="text-xs text-foreground font-medium">{cat.parentName || t('noParent')}</span>
            },
        },
        {
            field: 'productCount',
            headerName: t('columns.products'),
            minWidth: 110,
            flex: 0.8,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const count = params.value as number | undefined
                return (
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <PackageIcon className="size-3.5 text-muted-foreground" />
                        <span>{count ?? 0}</span>
                    </div>
                )
            },
        },
        {
            field: 'childrenCount',
            headerName: t('columns.children'),
            minWidth: 120,
            flex: 0.8,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const count = params.value as number | undefined
                return (
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <LayersIcon className="size-3.5 text-muted-foreground" />
                        <span>{count ?? 0}</span>
                    </div>
                )
            },
        },
        {
            field: 'position',
            headerName: t('columns.position'),
            minWidth: 90,
            flex: 0.6,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                return <span className="text-xs font-mono text-muted-foreground">{params.value ?? 0}</span>
            },
        },
        {
            field: 'isActive',
            headerName: t('columns.status'),
            minWidth: 130,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const isActive = params.value as boolean
                return (
                    <StatusBadge
                        tone={isActive ? StatusTone.SUCCESS : StatusTone.NEUTRAL}
                        label={isActive ? t('status.active') : t('status.inactive')}
                    />
                )
            },
        },
        {
            field: 'createdAt',
            headerName: t('columns.createdAt'),
            minWidth: 140,
            flex: 1,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const val = params.value as string
                if (!val) return '--'
                return <span className="text-xs text-muted-foreground">{formatTimestamp(val)}</span>
            },
        },
        {
            colId: 'actions',
            headerName: t('columns.actions'),
            width: rowActionsColumnWidth(3),
            pinned: 'right',
            sortable: false,
            filter: false,
            suppressMovable: true,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<CategoryItem>) => {
                const category = params.data
                if (!category) return null
                return <RowActions actions={buildRowActions(category)} />
            },
        },
    ]
}
