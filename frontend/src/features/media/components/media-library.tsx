'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
    Search,
    Grid,
    List,
    UploadCloud,
    Film,
    Image as ImageIcon,
    Trash2,
    RefreshCw,
    Copy,
    Check,
    HardDrive,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import type { MediaOwnerType, MediaType } from '@timmyhub/contracts'

import { useDeleteMedia, useMediaList, useDebouncedValue } from '@/hooks'
import { SEARCH_DEBOUNCE_MS } from '@/constants'
import { formatBytes, formatTimestamp, resolveMediaUrl } from '@/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    ErrorState,
} from '@/components'

import { MediaLightbox, type MediaLightboxItem } from './media-lightbox'
import { MediaUploader } from './media-uploader'

export function MediaLibrary() {
    // ===== i18n =====
    const t = useTranslations('media.library')
    const tCommon = useTranslations('common')

    // ===== State =====
    const [search, setSearch] = useState('')
    const [selectedType, setSelectedType] = useState<MediaType | ''>('')
    const [selectedOwnerType, setSelectedOwnerType] = useState<MediaOwnerType | ''>('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [showUploader, setShowUploader] = useState(false)
    const [lightboxItem, setLightboxItem] = useState<MediaLightboxItem | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    // pendingDeleteId: giữ ID đang chờ xác nhận xoá — cần thiết vì AlertDialog render
    // ở ngoài vòng lặp map, không thể dùng event stopPropagation trực tiếp
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

    // ===== Hooks =====
    const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
    const { data, isLoading, isError, refetch, isFetching } = useMediaList({
        page: 1,
        limit: 50,
        type: selectedType ? selectedType : undefined,
        ownerType: selectedOwnerType ? selectedOwnerType : undefined,
        search: debouncedSearch || undefined,
    })
    const deleteMediaMutation = useDeleteMedia()

    // ===== Derived =====
    // Chỉ hiển thị các asset đã sẵn sàng (READY) và có đường dẫn hợp lệ,
    // loại bỏ các bản ghi tạm thời đang tải dở (UPLOADING) nếu có race condition
    const assets = (data?.data ?? []).filter(
        (asset) => asset.status === 'READY' || (!asset.status && Boolean(asset.originalUrl)),
    )

    // ===== Handlers =====
    const handleDeleteConfirm = async () => {
        if (!pendingDeleteId) return
        try {
            await deleteMediaMutation.mutateAsync(pendingDeleteId)
            toast.success(t('deleteSuccess'))
        } catch {
            toast.error(t('deleteFailed'))
        } finally {
            setPendingDeleteId(null)
        }
    }

    const handleCopyUrl = async (url: string | null, id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!url) return
        try {
            await navigator.clipboard.writeText(url)
            setCopiedId(id)
            toast.success(t('copySuccess'))
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error(t('copyFailed'))
        }
    }

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 backdrop-blur-xl shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-sky-500" /> Thư viện Media &amp; Tải lên
                    </h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Quản lý toàn bộ tài nguyên hình ảnh và video sản phẩm, bài đăng chuẩn S3 / Supabase
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Làm mới danh sách"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-sky-500' : ''}`} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowUploader(!showUploader)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                            showUploader
                                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-sky-500/20'
                        }`}
                    >
                        <UploadCloud className="w-4 h-4" />
                        {showUploader ? 'Đóng khu vực tải lên' : 'Tải lên Media mới'}
                    </button>
                </div>
            </div>

            {/* Collapsible Uploader Section */}
            {showUploader && (
                <div className="p-6 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-sky-500/30 dark:border-sky-500/20 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                            <UploadCloud className="w-4 h-4 text-sky-500" /> Tải lên nhiều Ảnh &amp; Video
                        </h2>
                    </div>
                    <MediaUploader
                        acceptType="all"
                        onUploadSuccess={() => {
                            void refetch()
                        }}
                    />
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    {/* Search Input */}
                    <div className="relative min-w-[220px] flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm tập tin hoặc URL..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        />
                    </div>

                    {/* Type Filter Buttons */}
                    <div className="flex items-center rounded-lg bg-neutral-200/80 dark:bg-neutral-800 p-0.5 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setSelectedType('')}
                            className={`px-3 py-1 rounded-md transition-colors ${
                                selectedType === ''
                                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm font-semibold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('IMAGE')}
                            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                                selectedType === 'IMAGE'
                                    ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                            }`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" /> Ảnh
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('VIDEO')}
                            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                                selectedType === 'VIDEO'
                                    ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                            }`}
                        >
                            <Film className="w-3.5 h-3.5" /> Video
                        </button>
                    </div>

                    {/* Owner Type Select Filter */}
                    <select
                        value={selectedOwnerType}
                        onChange={(e) => setSelectedOwnerType(e.target.value as MediaOwnerType | '')}
                        className="py-1.5 px-3 text-xs rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    >
                        <option value="">Phân loại (Tất cả)</option>
                        <option value="PRODUCT">Sản phẩm (PRODUCT)</option>
                        <option value="AVATAR">Ảnh đại diện (AVATAR)</option>
                        <option value="POST">Bài viết (POST)</option>
                        <option value="REVIEW">Đánh giá (REVIEW)</option>
                        <option value="AD_CREATIVE">Quảng cáo (AD_CREATIVE)</option>
                        <option value="GENERAL">Chung (GENERAL)</option>
                    </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-lg transition-colors ${
                            viewMode === 'grid'
                                ? 'bg-white dark:bg-neutral-800 text-sky-500 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                        }`}
                        title="Chế độ lưới"
                    >
                        <Grid className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-lg transition-colors ${
                            viewMode === 'list'
                                ? 'bg-white dark:bg-neutral-800 text-sky-500 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                        }`}
                        title="Chế độ danh sách"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Media Content Grid or List */}
            {isLoading ? (
                <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
                    <p className="text-xs">{t('loading')}</p>
                </div>
            ) : isError ? (
                <ErrorState
                    title={tCommon('errorGeneric')}
                    description={t('loadErrorDesc')}
                    onRetry={() => void refetch()}
                />
            ) : assets.length === 0 ? (
                <div className="w-full py-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 text-center p-6">
                    <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-3">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Chưa có tập tin media nào
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1 mb-4">
                        Nhấn nút Tải lên để bắt đầu thêm hình ảnh hoặc video vào hệ thống.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowUploader(true)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                    >
                        Tải lên ngay
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {assets.map((asset) => (
                        <div
                            key={asset.id}
                            onClick={() =>
                                setLightboxItem({
                                    url: asset.originalUrl || '',
                                    type: asset.type,
                                    title: asset.id,
                                })
                            }
                            className="group relative cursor-pointer flex flex-col rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-square w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
                                {asset.type === 'VIDEO' ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <video
                                            src={asset.originalUrl || ''}
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                            <div className="p-2.5 rounded-full bg-black/60 text-amber-300 backdrop-blur-md">
                                                <Film className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                ) : // Chỉ render Image khi có URL — next/image crash với src=''
                                resolveMediaUrl(asset.thumbnailUrl || asset.originalUrl) ? (
                                    <Image
                                        src={resolveMediaUrl(asset.thumbnailUrl || asset.originalUrl)!}
                                        alt={asset.id}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-neutral-600" />
                                )}

                                {/* Hover overlay action buttons */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => handleCopyUrl(asset.originalUrl, asset.id, e)}
                                            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-neutral-800 transition-colors"
                                            title="Sao chép URL"
                                        >
                                            {copiedId === asset.id ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setPendingDeleteId(asset.id)
                                            }}
                                            className="p-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 transition-colors"
                                            title="Xoá tập tin"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="text-[10px] text-neutral-300 flex items-center justify-between font-mono">
                                        <span>{formatBytes(asset.sizeBytes)}</span>
                                        <span className="uppercase px-1 py-0.5 rounded bg-black/60 text-white">
                                            {asset.type}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Details footer */}
                            <div className="p-2.5 flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span
                                        className="font-mono text-neutral-600 dark:text-neutral-400 truncate max-w-[100px]"
                                        title={asset.id}
                                    >
                                        {asset.id.substring(0, 10)}...
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                        {asset.ownerType}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View Mode */
                <div className="w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500">
                                <th className="p-3">Xem trước</th>
                                <th className="p-3">ID / Tên</th>
                                <th className="p-3">Loại</th>
                                <th className="p-3">Mục đích</th>
                                <th className="p-3">Dung lượng</th>
                                <th className="p-3">Ngày tạo</th>
                                <th className="p-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {assets.map((asset) => (
                                <tr
                                    key={asset.id}
                                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                                >
                                    <td className="p-3">
                                        <div
                                            onClick={() =>
                                                setLightboxItem({
                                                    url: asset.originalUrl || '',
                                                    type: asset.type,
                                                    title: asset.id,
                                                })
                                            }
                                            className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-950 cursor-pointer flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-800"
                                        >
                                            {asset.type === 'VIDEO' ? (
                                                <Film className="w-5 h-5 text-amber-400" />
                                            ) : resolveMediaUrl(asset.thumbnailUrl || asset.originalUrl) ? (
                                                <Image
                                                    src={resolveMediaUrl(asset.thumbnailUrl || asset.originalUrl)!}
                                                    alt={asset.id}
                                                    width={40}
                                                    height={40}
                                                    sizes="40px"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="w-5 h-5 text-neutral-600" />
                                            )}
                                        </div>
                                    </td>
                                    <td
                                        className="p-3 font-mono text-neutral-800 dark:text-neutral-200 max-w-[200px] truncate"
                                        title={asset.id}
                                    >
                                        {asset.id}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                asset.type === 'VIDEO'
                                                    ? 'bg-amber-500/10 text-amber-500'
                                                    : 'bg-sky-500/10 text-sky-500'
                                            }`}
                                        >
                                            {asset.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-neutral-600 dark:text-neutral-400">{asset.ownerType}</td>
                                    <td className="p-3 font-mono text-neutral-600 dark:text-neutral-400">
                                        {formatBytes(asset.sizeBytes)}
                                    </td>
                                    <td className="p-3 text-neutral-500">{formatTimestamp(asset.createdAt)}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyUrl(asset.originalUrl, asset.id, e)}
                                                className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                                                title="Sao chép URL"
                                            >
                                                {copiedId === asset.id ? (
                                                    <Check className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPendingDeleteId(asset.id)}
                                                className="p-1.5 rounded-md hover:bg-rose-500/10 text-rose-500 transition-colors"
                                                title="Xoá tập tin"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Lightbox Viewer */}
            <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

            {/* Delete Confirmation Dialog — nằm ngoài vòng lặp để tránh multiple DOM nodes */}
            <AlertDialog
                open={Boolean(pendingDeleteId)}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteId(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xoá tập tin media?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Tập tin sẽ bị xoá khỏi hệ thống lưu trữ vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Huỷ</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void handleDeleteConfirm()}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Xoá
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
