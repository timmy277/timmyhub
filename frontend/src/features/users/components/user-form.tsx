'use client'

import { useCallback, useMemo } from 'react'
import { type Resolver, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { toFieldErrorMessage } from '@/utils'

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

interface UserFormValues {
    email: string
    password: string
    firstName: string
    lastName: string
    displayName: string
    phone: string
    avatar: string | null
    roles: UserRole[]
}

// Form tạo/sửa người dùng, dùng chung cho tab "Tạo" và tab "Cập nhật". Validate bằng chính schema của
// `@timmyhub/contracts` (luật #15) — cùng luật với backend, cùng câu lỗi qua catalog `api`.
export function UserForm({ userId, user, canAssignRole, actorId, permissions }: UserFormProps) {
    const isEdit = Boolean(userId)

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tApi = useTranslations('api')
    const tRole = useTranslations('role')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const editedUserId = userId

    const { data: session, update: updateSession } = useSession()

    const resolver = useMemo(
        () => zodResolver(isEdit ? UpdateUserSchema : CreateUserSchema) as unknown as Resolver<UserFormValues>,
        [isEdit],
    )

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors },
    } = useForm<UserFormValues>({
        resolver,
        mode: 'onChange',
        defaultValues: {
            email: '',
            password: '',
            firstName: user?.profile?.firstName ?? '',
            lastName: user?.profile?.lastName ?? '',
            displayName: user?.profile?.displayName ?? '',
            phone: user?.phone ?? '',
            avatar: user?.profile?.avatar ?? null,
            roles: user ? [...user.roles] : [UserRoleValue.USER],
        },
    })

    const avatar = useWatch({ control, name: 'avatar' })
    const roles = useWatch({ control, name: 'roles' })
    const firstName = useWatch({ control, name: 'firstName' })
    const lastName = useWatch({ control, name: 'lastName' })
    const displayName = useWatch({ control, name: 'displayName' })
    const email = useWatch({ control, name: 'email' })

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
            const fallbackDisplayName = [lastName, firstName].filter(Boolean).join(' ') || firstName
            const nextName = displayName.trim() || fallbackDisplayName
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
        displayName,
        editedUserId,
        firstName,
        lastName,
        session?.user?.id,
        updateSession,
    ])

    const update = useUpdateUser({ onSucceeded: handleUpdateSuccess })
    const isPending = create.isPending || update.isPending

    // ===== Derived =====
    const roleOptions = USER_ROLES.map((role) => ({ value: role, label: tRole(ROLE_LABEL_KEY[role]) }))
    const canEditRoles = Boolean(permissions?.ASSIGN_ROLE && userId && actorId !== userId)

    const onSubmit = (data: UserFormValues) => {
        if (userId) {
            if (!user) return
            const fallbackDisplayName = [data.lastName, data.firstName].filter(Boolean).join(' ') || data.firstName
            const raw = {
                firstName: data.firstName,
                lastName: data.lastName,
                displayName: data.displayName.trim() || fallbackDisplayName,
                ...(data.phone.trim() === '' ? {} : { phone: data.phone }),
                ...(canEditRoles ? { roles: data.roles } : {}),
                avatar: data.avatar,
            }
            update.mutate({ userId, input: raw })
            return
        }

        const raw = {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            ...(data.phone.trim() === '' ? {} : { phone: data.phone }),
            avatar: data.avatar,
            ...(canAssignRole ? { roles: data.roles } : {}),
        }
        create.mutate(raw)
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
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
                                autoComplete="off"
                                error={toFieldErrorMessage(errors.email?.message, tApi)}
                                reserveErrorSpace
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('email')}
                            />
                            <FloatInput
                                label={t('fieldPassword')}
                                type="password"
                                autoComplete="new-password"
                                helperText={t('fieldPasswordHint')}
                                error={toFieldErrorMessage(errors.password?.message, tApi)}
                                reserveErrorSpace
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('password')}
                            />
                        </FormSection>
                    ) : (
                        <FormSection title={t('formSectionAccount')} description={t('formSideUpdate')}>
                            <FloatInput
                                label={t('fieldEmail')}
                                type="email"
                                value={user?.email ?? ''}
                                disabled
                                helperText={t('formSideUpdate')}
                                reserveErrorSpace
                                labelClassName={ON_CARD_LABEL_CLASS}
                            />
                        </FormSection>
                    )}

                    <FormSection title={t('formSectionProfile')} description={t('formProfileDescription')}>
                        <div className="flex w-full justify-center pb-4 pt-1">
                            <UploadSection
                                variant="avatar"
                                align="center"
                                acceptType="image"
                                name={
                                    [firstName, lastName].filter(Boolean).join(' ') ||
                                    displayName ||
                                    (isEdit ? user?.email : email) ||
                                    'User'
                                }
                                value={avatar}
                                onChange={(val) =>
                                    setValue('avatar', typeof val === 'string' || val === null ? val : null, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    })
                                }
                                ownerType="AVATAR"
                                ownerId={userId}
                                disabled={isPending}
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FloatInput
                                label={t('fieldLastName')}
                                error={toFieldErrorMessage(errors.lastName?.message, tApi)}
                                reserveErrorSpace
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('lastName')}
                            />
                            <FloatInput
                                label={t('fieldFirstName')}
                                error={toFieldErrorMessage(errors.firstName?.message, tApi)}
                                reserveErrorSpace
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('firstName')}
                            />
                        </div>
                        {isEdit && (
                            <FloatInput
                                label={t('fieldDisplayName')}
                                error={toFieldErrorMessage(errors.displayName?.message, tApi)}
                                reserveErrorSpace
                                disabled={isPending}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('displayName')}
                            />
                        )}
                        <FloatInput
                            label={t('fieldPhone')}
                            type="tel"
                            inputMode="numeric"
                            error={toFieldErrorMessage(errors.phone?.message, tApi)}
                            reserveErrorSpace
                            disabled={isPending}
                            labelClassName={ON_CARD_LABEL_CLASS}
                            {...register('phone')}
                        />
                    </FormSection>

                    {(!isEdit && canAssignRole) || (isEdit && user) ? (
                        <FormSection title={t('formSectionAccess')} description={t('formAccessDescription')}>
                            <FloatMultiSelect
                                label={t('fieldRoles')}
                                options={roleOptions}
                                value={roles}
                                onValueChange={(next) =>
                                    setValue('roles', next as UserRole[], {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    })
                                }
                                error={toFieldErrorMessage(errors.roles?.message, tApi)}
                                reserveErrorSpace
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
