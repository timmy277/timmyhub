'use client'

import React, { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { CategoryItem, CreateCategoryInput } from '@timmyhub/contracts'
import { CATEGORY_TAB } from '@/constants'

import { createCategoryAction } from '../actions'
import { buildCategoryTabsHref } from '../category-tab-query'
import { CategoryForm } from './category-form'

interface CategoryCreatePanelProps {
    availableParents: CategoryItem[]
}

export function CategoryCreatePanel({ availableParents }: CategoryCreatePanelProps) {
    const t = useTranslations('categories')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (values: CreateCategoryInput) => {
        setIsSubmitting(true)
        try {
            const res = await createCategoryAction(values)
            if (res.ok) {
                toast.success(t('messages.createSuccessNamed', { name: res.data.name }))
                const href = buildCategoryTabsHref(pathname, searchParams, { tab: CATEGORY_TAB.LIST })
                router.push(href)
                router.refresh()
            } else {
                toast.error(res.message || t('messages.createFailed'))
            }
        } catch {
            toast.error(t('messages.createError'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        const href = buildCategoryTabsHref(pathname, searchParams, { tab: CATEGORY_TAB.LIST })
        router.push(href)
    }

    return (
        <div className="max-w-3xl mx-auto py-2">
            <CategoryForm
                mode="create"
                availableParents={availableParents}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                onCancel={handleCancel}
            />
        </div>
    )
}
