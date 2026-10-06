'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCheck, Film, Loader2, Package, Plus, RefreshCw, Trash2, UploadCloud, X, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useUploadMedia } from '@/hooks'
import { CreateProductInputSchema } from '@timmyhub/contracts'
import type {
    CreateProductInput,
    CreateProductOptionInput,
    CreateProductVariantInput,
    MediaAsset,
} from '@timmyhub/contracts'

import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Textarea,
} from '@/components'
import { QUERY_KEY } from '@/constants'

import { createProductAction, listCategoriesAction } from '../actions'

interface CreateProductModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSucceeded: () => void
    inline?: boolean
}

type OptionGroupState = {
    name: string
    values: string[]
    currentValueInput: string
}

type VariantOverride = {
    price?: number
    compareAtPrice?: number | null
    stock?: number
    sku?: string
}

export function CreateProductModal({ open, onOpenChange, onSucceeded, inline = false }: CreateProductModalProps) {
    const t = useTranslations('products.dialog')
    const tMsg = useTranslations('products.messages')

    // React Hook Form with Zod Schema validation
    const form = useForm<CreateProductInput>({
        resolver: zodResolver(CreateProductInputSchema) as never,
        defaultValues: {
            name: '',
            categoryId: '',
            description: '',
            images: [],
            videos: [],
            options: [],
            variants: [],
            isDraft: false,
        },
    })

    // Fetch categories with useQuery and standard QUERY_KEY
    const { data: categories = [] } = useQuery({
        queryKey: QUERY_KEY.CATEGORIES.LIST,
        queryFn: async () => {
            const res = await listCategoriesAction()
            return res.ok ? res.data : []
        },
        enabled: open || inline,
    })

    // Auto set default category when loaded
    useEffect(() => {
        if (!form.getValues('categoryId') && categories.length > 0 && categories[0]?.id) {
            form.setValue('categoryId', categories[0].id)
        }
    }, [categories, form])

    // Media (Images & Videos)
    const [images, setImages] = useState<string[]>([])
    const [videos, setVideos] = useState<string[]>([])
    const [mediaUrlInput, setMediaUrlInput] = useState('')
    const [mediaTypeInput, setMediaTypeInput] = useState<'auto' | 'image' | 'video'>('auto')
    const [isUploadingMedia, setIsUploadingMedia] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadMediaMutation = useUploadMedia()

    // Variants Mode
    const [hasVariants, setHasVariants] = useState(false)

    // Single Variant Fields
    const [singlePrice, setSinglePrice] = useState<number>(100000)
    const [singleComparePrice, setSingleComparePrice] = useState<string>('')
    const [singleStock, setSingleStock] = useState<number>(50)
    const [singleWeight, setSingleWeight] = useState<number>(200)
    const [singleSku, setSingleSku] = useState('')

    // Multi-Option State
    const [optionGroups, setOptionGroups] = useState<OptionGroupState[]>([
        { name: 'Màu sắc', values: ['Đen', 'Trắng'], currentValueInput: '' },
    ])

    // Overrides for generated variant matrix
    const [variantOverrides, setVariantOverrides] = useState<Record<string, VariantOverride>>({})

    // Batch Apply for Variants Matrix
    const [batchPrice, setBatchPrice] = useState<string>('')
    const [batchComparePrice, setBatchComparePrice] = useState<string>('')
    const [batchStock, setBatchStock] = useState<string>('')
    const [batchSkuPrefix, setBatchSkuPrefix] = useState<string>('')

    const [submitting, setSubmitting] = useState(false)

    // Derived variants matrix via useMemo
    const variantsMatrix = useMemo(() => {
        if (!hasVariants) return []

        const validGroups = optionGroups.filter((g) => g.name.trim() && g.values.length > 0)
        if (validGroups.length === 0) return []

        function cartesian(groups: Array<{ name: string; values: string[] }>): Array<Record<string, string>> {
            if (groups.length === 0) return [{}]
            const [first, ...rest] = groups
            const restCombos = cartesian(rest)
            const result: Array<Record<string, string>> = []
            for (const val of first!.values) {
                for (const r of restCombos) {
                    result.push({ [first!.name]: val, ...r })
                }
            }
            return result
        }

        const combos = cartesian(validGroups)
        return combos.map((combo) => {
            const label = Object.values(combo).join(' - ')
            const key = Object.entries(combo)
                .map(([k, v]) => `${k}:${v}`)
                .join('|')
            const override = variantOverrides[key]

            return {
                key,
                optionValues: combo,
                label,
                price: override?.price ?? singlePrice,
                compareAtPrice: override?.compareAtPrice ?? null,
                stock: override?.stock ?? singleStock,
                sku: override?.sku || '',
                weightGram: 200,
            }
        })
    }, [hasVariants, optionGroups, singlePrice, singleStock, variantOverrides])

    const processUploadedAssets = (uploadedAssets: MediaAsset[]) => {
        const newImages: string[] = []
        const newVideos: string[] = []

        for (const asset of uploadedAssets) {
            const url = asset.originalUrl || asset.hlsMasterUrl
            if (!url) continue

            if (asset.type === 'VIDEO') {
                newVideos.push(url)
            } else {
                newImages.push(url)
            }
        }

        let addedImagesCount = 0
        let addedVideosCount = 0

        if (newImages.length > 0) {
            setImages((prev) => {
                const available = 10 - prev.length
                if (available <= 0) {
                    toast.error('Đã đạt tối đa 10 hình ảnh.')
                    return prev
                }
                const toAdd = newImages.slice(0, available)
                addedImagesCount = toAdd.length
                return [...prev, ...toAdd]
            })
        }

        if (newVideos.length > 0) {
            setVideos((prev) => {
                const available = 3 - prev.length
                if (available <= 0) {
                    toast.error('Đã đạt tối đa 3 video.')
                    return prev
                }
                const toAdd = newVideos.slice(0, available)
                addedVideosCount = toAdd.length
                return [...prev, ...toAdd]
            })
        }

        toast.success(`Đã thêm ${addedImagesCount} ảnh và ${addedVideosCount} video.`)
    }

    const handleUploadFiles = async (files: File[]) => {
        if (files.length === 0) return

        setIsUploadingMedia(true)
        try {
            const assets = await uploadMediaMutation.mutateAsync({
                files,
                ownerType: 'PRODUCT',
            })
            processUploadedAssets(assets)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Tải lên thất bại'
            toast.error(message)
        } finally {
            setIsUploadingMedia(false)
        }
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            void handleUploadFiles(files)
        }
        e.target.value = ''
    }

    const handleAddMediaUrl = () => {
        const url = mediaUrlInput.trim()
        if (!url) return

        const isVideo =
            mediaTypeInput === 'video' ||
            (mediaTypeInput === 'auto' && (/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url) || url.includes('/video/')))

        if (isVideo) {
            if (videos.includes(url)) {
                toast.error('Video này đã có trong danh sách.')
                return
            }
            if (videos.length >= 3) {
                toast.error('Tối đa 3 video cho mỗi sản phẩm.')
                return
            }
            setVideos([...videos, url])
            toast.success('Đã thêm 1 video')
        } else {
            if (images.includes(url)) {
                toast.error('Ảnh này đã có trong danh sách.')
                return
            }
            if (images.length >= 10) {
                toast.error('Tối đa 10 hình ảnh cho mỗi sản phẩm.')
                return
            }
            setImages([...images, url])
            toast.success('Đã thêm 1 ảnh')
        }
        setMediaUrlInput('')
    }

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

    const handleRemoveVideo = (index: number) => {
        setVideos(videos.filter((_, i) => i !== index))
    }

    // Add Option Value chip
    const handleAddOptionValue = (groupIndex: number) => {
        const grp = optionGroups[groupIndex]
        if (!grp) return
        const val = grp.currentValueInput.trim()
        if (!val) return
        if (grp.values.includes(val)) {
            toast.error('Giá trị này đã tồn tại trong nhóm phân loại.')
            return
        }
        const updated = [...optionGroups]
        updated[groupIndex] = {
            ...grp,
            values: [...grp.values, val],
            currentValueInput: '',
        }
        setOptionGroups(updated)
    }

    const handleRemoveOptionValue = (groupIndex: number, valIndex: number) => {
        const grp = optionGroups[groupIndex]
        if (!grp) return
        const updated = [...optionGroups]
        updated[groupIndex] = {
            ...grp,
            values: grp.values.filter((_, i) => i !== valIndex),
        }
        setOptionGroups(updated)
    }

    const handleAddOptionGroup = () => {
        if (optionGroups.length >= 3) {
            toast.error('Tối đa 3 nhóm phân loại (ví dụ: Màu sắc, Size, Chất liệu).')
            return
        }
        setOptionGroups([
            ...optionGroups,
            { name: `Phân loại ${optionGroups.length + 1}`, values: [], currentValueInput: '' },
        ])
    }

    const handleRemoveOptionGroup = (index: number) => {
        setOptionGroups(optionGroups.filter((_, i) => i !== index))
    }

    const handleBatchApply = () => {
        const p = batchPrice ? Number(batchPrice) : undefined
        const cp = batchComparePrice ? Number(batchComparePrice) : batchComparePrice === '' ? undefined : null
        const s = batchStock ? Number(batchStock) : undefined

        if (p === undefined && cp === undefined && s === undefined && !batchSkuPrefix.trim()) {
            toast.warning('Vui lòng nhập ít nhất Giá bán, Giá gốc, Tồn kho hoặc Tiền tố SKU để áp dụng.')
            return
        }

        setVariantOverrides((prev) => {
            const next = { ...prev }
            for (const vm of variantsMatrix) {
                const current = next[vm.key] || {}
                let skuVal = current.sku
                if (batchSkuPrefix.trim()) {
                    const comboParts = Object.values(vm.optionValues)
                        .map((v) =>
                            v
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/đ/g, 'd')
                                .replace(/Đ/g, 'D')
                                .replace(/[^a-zA-Z0-9]/g, '')
                                .toUpperCase(),
                        )
                        .filter(Boolean)
                    skuVal = `${batchSkuPrefix.trim().toUpperCase()}-${comboParts.join('-')}`
                }

                next[vm.key] = {
                    ...current,
                    ...(p !== undefined ? { price: p } : {}),
                    ...(batchComparePrice !== '' ? { compareAtPrice: cp } : {}),
                    ...(s !== undefined ? { stock: s } : {}),
                    ...(skuVal !== undefined ? { sku: skuVal } : {}),
                }
            }
            return next
        })

        toast.success(`Đã áp dụng thông tin hàng loạt cho ${variantsMatrix.length} biến thể!`)
    }

    // React Hook Form submission handler
    const onSubmit = async (values: CreateProductInput) => {
        setSubmitting(true)
        try {
            const res = await createProductAction(values)
            if (res.ok) {
                toast.success(values.isDraft ? tMsg('createDraftSuccess') : tMsg('createSuccess'))
                form.reset()
                setImages([])
                setVideos([])
                setOptionGroups([
                    { name: 'Màu sắc', values: ['Đen', 'Trắng'], currentValueInput: '' },
                    { name: 'Kích thước', values: ['S', 'M', 'L'], currentValueInput: '' },
                ])
                setVariantOverrides({})
                onOpenChange(false)
                onSucceeded()
            } else {
                toast.error(tMsg('createFailed', { error: res.message || res.code }))
            }
        } catch {
            toast.error(tMsg('createFailed', { error: '' }))
        } finally {
            setSubmitting(false)
        }
    }

    const handleFormSubmit = (isDraft: boolean) => {
        let options: CreateProductOptionInput[] = []
        let variants: CreateProductVariantInput[] = []

        if (!hasVariants) {
            if (singlePrice <= 0) {
                toast.error('Giá bán phải lớn hơn 0.')
                return
            }
            variants = [
                {
                    price: singlePrice,
                    compareAtPrice: singleComparePrice ? Number(singleComparePrice) : null,
                    stock: singleStock,
                    weightGram: singleWeight,
                    sku: singleSku || undefined,
                    isDefault: true,
                },
            ]
        } else {
            const validGroups = optionGroups.filter((g) => g.name.trim() && g.values.length > 0)
            if (validGroups.length === 0 || variantsMatrix.length === 0) {
                toast.error('Vui lòng nhập đầy đủ nhóm phân loại và giá trị biến thể.')
                return
            }

            options = validGroups.map((g) => ({
                name: g.name.trim(),
                values: g.values,
            }))

            variants = variantsMatrix.map((vm, idx) => ({
                sku: vm.sku || undefined,
                optionValues: vm.optionValues,
                price: vm.price,
                compareAtPrice: vm.compareAtPrice,
                stock: vm.stock,
                weightGram: vm.weightGram,
                isDefault: idx === 0,
            }))
        }

        form.setValue('options', options)
        form.setValue('variants', variants)
        form.setValue('images', images)
        form.setValue('videos', videos)
        form.setValue('isDraft', isDraft)

        void form.handleSubmit(
            (data) => onSubmit(data as CreateProductInput),
            (errors) => {
                const firstError = Object.values(errors)[0]
                if (firstError?.message) {
                    toast.error(String(firstError.message))
                } else {
                    toast.error('Vui lòng kiểm tra lại thông tin sản phẩm đã nhập.')
                }
            },
        )()
    }

    const actionsBlock = (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-xl text-xs font-semibold"
                onClick={() => handleFormSubmit(true)}
                disabled={submitting}
            >
                {t('saveDraft')}
            </Button>
            <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-white"
                onClick={() => handleFormSubmit(false)}
                disabled={submitting}
            >
                {submitting ? (
                    <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>{t('submitting')}</span>
                    </>
                ) : (
                    <span>{t('submitReview')}</span>
                )}
            </Button>
        </div>
    )

    const formContent = (
        <div className="space-y-6 py-4">
            {/* 1. Basic Info Section */}
            <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    1. Thông tin cơ bản
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t('nameLabel')}</label>
                        <Input
                            {...form.register('name')}
                            placeholder={t('namePlaceholder')}
                            className="text-xs rounded-xl"
                        />
                        {form.formState.errors.name && (
                            <p className="text-[11px] text-destructive font-medium mt-1">
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t('categoryLabel')}</label>
                        <Controller
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <Select value={field.value || categories[0]?.id || ''} onValueChange={field.onChange}>
                                    <SelectTrigger className="text-xs rounded-xl">
                                        <SelectValue placeholder={t('categorySelect')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.categoryId && (
                            <p className="text-[11px] text-destructive font-medium mt-1">
                                {form.formState.errors.categoryId.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">{t('descLabel')}</label>
                    <Textarea
                        {...form.register('description')}
                        placeholder={t('descPlaceholder')}
                        className="text-xs rounded-xl min-h-[90px] resize-none"
                    />
                    {form.formState.errors.description && (
                        <p className="text-[11px] text-destructive font-medium mt-1">
                            {form.formState.errors.description.message}
                        </p>
                    )}
                </div>
            </div>

            {/* 2. Media Upload & Gallery Section (Images & Videos) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Film className="size-3.5 text-primary" />
                            <span>Hình ảnh & Video sản phẩm</span>
                        </label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Tải ảnh và video chung để khách hàng có trải nghiệm mua sắm sống động nhất.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[11px] font-medium">
                            {images.length}/10 ảnh
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] font-medium">
                            {videos.length}/3 video
                        </Badge>
                    </div>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleFileInputChange}
                />

                {/* Drag and Drop Upload Zone */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setIsDragOver(false)
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            void handleUploadFiles(Array.from(e.dataTransfer.files))
                        }
                    }}
                    onClick={() => {
                        if (!isUploadingMedia) {
                            fileInputRef.current?.click()
                        }
                    }}
                    className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center ${
                        isDragOver
                            ? 'border-primary bg-primary/10 shadow-inner'
                            : 'border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-primary/50'
                    }`}
                >
                    {isUploadingMedia ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <Loader2 className="size-8 text-primary animate-spin" />
                            <p className="text-xs font-semibold text-foreground">Đang tải tệp tin lên máy chủ...</p>
                            <p className="text-[11px] text-muted-foreground">Vui lòng chờ trong giây lát</p>
                        </div>
                    ) : (
                        <>
                            <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <UploadCloud className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-foreground">
                                    Nhấp để chọn tệp hoặc kéo thả ảnh & video vào đây
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Hỗ trợ JPG, PNG, WEBP (tối đa 10 ảnh) & MP4, WEBM, MOV (tối đa 3 video)
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Direct URL input fallback */}
                <div className="flex gap-2">
                    <Select
                        value={mediaTypeInput}
                        onValueChange={(val: 'auto' | 'image' | 'video') => setMediaTypeInput(val)}
                    >
                        <SelectTrigger className="w-28 text-xs rounded-xl h-9 shrink-0">
                            <SelectValue placeholder="Loại" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto">Tự nhận diện</SelectItem>
                            <SelectItem value="image">Ảnh</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        value={mediaUrlInput}
                        onChange={(e) => setMediaUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddMediaUrl()
                            }
                        }}
                        placeholder="Hoặc dán liên kết URL ảnh / video trực tiếp..."
                        className="text-xs rounded-xl flex-1 h-9"
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddMediaUrl}
                        className="rounded-xl text-xs gap-1.5 shrink-0 h-9"
                    >
                        <Plus className="size-3.5" />
                        <span>Thêm URL</span>
                    </Button>
                </div>

                {/* Media Preview: Images Grid */}
                {images.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Danh sách ảnh ({images.length}/10):
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {images.map((img, idx) => (
                                <div
                                    key={idx}
                                    className="relative group rounded-xl overflow-hidden border border-border/80 bg-muted/30 aspect-square"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                    {idx === 0 && (
                                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold shadow-sm">
                                            Ảnh bìa
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(idx)}
                                        className="absolute top-1.5 right-1.5 size-6 rounded-md bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Media Preview: Videos Grid */}
                {videos.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Danh sách video ({videos.length}/3):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {videos.map((vid, idx) => (
                                <div
                                    key={idx}
                                    className="relative group rounded-xl overflow-hidden border border-border/80 bg-black/60 aspect-video flex items-center justify-center"
                                >
                                    <video
                                        src={vid}
                                        controls
                                        preload="metadata"
                                        className="w-full h-full object-contain"
                                    />
                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-sm pointer-events-none">
                                        Video #{idx + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveVideo(idx)}
                                        className="absolute top-1.5 right-1.5 size-6 rounded-md bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 z-10"
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {form.formState.errors.images && (
                    <p className="text-[11px] text-destructive font-medium mt-1">
                        {form.formState.errors.images.message}
                    </p>
                )}
            </div>

            {/* 3. Variants Toggle & Matrix */}
            <div className="space-y-4 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            2. Phân loại hàng & Giá bán
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('hasVariants')}</p>
                    </div>
                    <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
                </div>

                {!hasVariants ? (
                    /* Single Variant Form */
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl border border-border/60 bg-muted/20">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                                {t('singleVariantPrice')}
                            </label>
                            <Input
                                type="number"
                                min={1000}
                                value={singlePrice}
                                onChange={(e) => setSinglePrice(Number(e.target.value))}
                                className="text-xs rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                                {t('singleVariantCompare')}
                            </label>
                            <Input
                                type="number"
                                value={singleComparePrice}
                                onChange={(e) => setSingleComparePrice(e.target.value)}
                                placeholder="Để trống"
                                className="text-xs rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                                {t('singleVariantStock')}
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={singleStock}
                                onChange={(e) => setSingleStock(Number(e.target.value))}
                                className="text-xs rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">
                                {t('singleVariantWeight')}
                            </label>
                            <Input
                                type="number"
                                min={1}
                                value={singleWeight}
                                onChange={(e) => setSingleWeight(Number(e.target.value))}
                                className="text-xs rounded-xl"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">Mã SKU</label>
                            <Input
                                value={singleSku}
                                onChange={(e) => setSingleSku(e.target.value)}
                                placeholder="Tự động"
                                className="text-xs rounded-xl"
                            />
                        </div>
                    </div>
                ) : (
                    /* Multi-Option Configuration */
                    <div className="space-y-4">
                        {optionGroups.map((group, gIdx) => (
                            <div key={gIdx} className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <Input
                                        value={group.name}
                                        onChange={(e) => {
                                            const updated = [...optionGroups]
                                            updated[gIdx] = { ...group, name: e.target.value }
                                            setOptionGroups(updated)
                                        }}
                                        placeholder={t('optionNameLabel')}
                                        className="text-xs font-semibold max-w-[200px] rounded-xl"
                                    />
                                    {optionGroups.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveOptionGroup(gIdx)}
                                            className="size-8 p-0 text-muted-foreground hover:text-rose-500 rounded-lg"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Value chips */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {group.values.map((val, vIdx) => (
                                        <Badge
                                            key={vIdx}
                                            variant="secondary"
                                            className="rounded-lg text-xs gap-1.5 py-1 px-2.5 font-normal bg-card border border-border/80"
                                        >
                                            <span>{val}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOptionValue(gIdx, vIdx)}
                                                className="hover:text-rose-500"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={group.currentValueInput}
                                            onChange={(e) => {
                                                const updated = [...optionGroups]
                                                updated[gIdx] = { ...group, currentValueInput: e.target.value }
                                                setOptionGroups(updated)
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleAddOptionValue(gIdx)
                                                }
                                            }}
                                            placeholder="Thêm giá trị (nhấn Enter)"
                                            className="text-xs h-8 w-44 rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddOptionValue(gIdx)}
                                            className="h-8 px-2.5 rounded-lg text-xs"
                                        >
                                            <Plus className="size-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {optionGroups.length < 3 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOptionGroup}
                                className="rounded-xl text-xs gap-1.5"
                            >
                                <Plus className="size-3.5" />
                                <span>{t('addOptionGroup')}</span>
                            </Button>
                        )}

                        {/* Variants Matrix Table & Batch Apply */}
                        {variantsMatrix.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="p-3.5 rounded-2xl border border-primary/25 bg-primary/5 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Zap className="size-3.5 text-primary" />
                                            Áp dụng hàng loạt cho tất cả {variantsMatrix.length} biến thể
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            Điền nhanh giá, tồn kho & SKU cho mọi biến thể chỉ với 1 click
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-muted-foreground">
                                                Giá bán chung (đ)
                                            </label>
                                            <Input
                                                type="number"
                                                min={1000}
                                                value={batchPrice}
                                                onChange={(e) => setBatchPrice(e.target.value)}
                                                placeholder="VD: 150000"
                                                className="h-8 text-xs rounded-lg bg-card"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-muted-foreground">
                                                Giá gốc so sánh (đ)
                                            </label>
                                            <Input
                                                type="number"
                                                value={batchComparePrice}
                                                onChange={(e) => setBatchComparePrice(e.target.value)}
                                                placeholder="VD: 200000"
                                                className="h-8 text-xs rounded-lg bg-card"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-muted-foreground">
                                                Tồn kho chung
                                            </label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={batchStock}
                                                onChange={(e) => setBatchStock(e.target.value)}
                                                placeholder="VD: 50"
                                                className="h-8 text-xs rounded-lg bg-card"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-muted-foreground">
                                                Tiền tố SKU
                                            </label>
                                            <Input
                                                value={batchSkuPrefix}
                                                onChange={(e) => setBatchSkuPrefix(e.target.value)}
                                                placeholder="VD: POLO"
                                                className="h-8 text-xs rounded-lg bg-card"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-0.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleBatchApply}
                                            className="h-8 text-xs rounded-xl font-bold gap-1.5 bg-primary text-white hover:bg-primary/90"
                                        >
                                            <CheckCheck className="size-3.5" />
                                            <span>Áp dụng cho tất cả biến thể</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        {t('variantsTable')} ({variantsMatrix.length} biến thể)
                                    </label>
                                    <div className="border border-border/70 rounded-xl overflow-hidden overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Phiên bản</th>
                                                    <th className="px-3 py-2 text-left">Giá bán *</th>
                                                    <th className="px-3 py-2 text-left">Giá gốc</th>
                                                    <th className="px-3 py-2 text-left">Tồn kho *</th>
                                                    <th className="px-3 py-2 text-left">Mã SKU</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {variantsMatrix.map((vm, vmIdx) => (
                                                    <tr key={vmIdx} className="hover:bg-muted/30">
                                                        <td className="px-3 py-2 font-medium text-foreground">
                                                            {vm.label}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={vm.price}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value)
                                                                    setVariantOverrides((prev) => ({
                                                                        ...prev,
                                                                        [vm.key]: { ...prev[vm.key], price: val },
                                                                    }))
                                                                }}
                                                                className="h-8 text-xs w-28 rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={vm.compareAtPrice ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                        ? Number(e.target.value)
                                                                        : null
                                                                    setVariantOverrides((prev) => ({
                                                                        ...prev,
                                                                        [vm.key]: {
                                                                            ...prev[vm.key],
                                                                            compareAtPrice: val,
                                                                        },
                                                                    }))
                                                                }}
                                                                placeholder="--"
                                                                className="h-8 text-xs w-28 rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                value={vm.stock}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value)
                                                                    setVariantOverrides((prev) => ({
                                                                        ...prev,
                                                                        [vm.key]: { ...prev[vm.key], stock: val },
                                                                    }))
                                                                }}
                                                                className="h-8 text-xs w-24 rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                value={vm.sku}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    setVariantOverrides((prev) => ({
                                                                        ...prev,
                                                                        [vm.key]: { ...prev[vm.key], sku: val },
                                                                    }))
                                                                }}
                                                                placeholder="Tự động"
                                                                className="h-8 text-xs w-28 rounded-lg"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )

    if (inline) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto py-2">
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2.5 text-primary">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground">{t('createTitle')}</h3>
                            <p className="text-xs text-muted-foreground">{t('createDesc')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            {t('cancel')}
                        </Button>
                        {actionsBlock}
                    </div>
                </div>

                {formContent}

                <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t('cancel')}
                    </Button>
                    {actionsBlock}
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl rounded-2xl p-6">
                <DialogHeader className="space-y-1.5 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2.5 text-primary">
                        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="size-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground">{t('createTitle')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">{t('createDesc')}</DialogDescription>
                </DialogHeader>

                {formContent}

                <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/60">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t('cancel')}
                    </Button>
                    {actionsBlock}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
