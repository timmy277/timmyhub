'use client'

import React, { useRef } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderTreeIcon, ImageIcon, Loader2Icon, SparklesIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { CategoryItem, CreateCategoryInput } from '@timmyhub/contracts'
import { CreateCategoryInputSchema } from '@timmyhub/contracts'

import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FloatInput,
    FloatTextarea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
} from '@/components'
import { useUploadMedia } from '@/hooks'

interface CategoryFormProps {
    initialData?: CategoryItem
    availableParents: CategoryItem[]
    onSubmit: (values: CreateCategoryInput) => Promise<void>
    isSubmitting: boolean
    mode: 'create' | 'update'
    onCancel?: () => void
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function CategoryForm({
    initialData,
    availableParents,
    onSubmit,
    isSubmitting,
    mode,
    onCancel,
}: CategoryFormProps) {
    const t = useTranslations('categories')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadMutation = useUploadMedia()
    const isUploading = uploadMutation.isPending

    const form = useForm<CreateCategoryInput>({
        resolver: zodResolver(CreateCategoryInputSchema) as unknown as Resolver<CreateCategoryInput>,
        defaultValues: {
            name: initialData?.name ?? '',
            slug: initialData?.slug ?? '',
            parentId: initialData?.parentId ?? null,
            image: initialData?.image ?? '',
            description: initialData?.description ?? '',
            position: initialData?.position ?? 0,
            isActive: initialData?.isActive ?? true,
        },
    })

    const watchName = useWatch({ control: form.control, name: 'name' })
    const watchImage = useWatch({ control: form.control, name: 'image' })

    const handleGenerateSlug = () => {
        if (!watchName) {
            toast.warning(t('messages.slugNeedName'))
            return
        }
        const generated = slugify(watchName)
        form.setValue('slug', generated, { shouldValidate: true })
        toast.success(t('messages.slugGenerated', { slug: generated }))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const uploaded = await uploadMutation.mutateAsync({
                files: [file],
                ownerType: 'GENERAL',
            })
            const fileUrl = uploaded?.[0]?.originalUrl || uploaded?.[0]?.thumbnailUrl
            if (fileUrl) {
                form.setValue('image', fileUrl, { shouldValidate: true })
                toast.success(t('messages.uploadSuccess'))
            }
        } catch {
            toast.error(t('messages.uploadFailed'))
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Filter out current category from potential parents in update mode to prevent cyclic parenting
    const parentOptions = availableParents.filter(
        (p) => !initialData || (p.id !== initialData.id && p.parentId !== initialData.id),
    )

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <FolderTreeIcon className="size-4 text-primary" />
                        <span>{t('form.basicInfo')}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {mode === 'create' ? t('createTitle') : `${t('detailTitle')}: ${initialData?.name}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Tên danh mục */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <span>{t('form.name')}</span>
                            <span className="text-destructive">*</span>
                        </label>
                        <FloatInput
                            {...form.register('name')}
                            label={t('form.name')}
                            placeholder={t('form.namePlaceholder')}
                            className="text-xs rounded-lg"
                        />
                        {form.formState.errors.name && (
                            <p className="text-[11px] text-destructive font-medium">
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Slug */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <span>{t('form.slug')}</span>
                                <span className="text-muted-foreground font-normal">{t('form.optional')}</span>
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerateSlug}
                                className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary/90"
                            >
                                <SparklesIcon className="size-3" />
                                <span>{t('form.generateSlug')}</span>
                            </Button>
                        </div>
                        <FloatInput
                            {...form.register('slug')}
                            label={t('form.slug')}
                            placeholder="dien-thoai-thiet-bi-di-dong"
                            className="text-xs rounded-lg font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">{t('form.slugHelp')}</p>
                        {form.formState.errors.slug && (
                            <p className="text-[11px] text-destructive font-medium">
                                {form.formState.errors.slug.message}
                            </p>
                        )}
                    </div>

                    {/* Danh mục cha */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t('form.parent')}</label>
                        <Controller
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <Select
                                    value={field.value || 'root'}
                                    onValueChange={(val) => field.onChange(val === 'root' ? null : val)}
                                >
                                    <SelectTrigger className="text-xs rounded-lg">
                                        <SelectValue placeholder={t('form.parentPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="root" className="font-semibold text-primary">
                                            {t('form.parentRoot')}
                                        </SelectItem>
                                        {parentOptions.map((parent) => (
                                            <SelectItem key={parent.id} value={parent.id}>
                                                {parent.parentName ? `${parent.parentName} > ` : ''}
                                                {parent.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        <p className="text-[10px] text-muted-foreground">{t('form.parentHelp')}</p>
                    </div>

                    {/* Hình ảnh danh mục */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground">{t('form.image')}</label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40 flex items-center justify-center">
                                {watchImage ? (
                                    <>
                                        <Image
                                            src={watchImage}
                                            alt="Category preview"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                        <button
                                            type="button"
                                            onClick={() => form.setValue('image', '')}
                                            className="absolute top-1 right-1 size-4 rounded-full bg-background/80 text-foreground flex items-center justify-center hover:bg-destructive hover:text-white"
                                            title={t('form.deleteImage')}
                                        >
                                            <XIcon className="size-3" />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="size-6 text-muted-foreground/50" />
                                )}
                            </div>

                            <div className="flex-1 space-y-1.5 w-full">
                                <div className="flex items-center gap-2">
                                    <FloatInput
                                        {...form.register('image')}
                                        label={t('form.image')}
                                        placeholder="https://example.com/category-icon.png"
                                        className="text-xs rounded-lg flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="h-9 px-3 gap-1.5 text-xs shrink-0"
                                    >
                                        {isUploading ? (
                                            <Loader2Icon className="size-3.5 animate-spin" />
                                        ) : (
                                            <UploadCloudIcon className="size-3.5" />
                                        )}
                                        <span>{t('form.uploadImage')}</span>
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                {form.formState.errors.image && (
                                    <p className="text-[11px] text-destructive font-medium">
                                        {form.formState.errors.image.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">{t('form.description')}</label>
                        <FloatTextarea
                            {...form.register('description')}
                            label={t('form.description')}
                            placeholder={t('form.descPlaceholder')}
                            className="text-xs rounded-lg min-h-[80px]"
                            maxLength={500}
                        />
                        {form.formState.errors.description && (
                            <p className="text-[11px] text-destructive font-medium">
                                {form.formState.errors.description.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                        {/* Vị trí hiển thị */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">{t('form.position')}</label>
                            <FloatInput
                                type="number"
                                min={0}
                                {...form.register('position', { valueAsNumber: true })}
                                label={t('form.position')}
                                className="text-xs rounded-lg"
                            />
                            <p className="text-[10px] text-muted-foreground">{t('form.positionHelp')}</p>
                        </div>

                        {/* Trạng thái hoạt động */}
                        <div className="flex flex-col justify-center space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">{t('form.isActive')}</label>
                            <div className="flex items-center gap-3 h-9">
                                <Controller
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                id="category-is-active"
                                            />
                                            <label
                                                htmlFor="category-is-active"
                                                className="text-xs font-medium cursor-pointer"
                                            >
                                                {field.value ? t('form.activeLabel') : t('form.inactiveLabel')}
                                            </label>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="text-xs"
                    >
                        {t('form.cancel')}
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting} className="text-xs font-semibold gap-1.5 min-w-[120px]">
                    {isSubmitting && <Loader2Icon className="size-3.5 animate-spin" />}
                    <span>{mode === 'create' ? t('form.submitCreate') : t('form.submitUpdate')}</span>
                </Button>
            </div>
        </form>
    )
}
