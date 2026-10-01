'use client'

import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDownIcon, Layers3Icon } from 'lucide-react'

import type { PermissionSummary, RoleDetail } from '@timmyhub/contracts'
import { CreateRoleSchema, UpdateRoleSchema } from '@timmyhub/contracts'

import {
    Button,
    Checkbox,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    FloatInput,
    FloatTextarea,
    ON_CARD_LABEL_CLASS,
} from '@/components'
import { Badge } from '@/components/ui'
import { RBAC_KIND, RBAC_TAB } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { useCreateRole, useUpdateRole } from '@/hooks'
import { toFieldErrors } from '@/utils'

import {
    addRbacTab,
    buildRbacTabCloseHref,
    buildRbacTabsHref,
    parseRbacTabKeys,
    type RbacTabItem,
    withoutRbacTab,
} from '../rbac-tab-query'
import { getOpenRbacTabsSnapshot, writeOpenRbacTabs } from '../rbac-tabs-storage'

interface RoleFormProps {
    // Không có `role` = tạo mới; có = sửa vai trò đó (khi đó `name` là bất biến — `UpdateRoleSchema` không nhận `name`).
    role?: RoleDetail
    // Toàn bộ danh mục quyền để chọn. Rỗng khi người dùng thiếu `rbac:permissions:list`.
    permissionCatalog: PermissionSummary[]
    // Có `rbac:role-permissions:assign` mới hiện và gửi được phần gán quyền.
    canAssignPermissions: boolean
    flags: RbacPermissionFlags
    actorId: string
}

// Form tạo/sửa vai trò, dùng chung cho tab "Tạo" và tab "Cập nhật" (giống `UserForm`). Validate bằng chính schema của
// `@timmyhub/contracts` (luật #15) — cùng luật với backend, cùng câu lỗi qua catalog `api`.
//
// 7 trạng thái: mặc định · đang tải (nút lưu quay, khoá form) · rỗng (chưa chọn quyền nào → vẫn hợp lệ) · lỗi
// (`fieldErrors` dưới từng ô, lỗi nghiệp vụ hiện toast ở hook) · không có quyền (tab không hiện — nơi gọi quyết định,
// phần gán quyền ẩn khi thiếu `canAssignPermissions`) · vô hiệu hoá (đang gửi) · thành công (toast + tab tự đóng,
// bảng đã dựng lại qua `revalidatePath`).
export function RoleForm({ role, permissionCatalog, canAssignPermissions, flags, actorId }: RoleFormProps) {
    const isEdit = Boolean(role)

    // ===== State =====
    const [values, setValues] = useState({
        name: role?.name ?? '',
        displayName: role?.displayName ?? '',
        description: role?.description ?? '',
    })
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role ? [...role.permissionNames] : [])
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // ===== Hooks =====
    const t = useTranslations('rbac')
    const tApi = useTranslations('api')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const editedRoleId = role?.id

    // Tab của form này. Lưu thành công hoặc Huỷ sẽ gỡ đúng tab hiện tại khỏi localStorage.
    const closeCurrentTab = useCallback(() => {
        const selfTab: RbacTabItem = editedRoleId
            ? { tab: RBAC_TAB.UPDATE, id: editedRoleId }
            : { tab: RBAC_TAB.CREATE }
        const open = parseRbacTabKeys(RBAC_KIND.ROLES, JSON.parse(getOpenRbacTabsSnapshot(RBAC_KIND.ROLES, actorId)))
        const href = buildRbacTabCloseHref(RBAC_KIND.ROLES, pathname, searchParams, selfTab, open)
        writeOpenRbacTabs(RBAC_KIND.ROLES, actorId, withoutRbacTab(open, selfTab))
        router.push(href)
    }, [actorId, editedRoleId, pathname, router, searchParams])

    // Sửa xong thì thay tab Sửa bằng tab Chi tiết của chính vai trò đó — cùng khuôn `UserForm.closeUpdateTab`.
    const closeUpdateTab = useCallback(() => {
        if (!editedRoleId) return closeCurrentTab()

        const updateTab: RbacTabItem = { tab: RBAC_TAB.UPDATE, id: editedRoleId }
        const detailTab: RbacTabItem = { tab: RBAC_TAB.DETAIL, id: editedRoleId }
        const stored = parseRbacTabKeys(RBAC_KIND.ROLES, JSON.parse(getOpenRbacTabsSnapshot(RBAC_KIND.ROLES, actorId)))
        const remaining = withoutRbacTab(stored, updateTab)
        writeOpenRbacTabs(RBAC_KIND.ROLES, actorId, addRbacTab(remaining, detailTab))
        router.push(buildRbacTabsHref(pathname, searchParams, detailTab))
    }, [actorId, closeCurrentTab, editedRoleId, pathname, router, searchParams])

    const create = useCreateRole({ onSucceeded: closeCurrentTab })
    const update = useUpdateRole({ onSucceeded: closeUpdateTab })
    const isPending = create.isPending || update.isPending

    // ===== Derived =====
    // Nhóm quyền theo `module` để màn hình đọc được theo cụm (`identity`, `rbac`, `catalog`…) thay vì một dãy phẳng
    // vài chục dòng. Giữ thứ tự backend trả (đã sắp theo module → resource → action) nên không cần sort lại.
    const permissionGroups = useMemo(() => {
        const groups = new Map<string, PermissionSummary[]>()
        for (const permission of permissionCatalog) {
            const bucket = groups.get(permission.module)
            if (bucket) bucket.push(permission)
            else groups.set(permission.module, [permission])
        }
        return [...groups.entries()]
    }, [permissionCatalog])

    const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions])
    // Chỉ gửi tập quyền khi nó THẬT SỰ đổi: gửi thừa một lời gọi `PUT …/permissions` sẽ hỏng với người chỉ có
    // `rbac:roles:update` (thiếu `rbac:role-permissions:assign`) và biến một lần lưu thành công thành cảnh báo.
    const permissionsChanged = useMemo(() => {
        if (!role) return selectedPermissions.length > 0
        const original = new Set(role.permissionNames)
        return selectedPermissions.length !== original.size || selectedPermissions.some((name) => !original.has(name))
    }, [role, selectedPermissions])

    // ===== Handlers =====
    const setInputField = (field: 'name' | 'displayName') => (event: ChangeEvent<HTMLInputElement>) => {
        setValues((previous) => ({ ...previous, [field]: event.target.value }))
    }

    const setDescription = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setValues((previous) => ({ ...previous, description: event.target.value }))
    }

    const togglePermission = (name: string, checked: boolean) => {
        setSelectedPermissions((previous) => (checked ? [...previous, name] : previous.filter((item) => item !== name)))
    }

    const toggleModule = (permissions: PermissionSummary[], checked: boolean) => {
        const names = permissions.map((permission) => permission.name)
        setSelectedPermissions((previous) =>
            checked
                ? [...previous, ...names.filter((name) => !previous.includes(name))]
                : previous.filter((name) => !names.includes(name)),
        )
    }

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        // Ô "mô tả" để trống nghĩa là **không đụng tới** trường đó, chứ không phải xoá về rỗng: schema khai
        // `description` là optional nên chuỗi rỗng đi thẳng xuống backend thành giá trị rỗng.
        const description = values.description.trim() === '' ? undefined : values.description

        if (role) {
            const parsed = UpdateRoleSchema.safeParse({
                displayName: values.displayName,
                ...(description === undefined ? {} : { description }),
            })
            if (!parsed.success) {
                setFieldErrors(toFieldErrors(parsed.error.issues, tApi))
                return
            }
            setFieldErrors({})
            update.mutate({
                roleId: role.id,
                input: parsed.data,
                ...(canAssignPermissions && permissionsChanged ? { permissionNames: selectedPermissions } : {}),
            })
            return
        }

        const parsed = CreateRoleSchema.safeParse({
            name: values.name,
            displayName: values.displayName,
            ...(description === undefined ? {} : { description }),
        })
        if (!parsed.success) {
            setFieldErrors(toFieldErrors(parsed.error.issues, tApi))
            return
        }
        setFieldErrors({})
        create.mutate({
            input: parsed.data,
            permissionNames: canAssignPermissions ? selectedPermissions : [],
        })
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
            <header className="flex flex-col gap-1 border-b pb-5">
                <h1 className="text-xl font-semibold tracking-tight">
                    {t(isEdit ? 'roleFormTitleUpdate' : 'roleFormTitleCreate')}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {t(isEdit ? 'roleFormDescriptionUpdate' : 'roleFormDescriptionCreate')}
                </p>
            </header>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-6">
                    <FormSection title={t('roleSectionInfo')} description={t('roleInfoDescription')}>
                        <FloatInput
                            label={t('fieldRoleName')}
                            name="name"
                            value={values.name}
                            onChange={setInputField('name')}
                            helperText={isEdit ? t('fieldRoleNameImmutable') : t('fieldRoleNameHint')}
                            error={fieldErrors.name}
                            // `name` là khoá nghiệp vụ và `UpdateRoleSchema` không nhận nó ⇒ sửa thì chỉ đọc.
                            disabled={isPending || isEdit}
                            className="font-mono"
                            labelClassName={ON_CARD_LABEL_CLASS}
                        />
                        <FloatInput
                            label={t('fieldRoleDisplayName')}
                            name="displayName"
                            value={values.displayName}
                            onChange={setInputField('displayName')}
                            error={fieldErrors.displayName}
                            disabled={isPending}
                            labelClassName={ON_CARD_LABEL_CLASS}
                        />
                        <FloatTextarea
                            label={t('fieldRoleDescription')}
                            name="description"
                            value={values.description}
                            onChange={setDescription}
                            error={fieldErrors.description}
                            disabled={isPending}
                            rows={3}
                            labelClassName={ON_CARD_LABEL_CLASS}
                        />
                    </FormSection>

                    {canAssignPermissions && (
                        <FormSection title={t('roleSectionPermissions')} description={t('rolePermissionsDescription')}>
                            {permissionGroups.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('permissionCatalogEmpty')}</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                    {permissionGroups.map(([moduleName, permissions]) => (
                                        <PermissionGroup
                                            key={moduleName}
                                            moduleName={moduleName}
                                            permissions={permissions}
                                            selected={selectedSet}
                                            disabled={isPending}
                                            onToggle={togglePermission}
                                            onToggleModule={toggleModule}
                                            countLabel={t('selectedCount', {
                                                count: permissions.filter((p) => selectedSet.has(p.name)).length,
                                                total: permissions.length,
                                            })}
                                            selectAllLabel={t('selectAllInModule')}
                                        />
                                    ))}
                                </div>
                            )}
                        </FormSection>
                    )}
                </div>

                <aside className="h-fit rounded-xl border bg-muted/30 p-4">
                    <h2 className="text-sm font-semibold">{t('roleFormSideTitle')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t(isEdit ? 'roleFormSideUpdate' : 'roleFormSideCreate')}
                    </p>
                    <div className="mt-4 border-t pt-4">
                        <p className="text-xs text-muted-foreground">{t('roleSelectedPermissions')}</p>
                        <p className="mt-1 text-sm font-medium">{selectedPermissions.length}</p>
                    </div>
                    {role?.isSystem && (
                        <div className="mt-4 border-t pt-4">
                            <Badge variant="secondary">{t('systemRoleWarning')}</Badge>
                        </div>
                    )}
                </aside>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-5">
                {/* `asChild` + `disabled` không chặn được điều hướng: prop rơi xuống thẻ <a>, mà <a> không có khái
                    niệm disabled. Đang gửi thì phải render Button thật. */}
                {isPending ? (
                    <Button type="button" variant="outline" disabled>
                        {t('cancel')}
                    </Button>
                ) : (
                    <Button type="button" variant="outline" onClick={closeCurrentTab}>
                        {t('cancel')}
                    </Button>
                )}
                <Button type="submit" disabled={isPending || (isEdit && !flags.ROLES_UPDATE)}>
                    {isPending ? t('saving') : t('save')}
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

function PermissionGroup({
    moduleName,
    permissions,
    selected,
    disabled,
    onToggle,
    onToggleModule,
    countLabel,
    selectAllLabel,
}: {
    moduleName: string
    permissions: PermissionSummary[]
    selected: ReadonlySet<string>
    disabled: boolean
    onToggle: (name: string, checked: boolean) => void
    onToggleModule: (permissions: PermissionSummary[], checked: boolean) => void
    countLabel: string
    selectAllLabel: string
}) {
    const [open, setOpen] = useState(false)
    const selectedCount = permissions.filter((permission) => selected.has(permission.name)).length
    const allSelected = selectedCount === permissions.length
    const someSelected = selectedCount > 0 && !allSelected
    const groupId = `rbac-module-${moduleName}`

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className={`h-fit overflow-hidden rounded-xl border transition-colors ${
                selectedCount > 0 ? 'border-primary/35 bg-primary/[0.025]' : 'bg-card'
            }`}
        >
            <div className="flex min-h-12 items-center gap-1.5 px-2.5 py-2">
                <CollapsibleTrigger
                    aria-controls={groupId}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Layers3Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold capitalize">{moduleName}</span>
                        <span className="block text-[11px] leading-4 text-muted-foreground">{countLabel}</span>
                    </span>
                    <ChevronDownIcon
                        className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </CollapsibleTrigger>
                <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    disabled={disabled}
                    aria-label={`${selectAllLabel}: ${moduleName}`}
                    onCheckedChange={(checked) => onToggleModule(permissions, checked !== false)}
                />
            </div>
            <CollapsibleContent id={groupId} className="flex-1 border-t px-2 py-1.5">
                <ul className="flex flex-col gap-0.5">
                    {permissions.map((permission) => {
                        const isSelected = selected.has(permission.name)
                        return (
                            <li key={permission.id}>
                                <label
                                    className={`group flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-primary/[0.04] ${
                                        isSelected ? 'bg-primary/[0.06]' : ''
                                    }`}
                                >
                                    <Checkbox
                                        className="mt-0.5 size-3.5 [&_svg]:size-3"
                                        checked={isSelected}
                                        disabled={disabled}
                                        onCheckedChange={(checked) => onToggle(permission.name, checked === true)}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={`block truncate text-[13px] font-medium leading-4 ${
                                                isSelected ? 'text-primary' : 'text-foreground'
                                            }`}
                                        >
                                            {permission.displayName}
                                        </span>
                                        <span className="block truncate font-mono text-[10px] leading-4 text-muted-foreground">
                                            {permission.name}
                                        </span>
                                    </span>
                                </label>
                            </li>
                        )
                    })}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    )
}
