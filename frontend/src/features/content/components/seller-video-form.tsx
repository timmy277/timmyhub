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
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
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
                // Thử lấy danh sách sản phẩm từ seller products hoặc public products
                const res = await apiClient.get<{ items: ProductPickerItem[] }>(API_ROUTE.CATALOG.PUBLIC_PRODUCTS, {
                    params: { limit: 20 },
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

    // 3.4. Auto client-side thumbnail generation at 0.0001s (Fallback frontend)
    const generateThumbnailAtPointZeroZeroZeroOne = (videoUrl: string) => {
        if (!videoUrl) return

        setIsGeneratingThumbnail(true)
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.preload = 'metadata'
        video.src = videoUrl
        video.muted = true
        video.playsInline = true
        // Thời điểm chính xác 0.0001s như user yêu cầu
        video.currentTime = 0.0001

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = video.videoWidth || 720
                canvas.height = video.videoHeight || 1280
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                setValue('thumbnailUrl', dataUrl, { shouldValidate: true })
                toast.success('Đã tự động trích xuất ảnh bìa tại 0.0001s từ video!')
            } catch {
                // Fallback nếu dính cross-origin: lưu đường dẫn fragment #t=0.0001
                setValue('thumbnailUrl', `${videoUrl}#t=0.0001`, { shouldValidate: true })
            } finally {
                setIsGeneratingThumbnail(false)
            }
        }

        video.onerror = () => {
            setValue('thumbnailUrl', `${videoUrl}#t=0.0001`, { shouldValidate: true })
            setIsGeneratingThumbnail(false)
        }
    }

    // Khi videoUrl thay đổi và user chưa chọn ảnh bìa riêng, tự động tạo ảnh bìa tại 0.0001s
    const handleVideoBlur = () => {
        if (watchedVideoUrl && !watchedThumbnailUrl) {
            generateThumbnailAtPointZeroZeroZeroOne(watchedVideoUrl)
        }
    }

    // 3.5. Handlers
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
        // Nếu user vẫn chưa có ảnh bìa, fallback mặc định là videoUrl#t=0.0001
        const finalThumbnail = data.thumbnailUrl || `${data.videoUrl}#t=0.0001`
        await createVideo({
            ...data,
            thumbnailUrl: finalThumbnail,
        })
        form.reset()
        onSuccess?.()
    }

    // 3.6. JSX Return
    return (
        <Card className="p-6 bg-card border-border shadow-md rounded-2xl max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Video className="size-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span>Đăng video bán hàng (Shoppable Video)</span>
                        <Sparkles className="size-4 text-primary animate-pulse" />
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Tải video sản phẩm, gắn tag giỏ hàng để người mua đặt hàng trực tiếp ngay trong video.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Tiêu đề video */}
                <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-semibold text-foreground">
                        Tiêu đề video <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="title"
                        placeholder="Ví dụ: Trải nghiệm Áo thun nam Basic Cotton 100% co giãn 4 chiều..."
                        {...register('title')}
                        className="rounded-xl border-border"
                    />
                    {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>

                {/* Đường dẫn video (HLS hoặc MP4) */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="videoUrl" className="text-xs font-semibold text-foreground">
                            Đường dẫn Video (HLS .m3u8 hoặc MP4) <span className="text-red-500">*</span>
                        </Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Gợi ý URL test nhanh cho seller dùng thử
                                setValue('videoUrl', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', {
                                    shouldValidate: true,
                                })
                                generateThumbnailAtPointZeroZeroZeroOne(
                                    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                                )
                            }}
                            className="h-6 text-[11px] text-primary hover:underline px-1"
                        >
                            Dùng video mẫu HLS
                        </Button>
                    </div>
                    <Input
                        id="videoUrl"
                        placeholder="https://example.com/video.m3u8 hoặc https://example.com/video.mp4"
                        {...register('videoUrl')}
                        onBlur={handleVideoBlur}
                        className="rounded-xl border-border font-mono text-xs"
                    />
                    {errors.videoUrl && <p className="text-xs text-red-500">{errors.videoUrl.message}</p>}
                </div>

                {/* Ảnh bìa Thumbnail (Tự động trích xuất frame tại 0.0001s hoặc nhập tùy chỉnh) */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="thumbnailUrl" className="text-xs font-semibold text-foreground">
                            Ảnh bìa Thumbnail (Mặc định tự động cắt tại 0.0001s)
                        </Label>
                        {watchedVideoUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => generateThumbnailAtPointZeroZeroZeroOne(watchedVideoUrl)}
                                disabled={isGeneratingThumbnail}
                                className="h-6 text-[11px] flex items-center gap-1 rounded-lg"
                            >
                                {isGeneratingThumbnail ? (
                                    <Spinner className="size-3 animate-spin" />
                                ) : (
                                    <Camera className="size-3" />
                                )}
                                Trích xuất tại 0.0001s
                            </Button>
                        )}
                    </div>
                    <Input
                        id="thumbnailUrl"
                        placeholder="Để trống hệ thống sẽ tự động dùng ảnh tại 0.0001s"
                        {...register('thumbnailUrl')}
                        className="rounded-xl border-border font-mono text-xs"
                    />
                    {watchedThumbnailUrl && (
                        <div className="mt-2 relative w-32 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
                            <Image
                                src={watchedThumbnailUrl}
                                alt="Thumbnail preview"
                                fill
                                sizes="128px"
                                className="object-cover"
                                unoptimized
                            />
                            <Badge className="absolute bottom-1 right-1 bg-black/70 text-[9px] px-1 py-0">
                                0.0001s
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Mô tả & Caption */}
                <div className="space-y-1.5">
                    <Label htmlFor="content" className="text-xs font-semibold text-foreground">
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

                {/* Hashtags */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Hashtags</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Nhập hashtag (vd: aothun, review)"
                            value={customHashtagInput}
                            onChange={(e) => setCustomHashtagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddHashtag()
                                }
                            }}
                            className="rounded-xl border-border h-9 text-xs"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddHashtag}
                            className="h-9 px-3 rounded-xl text-xs shrink-0"
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
                                    className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1 pr-1.5"
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

                {/* Chọn sản phẩm gắn kèm (Shoppable Product Tags) */}
                <div className="space-y-2 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <ShoppingBag className="size-3.5 text-primary" />
                                Sản phẩm gắn kèm ({watchedProductIds.length}/5) <span className="text-red-500">*</span>
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Chọn từ 1 đến 5 sản phẩm để hiển thị nút Mua ngay trên video.
                            </p>
                        </div>

                        {/* Dialog chọn sản phẩm */}
                        <Dialog open={isProductPickerOpen} onOpenChange={setIsProductPickerOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-xs flex items-center gap-1.5"
                                >
                                    <Plus className="size-3.5" />
                                    Chọn sản phẩm
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg bg-card border-border rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-base font-bold">
                                        Chọn sản phẩm gắn vào video
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Tích chọn tối đa 5 sản phẩm đang kinh doanh trong shop của bạn.
                                    </DialogDescription>
                                </DialogHeader>

                                {isLoadingProducts ? (
                                    <div className="py-8 flex justify-center">
                                        <Spinner className="size-6 text-primary animate-spin" />
                                    </div>
                                ) : (
                                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                        {shopProducts.map((p) => {
                                            const isSelected = watchedProductIds.includes(p.id)
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => toggleProductTag(p.id)}
                                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${
                                                        isSelected
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border hover:bg-muted/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="relative size-10 rounded-lg bg-muted overflow-hidden shrink-0 border">
                                                            {p.thumbnail ? (
                                                                <Image
                                                                    src={p.thumbnail}
                                                                    alt={p.name}
                                                                    fill
                                                                    sizes="40px"
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <ShoppingBag className="size-5 m-2.5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-foreground truncate">
                                                                {p.name}
                                                            </p>
                                                            {p.minPrice && (
                                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {p.minPrice.toLocaleString('vi-VN')} đ
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`size-5 rounded-md border flex items-center justify-center shrink-0 ${
                                                            isSelected
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-border'
                                                        }`}
                                                    >
                                                        {isSelected && <Check className="size-3" />}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {watchedProductIds.map((pid) => {
                                const prod = shopProducts.find((p) => p.id === pid)
                                return (
                                    <div
                                        key={pid}
                                        className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border text-xs"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <ShoppingBag className="size-3.5 text-primary shrink-0" />
                                            <span className="truncate font-medium">{prod?.name || pid}</span>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            type="button"
                                            onClick={() => toggleProductTag(pid)}
                                            className="size-6 text-muted-foreground hover:text-red-500 rounded-lg"
                                        >
                                            <Trash2 className="size-3" />
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

                {/* Submit Button */}
                <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <Button
                        type="submit"
                        disabled={isCreating}
                        className="rounded-xl px-6 font-bold shadow-md flex items-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <Spinner className="size-4 animate-spin" />
                                <span>Đang xuất bản...</span>
                            </>
                        ) : (
                            <>
                                <Film className="size-4" />
                                <span>Xuất bản video</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
