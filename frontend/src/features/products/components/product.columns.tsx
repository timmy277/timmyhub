import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import {
    BanIcon,
    CheckCircle2Icon,
    EyeIcon,
    PackageIcon,
    PencilIcon,
    RotateCcwIcon,
    StoreIcon,
    Trash2Icon,
    XCircleIcon,
} from 'lucide-react'

import type { ProductSummary } from '@timmyhub/contracts'
import { ProductStatus } from '@timmyhub/contracts'

import { Badge, RowActions, StatusBadge, type RowAction } from '@/components'
import { AG_GRID_NO_EXPORT, StatusTone } from '@/constants'
import { rowActionsColumnWidth } from '@/utils'

export interface ProductColumnActions {
    onDetail: (product: ProductSummary) => void
    onEdit?: (product: ProductSummary) => void
    onApprove?: (product: ProductSummary) => void
    onReject?: (product: ProductSummary) => void
    onSuspend?: (product: ProductSummary) => void
    onRestore?: (product: ProductSummary) => void
    onDelete?: (product: ProductSummary) => void
}

interface CreateProductColumnsOptions {
    actions: ProductColumnActions
    isAdmin?: boolean
    canCreateOrUpdate?: boolean
}

function formatVnd(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function createProductColumns({
    actions,
    isAdmin = false,
    canCreateOrUpdate = false,
}: CreateProductColumnsOptions): ColDef<ProductSummary>[] {
    const buildRowActions = (product: ProductSummary): RowAction[] => {
        const rowActions: RowAction[] = [
            {
                key: 'view',
                label: 'Xem chi tiết',
                ariaLabel: `Xem chi tiết ${product.name}`,
                icon: EyeIcon,
                onClick: () => actions.onDetail(product),
            },
        ]

        if (canCreateOrUpdate && actions.onEdit) {
            rowActions.push({
                key: 'edit',
                label: 'Chỉnh sửa',
                ariaLabel: `Chỉnh sửa ${product.name}`,
                icon: PencilIcon,
                onClick: () => actions.onEdit?.(product),
            })
        }

        // Admin actions
        if (isAdmin) {
            if (product.status === ProductStatus.PENDING && actions.onApprove && actions.onReject) {
                rowActions.push(
                    {
                        key: 'approve',
                        label: 'Duyệt sản phẩm',
                        ariaLabel: `Duyệt sản phẩm ${product.name}`,
                        icon: CheckCircle2Icon,
                        onClick: () => actions.onApprove?.(product),
                    },
                    {
                        key: 'reject',
                        label: 'Từ chối duyệt',
                        ariaLabel: `Từ chối duyệt ${product.name}`,
                        icon: XCircleIcon,
                        destructive: true,
                        onClick: () => actions.onReject?.(product),
                    },
                )
            }
        }

        // Suspend / Restore
        if (product.isSuspended) {
            if (actions.onRestore) {
                rowActions.push({
                    key: 'restore',
                    label: 'Khôi phục kinh doanh',
                    ariaLabel: `Khôi phục ${product.name}`,
                    icon: RotateCcwIcon,
                    onClick: () => actions.onRestore?.(product),
                })
            }
        } else if (product.status === ProductStatus.APPROVED && actions.onSuspend) {
            rowActions.push({
                key: 'suspend',
                label: 'Tạm ngưng bán',
                ariaLabel: `Tạm ngưng ${product.name}`,
                icon: BanIcon,
                destructive: true,
                onClick: () => actions.onSuspend?.(product),
            })
        }

        // Delete
        if (actions.onDelete) {
            rowActions.push({
                key: 'delete',
                label: 'Xoá sản phẩm',
                ariaLabel: `Xoá ${product.name}`,
                icon: Trash2Icon,
                destructive: true,
                onClick: () => actions.onDelete?.(product),
            })
        }

        return rowActions
    }

    const columns: ColDef<ProductSummary>[] = [
        {
            headerName: 'Hình ảnh',
            colId: 'image',
            width: 80,
            minWidth: 80,
            maxWidth: 80,
            sortable: false,
            filter: false,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const thumb = params.data.images?.[0]

                return (
                    <div className="flex items-center justify-center size-full py-1">
                        <div className="size-10 rounded-lg bg-muted border border-border/70 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                            {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt={params.data.name} className="size-full object-cover" />
                            ) : (
                                <PackageIcon className="size-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            headerName: 'Tên sản phẩm',
            field: 'name',
            flex: 1.8,
            minWidth: 200,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const prod = params.data

                return (
                    <div className="flex flex-col justify-center size-full py-1">
                        <button
                            type="button"
                            onClick={() => actions.onDetail(prod)}
                            className="text-left font-semibold text-foreground hover:text-primary hover:underline truncate text-xs"
                            title={prod.name}
                        >
                            {prod.name}
                        </button>
                    </div>
                )
            },
        },
        {
            headerName: 'Mã Slug',
            field: 'slug',
            flex: 1.2,
            minWidth: 140,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                return (
                    <div className="flex items-center size-full">
                        <span className="text-xs text-muted-foreground font-mono truncate" title={params.data.slug}>
                            {params.data.slug}
                        </span>
                    </div>
                )
            },
        },
        {
            headerName: 'Biến thể',
            colId: 'variantCount',
            flex: 0.9,
            minWidth: 110,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const count = params.data.variantCount ?? 1

                return (
                    <div className="flex items-center size-full">
                        {count > 1 ? (
                            <Badge
                                variant="secondary"
                                className="text-[11px] font-semibold rounded-md px-2 py-0.5 bg-primary/10 text-primary border border-primary/20"
                            >
                                {count} phân loại
                            </Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground">1 phiên bản</span>
                        )}
                    </div>
                )
            },
        },
    ]

    // Nếu là Admin thì hiện cột Gian hàng
    if (isAdmin) {
        columns.push({
            headerName: 'Gian hàng',
            field: 'shopName',
            flex: 1.1,
            minWidth: 160,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const name = params.data.shopName || 'Gian hàng'
                return (
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <StoreIcon className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">{name}</span>
                    </div>
                )
            },
        })
    }

    columns.push(
        {
            headerName: 'Ngành hàng',
            field: 'categoryName',
            flex: 1.1,
            minWidth: 140,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                return (
                    <span className="text-xs text-muted-foreground truncate">{params.value || 'Chưa phân loại'}</span>
                )
            },
        },
        {
            headerName: 'Khoảng giá',
            colId: 'price',
            flex: 1.2,
            minWidth: 150,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const { minPrice, maxPrice } = params.data
                let display = '0 ₫'
                if (minPrice !== null && minPrice !== undefined) {
                    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== minPrice) {
                        display = `${formatVnd(minPrice)} - ${formatVnd(maxPrice)}`
                    } else {
                        display = formatVnd(minPrice)
                    }
                }
                return <span className="text-xs font-bold text-foreground font-mono">{display}</span>
            },
        },
        {
            headerName: 'Tồn kho',
            field: 'totalStock',
            flex: 0.8,
            minWidth: 90,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                const stock = params.value ?? 0
                return (
                    <span
                        className={`text-xs font-semibold ${stock > 0 ? 'text-foreground' : 'text-rose-500 font-bold'}`}
                    >
                        {stock}
                    </span>
                )
            },
        },
        {
            headerName: 'Đã bán',
            field: 'soldCount',
            flex: 0.8,
            minWidth: 80,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                return <span className="text-xs text-muted-foreground">{params.value ?? 0}</span>
            },
        },
        {
            headerName: 'Trạng thái',
            field: 'status',
            flex: 1,
            minWidth: 120,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const prod = params.data

                if (prod.isSuspended) {
                    return <StatusBadge label="Tạm ngưng" tone={StatusTone.NEUTRAL} />
                }

                switch (prod.status) {
                    case ProductStatus.APPROVED:
                        return <StatusBadge label="Đang bán" tone={StatusTone.SUCCESS} />
                    case ProductStatus.PENDING:
                        return <StatusBadge label="Chờ duyệt" tone={StatusTone.NEUTRAL} />
                    case ProductStatus.REJECTED:
                        return <StatusBadge label="Bị từ chối" tone={StatusTone.DANGER} />
                    case ProductStatus.DRAFT:
                        return <StatusBadge label="Bản nháp" tone={StatusTone.NEUTRAL} />
                    default:
                        return <StatusBadge label={prod.status} tone={StatusTone.NEUTRAL} />
                }
            },
        },
        {
            headerName: 'Ngày tạo',
            field: 'createdAt',
            flex: 1,
            minWidth: 130,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.value) return null
                const date = new Date(params.value).toLocaleDateString('vi-VN')
                return <span className="text-xs text-muted-foreground">{date}</span>
            },
        },
        {
            headerName: 'Thao tác',
            colId: 'actions',
            pinned: 'right',
            width: rowActionsColumnWidth(3),
            suppressHeaderMenuButton: true,
            sortable: false,
            filter: false,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<ProductSummary>) => {
                if (!params.data) return null
                const rowActions = buildRowActions(params.data)
                return <RowActions actions={rowActions} />
            },
        },
    )

    return columns
}
