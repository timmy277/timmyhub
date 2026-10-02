'use client'

import { useCallback, type ReactNode } from 'react'
import { type Resolver, Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button, Checkbox, FloatInput, ON_CARD_LABEL_CLASS } from '@/components'
import { RBAC_KIND, RBAC_TAB } from '@/constants'
import { useCreatePermission } from '@/hooks'
import { PermissionFormSchema, type PermissionFormValues } from '@/schemas'
import { toFieldErrorMessage } from '@/utils'

import { buildRbacTabCloseHref, parseRbacTabKeys, type RbacTabItem, withoutRbacTab } from '../rbac-tab-query'
import { getOpenRbacTabsSnapshot, writeOpenRbacTabs } from '../rbac-tabs-storage'

interface PermissionFormProps {
    actorId: string
}

// Form tạo quyền (chỉ có tạo — backend chưa có endpoint sửa permission). Validate bằng schema
// `PermissionFormSchema` từ `@/schemas` theo chuẩn react-hook-form + zod.
export function PermissionForm({ actorId }: PermissionFormProps) {
    // ===== Hooks =====
    const t = useTranslations('rbac')
    const tApi = useTranslations('api')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<PermissionFormValues>({
        resolver: zodResolver(PermissionFormSchema) as Resolver<PermissionFormValues>,
        mode: 'onChange',
        defaultValues: {
            module: '',
            resource: '',
            action: '',
            scopedToAny: false,
            displayName: '',
        },
    })

    const moduleVal = useWatch({ control, name: 'module' }) ?? ''
    const resourceVal = useWatch({ control, name: 'resource' }) ?? ''
    const actionVal = useWatch({ control, name: 'action' }) ?? ''
    const scopedToAny = useWatch({ control, name: 'scopedToAny' }) ?? false

    const closeCurrentTab = useCallback(() => {
        const selfTab: RbacTabItem = { tab: RBAC_TAB.CREATE }
        const open = parseRbacTabKeys(
            RBAC_KIND.PERMISSIONS,
            JSON.parse(getOpenRbacTabsSnapshot(RBAC_KIND.PERMISSIONS, actorId)),
        )
        const href = buildRbacTabCloseHref(RBAC_KIND.PERMISSIONS, pathname, searchParams, selfTab, open)
        writeOpenRbacTabs(RBAC_KIND.PERMISSIONS, actorId, withoutRbacTab(open, selfTab))
        router.push(href)
    }, [actorId, pathname, router, searchParams])

    const create = useCreatePermission({ onSucceeded: closeCurrentTab })

    // ===== Derived =====
    const permissionName = [moduleVal, resourceVal, actionVal]
        .map((part) => part.trim())
        .filter((part) => part !== '')
        .join(':')
        .concat(scopedToAny ? ':any' : '')
    const namePreview = permissionName === '' ? t('permissionNamePreviewEmpty') : permissionName

    // ===== Handlers =====
    const onSubmit = (data: PermissionFormValues) => {
        const fullName = [data.module, data.resource, data.action]
            .map((part) => part.trim())
            .filter((part) => part !== '')
            .join(':')
            .concat(data.scopedToAny ? ':any' : '')

        create.mutate({
            name: fullName,
            displayName: data.displayName.trim(),
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
            <header className="flex flex-col gap-1 border-b pb-5">
                <h1 className="text-xl font-semibold tracking-tight">{t('permissionFormTitleCreate')}</h1>
                <p className="text-sm text-muted-foreground">{t('permissionFormDescriptionCreate')}</p>
            </header>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-6">
                    <FormSection title={t('permissionSectionKey')} description={t('permissionKeyDescription')}>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FloatInput
                                label={t('fieldPermissionModule')}
                                error={toFieldErrorMessage(errors.module?.message, tApi)}
                                reserveErrorSpace
                                disabled={create.isPending}
                                className="font-mono"
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('module')}
                            />
                            <FloatInput
                                label={t('fieldPermissionResource')}
                                error={toFieldErrorMessage(errors.resource?.message, tApi)}
                                reserveErrorSpace
                                disabled={create.isPending}
                                className="font-mono"
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('resource')}
                            />
                            <FloatInput
                                label={t('fieldPermissionAction')}
                                error={toFieldErrorMessage(errors.action?.message, tApi)}
                                reserveErrorSpace
                                disabled={create.isPending}
                                className="font-mono"
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('action')}
                            />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Controller
                                control={control}
                                name="scopedToAny"
                                render={({ field }) => (
                                    <Checkbox
                                        checked={field.value}
                                        disabled={create.isPending}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                    />
                                )}
                            />
                            {t('fieldPermissionScopeAny')}
                        </label>
                        <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground">{t('permissionNamePreview')}</p>
                            <p className="mt-1 break-all font-mono text-sm">{namePreview}</p>
                        </div>
                    </FormSection>

                    <FormSection title={t('permissionSectionInfo')} description={t('permissionInfoDescription')}>
                        <FloatInput
                            label={t('fieldPermissionDisplayName')}
                            error={toFieldErrorMessage(errors.displayName?.message, tApi)}
                            reserveErrorSpace
                            disabled={create.isPending}
                            labelClassName={ON_CARD_LABEL_CLASS}
                            {...register('displayName')}
                        />
                    </FormSection>
                </div>

                <aside className="h-fit rounded-xl border bg-muted/30 p-4">
                    <h2 className="text-sm font-semibold">{t('permissionFormSideTitle')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t('permissionFormSideCreate')}
                    </p>
                </aside>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-5">
                {create.isPending ? (
                    <Button type="button" variant="outline" disabled>
                        {t('cancel')}
                    </Button>
                ) : (
                    <Button type="button" variant="outline" onClick={closeCurrentTab}>
                        {t('cancel')}
                    </Button>
                )}
                <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? t('saving') : t('save')}
                </Button>
            </div>
        </form>
    )
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <div>
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-col gap-4">{children}</div>
        </section>
    )
}
