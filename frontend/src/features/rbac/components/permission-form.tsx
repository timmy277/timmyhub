'use client'

import { useCallback, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { CreatePermissionSchema } from '@timmyhub/contracts'

import { Button, Checkbox, FloatInput, ON_CARD_LABEL_CLASS } from '@/components'
import { RBAC_KIND, RBAC_TAB } from '@/constants'
import { useCreatePermission } from '@/hooks'
import { toFieldErrors } from '@/utils'

import { buildRbacTabCloseHref, parseRbacTabKeys, type RbacTabItem, withoutRbacTab } from '../rbac-tab-query'
import { getOpenRbacTabsSnapshot, writeOpenRbacTabs } from '../rbac-tabs-storage'

interface PermissionFormProps {
    actorId: string
}

// Form tạo quyền (chỉ có tạo — backend chưa có endpoint sửa permission). Validate bằng chính `CreatePermissionSchema`
// của `@timmyhub/contracts` (luật #15): tên quyền phải đúng dạng `module:resource:action[:any]`.
//
// Tên quyền được **ghép từ các phần** thay vì bắt người dùng gõ cả chuỗi: dạng `module:resource:action` rất dễ gõ sai
// (thiếu dấu hai chấm, viết hoa, khoảng trắng) mà sai thì regex của schema chặn ngay ở bước lưu — ghép sẵn thì không
// còn gì để gõ sai, và phần xem trước cho biết chính xác chuỗi sẽ được gửi đi.
// 7 trạng thái: mặc định · đang tải (nút lưu quay, khoá form) · rỗng (N/A) · lỗi (`fieldErrors` dưới từng ô, lỗi
// nghiệp vụ hiện toast ở hook) · không có quyền (tab không hiện — nơi gọi quyết định) · vô hiệu hoá (đang gửi) ·
// thành công (toast + tab tự đóng, bảng đã dựng lại qua `revalidatePath`).
export function PermissionForm({ actorId }: PermissionFormProps) {
    // ===== State =====
    const [values, setValues] = useState({ module: '', resource: '', action: '', displayName: '' })
    const [scopedToAny, setScopedToAny] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // ===== Hooks =====
    const t = useTranslations('rbac')
    const tApi = useTranslations('api')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

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
    // Hậu tố phạm vi `:any` (vd `identity:devices:list:any`) chỉ hợp lệ khi là `any` — schema chốt như vậy.
    const permissionName = [values.module, values.resource, values.action]
        .map((part) => part.trim())
        .filter((part) => part !== '')
        .join(':')
        .concat(scopedToAny ? ':any' : '')
    const namePreview = permissionName === '' ? t('permissionNamePreviewEmpty') : permissionName

    // ===== Handlers =====
    const setField = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => {
        setValues((previous) => ({ ...previous, [field]: event.target.value }))
    }

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const parsed = CreatePermissionSchema.safeParse({ name: permissionName, displayName: values.displayName })
        if (!parsed.success) {
            setFieldErrors(toFieldErrors(parsed.error.issues, tApi))
            return
        }
        setFieldErrors({})
        create.mutate(parsed.data)
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
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
                                name="module"
                                value={values.module}
                                onChange={setField('module')}
                                error={fieldErrors.name}
                                disabled={create.isPending}
                                className="font-mono"
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                            <FloatInput
                                label={t('fieldPermissionResource')}
                                name="resource"
                                value={values.resource}
                                onChange={setField('resource')}
                                disabled={create.isPending}
                                className="font-mono"
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                            <FloatInput
                                label={t('fieldPermissionAction')}
                                name="action"
                                value={values.action}
                                onChange={setField('action')}
                                disabled={create.isPending}
                                className="font-mono"
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                                checked={scopedToAny}
                                disabled={create.isPending}
                                onCheckedChange={(checked) => setScopedToAny(checked === true)}
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
                            name="displayName"
                            value={values.displayName}
                            onChange={setField('displayName')}
                            error={fieldErrors.displayName}
                            disabled={create.isPending}
                            labelClassName={ON_CARD_LABEL_CLASS}
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
