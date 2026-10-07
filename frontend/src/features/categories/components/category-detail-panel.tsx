'use client'

import React, { useState } from 'react'
import { CalendarIcon, LayersIcon, LinkIcon, PackageIcon, Trash2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import type { CategoryItem, CreateCategoryInput } from '@timmyhub/contracts'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog } from '@/components'
import { CATEGORY_TAB } from '@/constants'
import { formatTimestamp } from '@/utils'

import { deleteCategoryAction, updateCategoryAction } from '../actions'
import { buildCategoryTabsHref } from '../category-tab-query'
import { CategoryForm } from './category-form'

interface CategoryDetailPanelProps {
    id: string
    initialCategory: CategoryItem | null
    availableParents: CategoryItem[]
}

export function CategoryDetailPanel({ id, initialCategory, availableParents }: CategoryDetailPanelProps) {
    const t = useTranslations('categories')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pendingDelete, setPendingDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    if (!initialCategory) {
        return <div className="py-12 text-center text-muted-foreground text-xs">{t('noPermissionDesc')}</div>
    }

    const handleUpdate = async (values: CreateCategoryInput) => {
        setIsSubmitting(true)
        try {
            const res = await updateCategoryAction(id, values)
            if (res.ok) {
                toast.success(t('messages.updateSuccess'))
                router.refresh()
            } else {
                toast.error(res.message || 'Error')
            }
        } catch {
            toast.error('Error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteCategoryAction(id)
            if (res.ok) {
                toast.success(t('messages.deleteSuccess'))
                const href = buildCategoryTabsHref(pathname, searchParams, { tab: CATEGORY_TAB.LIST })
                router.push(href)
                router.refresh()
            } else {
                toast.error(res.message || 'Error')
            }
        } catch {
            toast.error('Error')
        } finally {
            setIsDeleting(false)
            setPendingDelete(false)
        }
    }

    const canDelete = (initialCategory.productCount ?? 0) === 0 && (initialCategory.childrenCount ?? 0) === 0

    return (
        <div className="max-w-4xl mx-auto space-y-6 py-2">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-border/60 bg-muted/20 shadow-none">
                    <CardContent className="p-3.5 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <PackageIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium">{t('columns.products')}</p>
                            <p className="text-sm font-bold text-foreground">{initialCategory.productCount ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/20 shadow-none">
                    <CardContent className="p-3.5 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <LayersIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium">{t('columns.children')}</p>
                            <p className="text-sm font-bold text-foreground">{initialCategory.childrenCount ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/20 shadow-none">
                    <CardContent className="p-3.5 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <LinkIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium">{t('columns.slug')}</p>
                            <p className="text-xs font-mono text-foreground truncate" title={initialCategory.slug}>
                                {initialCategory.slug}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/20 shadow-none">
                    <CardContent className="p-3.5 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <CalendarIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium">{t('columns.createdAt')}</p>
                            <p className="text-xs font-medium text-foreground">
                                {formatTimestamp(initialCategory.createdAt)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Form */}
            <CategoryForm
                mode="update"
                initialData={initialCategory}
                availableParents={availableParents}
                onSubmit={handleUpdate}
                isSubmitting={isSubmitting}
            />

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-destructive/5 shadow-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                        <Trash2Icon className="size-4" />
                        <span>{t('actions.delete')}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {t('messages.deleteConfirmDesc', { name: initialCategory.name })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-xs text-foreground font-medium">{t('messages.deleteConfirmTitle')}</p>
                        <p className="text-[11px] text-muted-foreground">
                            {canDelete ? t('deleteReady') : t('deleteBlocked')}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!canDelete}
                        onClick={() => setPendingDelete(true)}
                        className="text-xs font-semibold"
                    >
                        {t('actions.delete')}
                    </Button>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={pendingDelete}
                onOpenChange={setPendingDelete}
                title={t('messages.deleteConfirmTitle')}
                description={t('messages.deleteConfirmDesc', { name: initialCategory.name })}
                confirmLabel={isDeleting ? t('messages.deletingBtn') : t('messages.deleteConfirmBtn')}
                variant="destructive"
                onConfirm={handleDelete}
            />
        </div>
    )
}
