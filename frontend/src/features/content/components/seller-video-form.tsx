'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CreateVideoPostInput } from '@timmyhub/contracts'
import { CreateVideoPostSchema } from '@timmyhub/contracts'
import { Camera, Check, Film, Plus, ShoppingBag, Sparkles, Trash2, Video, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    Card,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Input,
    Label,
    Spinner,
    Textarea,
} from '@/components/ui'
import { API_ROUTE } from '@/constants'
import { apiClient } from '@/services'

import { useSellerVideos } from '../hooks/use-seller-videos'
import { VideoDropzoneUpload } from './video-dropzone-upload'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES / INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
interface ProductPickerItem {
    id: string
    name: string
    slug: string
    thumbnail?: string | null
    minPrice?: number | null
}

export interface SellerVideoFormProps {
    onSuccess?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function SellerVideoForm({ onSuccess }: SellerVideoFormProps) {
    // 3.1. Props & State
    const { createVideo, isCreating } = useSellerVideos()
    const [shopProducts, setShopProducts] = useState<ProductPickerItem[]>([])
    const [isLoadingProducts, setIsLoadingProducts] = useState(false)
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false)
    const [customHashtagInput, setCustomHashtagInput] = useState('')

    // 3.2. Form initialization with react-hook-form & Zod resolver
    const form = useForm<CreateVideoPostInput>({
        resolver: zodResolver(CreateVideoPostSchema),
        defaultValues: {
            title: '',
            content: '',
            videoUrl: '',
            thumbnailUrl: '',
            hashtags: [],
            productIds: [],
            status: 'PUBLISHED',
        },
    })

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = form

    const watchedVideoUrl = useWatch({ control, name: 'videoUrl' })
    const watchedThumbnailUrl = useWatch({ control, name: 'thumbnailUrl' })
    const watchedProductIds = useWatch({ control, name: 'productIds' }) || []
    const watchedHashtags = useWatch({ control, name: 'hashtags' }) || []

    // 3.3. Effects: Fetch shop products for attaching
    useEffect(() => {
        async function fetchShopProducts() {
            setIsLoadingProducts(true)
            try {
                const res = await apiClient.get<{ items: ProductPickerItem[] }>(API_ROUTE.CATALOG.PUBLIC_PRODUCTS, {
                    params: { limit: 30 },
                })
                if (res.data?.items) {
                    setShopProducts(res.data.items)
                }
            } catch {
                toast.error('Không thể tải danh sách sản phẩm của cửa hàng')
            } finally {
                setIsLoadingProducts(false)
            }
        }
        void fetchShopProducts()
    }, [])

    // 3.4. Handlers
    const toggleProductTag = (productId: string) => {
        const current = watchedProductIds || []
        if (current.includes(productId)) {
            setValue(
                'productIds',
                current.filter((id) => id !== productId),
                { shouldValidate: true },
            )
        } else {
            if (current.length >= 5) {
                toast.warning('Chỉ được gắn tối đa 5 sản phẩm trên một video bài đăng!')
                return
            }
            setValue('productIds', [...current, productId], { shouldValidate: true })
        }
    }

    const handleAddHashtag = () => {
        const clean = customHashtagInput.replace(/^#/, '').trim()
        if (!clean) return
        if (watchedHashtags.includes(clean)) {
            setCustomHashtagInput('')
            return
        }
        setValue('hashtags', [...watchedHashtags, clean])
        setCustomHashtagInput('')
    }

    const handleRemoveHashtag = (tag: string) => {
        setValue(
            'hashtags',
            watchedHashtags.filter((t) => t !== tag),
        )
    }

    const onSubmit = async (data: CreateVideoPostInput) => {
        if (!data.videoUrl) {
            toast.error('Vui lòng kéo thả hoặc tải lên video bán hàng!')
            return
        }

        const finalThumbnail = data.thumbnailUrl || `${data.videoUrl}#t=0.0001`
        await createVideo({
            ...data,
            thumbnailUrl: finalThumbnail,
        })
        form.reset()
        onSuccess?.()
    }

    // 3.5. JSX Return
    return (
        <Card className="p-6 md:p-8 bg-card border-border/80 shadow-lg rounded-3xl max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b border-border/60 pb-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Video className="size-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>Đăng video bán hàng (Shoppable Video)</span>
                        <Sparkles className="size-4 text-emerald-500 animate-pulse" />
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Kéo thả video sản phẩm, gắn tag giỏ hàng mua sắm trực tiếp và tiếp cận khách hàng trên TimmyHub.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 1. SECTION: DRAGGABLE VIDEO UPLOAD (Người bán kéo thả video) */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Tải lên Video sản phẩm <span className="text-red-500">*</span>
                    </Label>
                    <VideoDropzoneUpload
                        value={watchedVideoUrl}
                        thumbnailValue={watchedThumbnailUrl}
                        onChange={(url) => setValue('videoUrl', url, { shouldValidate: true })}
                        onThumbnailChange={(thumb) => setValue('thumbnailUrl', thumb, { shouldValidate: true })}
                        error={errors.videoUrl?.message}
                    />
                </div>

                {/* 2. SECTION: TIÊU ĐỀ VIDEO */}
                <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-bold text-foreground">
                        Tiêu đề video <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="title"
                        placeholder="Ví dụ: Trải nghiệm Áo thun nam Basic Cotton 100% co giãn 4 chiều..."
                        {...register('title')}
                        className="rounded-xl border-border h-11"
                    />
                    {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>

                {/* 3. SECTION: ẢNH BÌA THUMBNAIL (Hiển thị frame 0.0001s đã trích xuất) */}
                <div className="space-y-2 rounded-2xl bg-muted/30 p-4 border border-border/60">
                    <div className="flex items-center justify-between">
                        <Label
                            htmlFor="thumbnailUrl"
                            className="text-xs font-bold text-foreground flex items-center gap-1.5"
                        >
                            <Camera className="size-4 text-emerald-500" />
                            Ảnh bìa Thumbnail (Tự động cắt tại 0.0001s)
                        </Label>
                        <Badge
                            variant="secondary"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0"
                        >
                            Khung hình đầu tiên
                        </Badge>
                    </div>

                    {watchedThumbnailUrl ? (
                        <div className="flex items-center gap-4">
                            <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-border shadow-md shrink-0 bg-neutral-900">
                                <Image
                                    src={watchedThumbnailUrl}
                                    alt="Thumbnail preview"
                                    fill
                                    sizes="144px"
                                    className="object-cover"
                                    unoptimized
                                />
                                <Badge className="absolute bottom-1 right-1 bg-black/75 text-[9px] font-mono px-1 py-0">
                                    0.0001s
                                </Badge>
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">Đã sẵn sàng ảnh bìa video</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Ảnh bìa này sẽ hiển thị trên trang chủ và trong danh sách quản lý video của Shop.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">
                            Chưa có ảnh bìa. Khi bạn kéo thả video ở trên, hệ thống sẽ tự động bắt khung hình tại
                            0.0001s làm ảnh bìa.
                        </p>
                    )}
                </div>

                {/* 4. SECTION: MÔ TẢ & CAPTION */}
                <div className="space-y-1.5">
                    <Label htmlFor="content" className="text-xs font-bold text-foreground">
                        Mô tả chi tiết / Caption bài viết
                    </Label>
                    <Textarea
                        id="content"
                        rows={3}
                        placeholder="Chia sẻ cảm nhận, cách phối đồ hoặc lưu ý khi sử dụng sản phẩm..."
                        {...register('content')}
                        className="rounded-xl border-border resize-none"
                    />
                    {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
                </div>

                {/* 5. SECTION: HASHTAGS */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Hashtags</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Nhập hashtag (vd: aothun, review, thoitrangnam)"
                            value={customHashtagInput}
                            onChange={(e) => setCustomHashtagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddHashtag()
                                }
                            }}
                            className="rounded-xl border-border h-10 text-xs"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddHashtag}
                            className="h-10 px-4 rounded-xl text-xs font-bold shrink-0"
                        >
                            Thêm
                        </Button>
                    </div>
                    {watchedHashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {watchedHashtags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs flex items-center gap-1.5 py-1 px-2.5 rounded-lg"
                                >
                                    #{tag}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveHashtag(tag)}
                                        className="size-3.5 p-0 h-auto hover:text-red-500 hover:bg-transparent"
                                    >
                                        <X className="size-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* 6. SECTION: SẢN PHẨM GẮN KÈM (SHOPPABLE TAGS) */}
                <div className="space-y-3 border-t border-border/60 pt-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <ShoppingBag className="size-4 text-emerald-500" />
                                Sản phẩm gắn kèm ({watchedProductIds.length}/5) <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Chọn từ 1 đến 5 sản phẩm để người mua có thể bấm mua trực tiếp khi xem video.
                            </p>
                        </div>

                        {/* Dialog chọn sản phẩm */}
                        <Dialog open={isProductPickerOpen} onOpenChange={setIsProductPickerOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-xs font-bold flex items-center gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                                >
                                    <Plus className="size-3.5" />
                                    Chọn sản phẩm
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg bg-card border-border rounded-3xl p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                                        <ShoppingBag className="size-4 text-emerald-500" />
                                        Chọn sản phẩm gắn vào video
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Tích chọn tối đa 5 sản phẩm đang kinh doanh trong shop của bạn.
                                    </DialogDescription>
                                </DialogHeader>

                                {isLoadingProducts ? (
                                    <div className="py-8 flex justify-center">
                                        <Spinner className="size-6 text-emerald-500 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                                        {shopProducts.map((p) => {
                                            const isSelected = watchedProductIds.includes(p.id)
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => toggleProductTag(p.id)}
                                                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                                                            : 'border-border/70 hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="relative size-11 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                                                            {p.thumbnail ? (
                                                                <Image
                                                                    src={p.thumbnail}
                                                                    alt={p.name}
                                                                    fill
                                                                    sizes="44px"
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <ShoppingBag className="size-5 m-3 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">
                                                                {p.name}
                                                            </p>
                                                            {p.minPrice && (
                                                                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                                                                    {p.minPrice.toLocaleString('vi-VN')} đ
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`size-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                                            isSelected
                                                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                                                : 'border-border/80'
                                                        }`}
                                                    >
                                                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Danh sách các sản phẩm đã chọn */}
                    {watchedProductIds.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {watchedProductIds.map((pid) => {
                                const prod = shopProducts.find((p) => p.id === pid)
                                return (
                                    <div
                                        key={pid}
                                        className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/70 text-xs shadow-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                                                <ShoppingBag className="size-3.5" />
                                            </div>
                                            <span className="truncate font-semibold text-foreground">
                                                {prod?.name || pid}
                                            </span>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            type="button"
                                            onClick={() => toggleProductTag(pid)}
                                            className="size-7 text-muted-foreground hover:text-red-500 rounded-lg shrink-0"
                                            title="Bỏ gắn sản phẩm"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            * Vui lòng chọn ít nhất 1 sản phẩm để gắn kèm.
                        </p>
                    )}
                    {errors.productIds && <p className="text-xs text-red-500">{errors.productIds.message}</p>}
                </div>

                {/* 7. SUBMIT BUTTON */}
                <div className="pt-5 border-t border-border/60 flex items-center justify-end gap-3">
                    <Button
                        type="submit"
                        disabled={isCreating}
                        className="rounded-2xl px-7 h-11 font-bold shadow-md bg-emerald-500 hover:bg-emerald-600 text-black flex items-center gap-2 text-xs"
                    >
                        {isCreating ? (
                            <>
                                <Spinner className="size-4 animate-spin" />
                                <span>Đang xử lý & xuất bản...</span>
                            </>
                        ) : (
                            <>
                                <Film className="size-4" />
                                <span>Xuất bản Video Bán Hàng</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
