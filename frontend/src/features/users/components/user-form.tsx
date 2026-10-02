'use client'

import { useCallback, useState, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'

import type { UserRole, UserSummary } from '@timmyhub/contracts'
import { CreateUserSchema, UpdateUserSchema, USER_ROLES, UserRole as UserRoleValue } from '@timmyhub/contracts'

import { Button, FloatInput, FloatMultiSelect, ON_CARD_LABEL_CLASS, UploadSection } from '@/components'
import { ROLE_LABEL_KEY, USER_TAB } from '@/constants'
import type { UserPermissionFlags } from '@/constants'
import { useCreateUser, useUpdateUser } from '@/hooks'
import { useUserProfileStore } from '@/stores'
import { toFieldErrors } from '@/utils'

import {
    addUserTab,
    buildUserTabCloseHref,
    buildUserTabsHref,
    type UserTabItem,
    withoutUserTab,
} from '../user-tab-query'
import { readOpenUserTabs, writeOpenUserTabs } from '../user-tabs-storage'

interface UserFormProps {
    // Không có `userId` = tạo mới; có ID = cập nhật tài khoản đó.
    userId?: string
    user?: UserSummary
    // Chỉ có `identity:users:assign-role` mới được chọn vai trò khi tạo (backend chặn lần nữa nếu thiếu).
    canAssignRole: boolean
    actorId: string
    permissions?: UserPermissionFlags
}

// Form tạo/sửa người dùng, dùng chung cho tab "Tạo" và tab "Cập nhật". Validate bằng chính schema của
// `@timmyhub/contracts` (luật #15) — cùng luật với backend, cùng câu lỗi qua catalog `api`.
//
// Trước đây form nằm trong hộp thoại; chuyển thành tab nên bỏ vỏ `Dialog`, phần thân giữ nguyên.
// 7 trạng thái: mặc định · đang tải (nút lưu quay, khoá form) · rỗng (N/A) · lỗi (`fieldErrors` dưới từng ô, lỗi
// nghiệp vụ hiện toast ở hook) · không có quyền (tab không hiện — nơi gọi quyết định) · vô hiệu hoá (đang gửi) ·
// thành công (toast + tab tự đóng, bảng đã dựng lại qua `revalidatePath`).
export function UserForm({ userId, user, canAssignRole, actorId, permissions }: UserFormProps) {
    const isEdit = Boolean(userId)

    // ===== State =====
    const [values, setValues] = useState({
        email: '',
        password: '',
        firstName: user?.profile?.firstName ?? '',
        lastName: user?.profile?.lastName ?? '',
        displayName: user?.profile?.displayName ?? '',
        phone: user?.phone ?? '',
    })
    const [roles, setRoles] = useState<UserRole[]>(user ? [...user.roles] : [UserRoleValue.USER])
    const [avatar, setAvatar] = useState<string | null>(user?.profile?.avatar ?? null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tApi = useTranslations('api')
    const tRole = useTranslations('role')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const editedUserId = userId

    const { data: session, update: updateSession } = useSession()

    // Tab của form này. Lưu thành công hoặc Huỷ sẽ gỡ đúng tab hiện tại khỏi localStorage.
    const closeCurrentTab = useCallback(() => {
        const selfTab: UserTabItem = editedUserId
            ? { tab: USER_TAB.UPDATE, id: editedUserId }
            : { tab: USER_TAB.CREATE }
        const open = readOpenUserTabs(actorId)
        const href = buildUserTabCloseHref(pathname, searchParams, selfTab, open)
        writeOpenUserTabs(actorId, withoutUserTab(open, selfTab))
        router.push(href)
    }, [actorId, editedUserId, pathname, router, searchParams])
    const create = useCreateUser({ onSucceeded: closeCurrentTab })

    const closeUpdateTab = useCallback(() => {
        if (!editedUserId) return closeCurrentTab()

        const updateTab: UserTabItem = { tab: USER_TAB.UPDATE, id: editedUserId }
        const detailTab: UserTabItem = { tab: USER_TAB.DETAIL, id: editedUserId }
        const remainingTabs = withoutUserTab(readOpenUserTabs(actorId), updateTab)
        writeOpenUserTabs(actorId, addUserTab(remainingTabs, detailTab))
        router.push(buildUserTabsHref(pathname, searchParams, detailTab))
    }, [actorId, closeCurrentTab, editedUserId, pathname, router, searchParams])

    const handleUpdateSuccess = useCallback(async () => {
        if (editedUserId && (editedUserId === actorId || editedUserId === session?.user?.id)) {
            const fallbackDisplayName =
                [values.lastName, values.firstName].filter(Boolean).join(' ') || values.firstName
            const nextName = values.displayName.trim() || fallbackDisplayName
            useUserProfileStore.getState().setOverride({
                displayName: nextName,
                avatar,
            })
            try {
                await updateSession({
                    image: avatar,
                    name: nextName,
                })
            } catch {
                // Ignore session update error
            }
        }
        closeUpdateTab()
    }, [
        actorId,
        avatar,
        closeUpdateTab,
        editedUserId,
        session?.user?.id,
        updateSession,
        values.displayName,
        values.firstName,
        values.lastName,
    ])

    const update = useUpdateUser({ onSucceeded: handleUpdateSuccess })
    const isPending = create.isPending || update.isPending

    // ===== Derived =====
    const roleOptions = USER_ROLES.map((role) => ({ value: role, label: tRole(ROLE_LABEL_KEY[role]) }))
    const canEditRoles = Boolean(permissions?.ASSIGN_ROLE && userId && actorId !== userId)

    // ===== Handlers =====
    const setField = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((previous) => ({ ...previous, [field]: event.target.value }))
    }

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (userId) {
            if (!user) return
            const fallbackDisplayName =
                [values.lastName, values.firstName].filter(Boolean).join(' ') || values.firstName
            const raw = {
                firstName: values.firstName,
                lastName: values.lastName,
                displayName: values.displayName.trim() || fallbackDisplayName,
                ...(values.phone.trim() === '' ? {} : { phone: values.phone }),
                ...(canEditRoles ? { roles } : {}),
                avatar,
            }
            const parsed = UpdateUserSchema.safeParse(raw)
            if (!parsed.success) {
                setFieldErrors(toFieldErrors(parsed.error.issues, tApi))
                return
            }
            setFieldErrors({})
            update.mutate({ userId, input: parsed.data })
            return
        }

        const raw = {
            email: values.email,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
            ...(values.phone.trim() === '' ? {} : { phone: values.phone }),
            ...(canAssignRole ? { roles: roles as UserRole[] } : {}),
        }
        const parsed = CreateUserSchema.safeParse(raw)
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
                <h1 className="text-xl font-semibold tracking-tight">
                    {t(isEdit ? 'formTitleUpdate' : 'formTitleCreate')}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {t(isEdit ? 'formDescriptionUpdate' : 'formDescriptionCreate')}
                </p>
            </header>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-6">
                    {!isEdit ? (
                        <FormSection title={t('formSectionAccount')} description={t('formAccountDescription')}>
                            <FloatInput
                                label={t('fieldEmail')}
                                type="email"
                                name="email"
                                autoComplete="off"
                                value={values.email}
                                onChange={setField('email')}
                                error={fieldErrors.email}
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                            <FloatInput
                                label={t('fieldPassword')}
                                type="password"
                                name="password"
                                autoComplete="new-password"
                                helperText={t('fieldPasswordHint')}
                                value={values.password}
                                onChange={setField('password')}
                                error={fieldErrors.password}
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                        </FormSection>
                    ) : (
                        <FormSection title={t('formSectionAccount')} description={t('formSideUpdate')}>
                            <FloatInput
                                label={t('fieldEmail')}
                                type="email"
                                name="email"
                                value={user?.email ?? ''}
                                disabled
                                helperText={t('formSideUpdate')}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                        </FormSection>
                    )}

                    <FormSection title={t('formSectionProfile')} description={t('formProfileDescription')}>
                        {isEdit && (
                            <div className="flex w-full justify-center pb-4 pt-1">
                                <UploadSection
                                    variant="avatar"
                                    align="center"
                                    acceptType="image"
                                    name={
                                        [values.firstName, values.lastName].filter(Boolean).join(' ') ||
                                        values.displayName ||
                                        user?.email ||
                                        'User'
                                    }
                                    value={avatar}
                                    onChange={(val) => setAvatar(typeof val === 'string' || val === null ? val : null)}
                                    ownerType="AVATAR"
                                    ownerId={userId}
                                    disabled={isPending}
                                />
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FloatInput
                                label={t('fieldLastName')}
                                name="lastName"
                                value={values.lastName}
                                onChange={setField('lastName')}
                                error={fieldErrors.lastName}
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                            <FloatInput
                                label={t('fieldFirstName')}
                                name="firstName"
                                value={values.firstName}
                                onChange={setField('firstName')}
                                error={fieldErrors.firstName}
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                        </div>
                        {isEdit && (
                            <FloatInput
                                label={t('fieldDisplayName')}
                                name="displayName"
                                value={values.displayName}
                                onChange={setField('displayName')}
                                error={fieldErrors.displayName}
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                        )}
                        <FloatInput
                            label={t('fieldPhone')}
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            value={values.phone}
                            onChange={setField('phone')}
                            error={fieldErrors.phone}
                            disabled={isPending}
                            labelClassName={ON_CARD_LABEL_CLASS}
                        />
                    </FormSection>

                    {(!isEdit && canAssignRole) || (isEdit && user) ? (
                        <FormSection title={t('formSectionAccess')} description={t('formAccessDescription')}>
                            <FloatMultiSelect
                                label={t('fieldRoles')}
                                options={roleOptions}
                                value={roles}
                                onValueChange={(next) => setRoles(next as UserRole[])}
                                error={fieldErrors.roles}
                                disabled={isPending || (isEdit ? !canEditRoles : !canAssignRole)}
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                            {isEdit && permissions?.ASSIGN_ROLE && userId === actorId && (
                                <p className="text-xs text-muted-foreground">{t('rolesSelfHint')}</p>
                            )}
                        </FormSection>
                    ) : null}
                </div>

                <aside className="h-fit rounded-xl border bg-muted/30 p-4">
                    <h2 className="text-sm font-semibold">{t('formSideTitle')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t(isEdit ? 'formSideUpdate' : 'formSideCreate')}
                    </p>
                    {isEdit && user && (
                        <div className="mt-4 border-t pt-4">
                            <p className="text-xs text-muted-foreground">{t('fieldEmail')}</p>
                            <p className="mt-1 break-all text-sm font-medium">{user.email}</p>
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
                <Button type="submit" disabled={isPending}>
                    {isPending ? t('saving') : t('save')}
                </Button>
            </div>
        </form>
    )
}

function FormSection({
    title,
    description,
    children,
}: {
    title: string
    description: string
    children: React.ReactNode
}) {
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
