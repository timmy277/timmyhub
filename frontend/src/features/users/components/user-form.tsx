'use client'

import { useCallback, useState, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { UserRole, UserSummary } from '@timmyhub/contracts'
import { CreateUserSchema, UpdateUserSchema, USER_ROLES, UserRole as UserRoleValue } from '@timmyhub/contracts'

import { Button, FloatInput, FloatMultiSelect, ON_CARD_LABEL_CLASS } from '@/components'
import { ROLE_LABEL_KEY, USER_TAB } from '@/constants'
import { useCreateUser, useUpdateUser } from '@/hooks'
import { toFieldErrors } from '@/utils'

import { buildUserTabCloseHref, type UserTabItem, withoutUserTab } from '../user-tab-query'
import { readOpenUserTabs, writeOpenUserTabs } from '../user-tabs-storage'

interface UserFormProps {
    // `null` = tạo mới; có giá trị = sửa tài khoản đó.
    user: UserSummary | null
    // Chỉ có `identity:users:assign-role` mới được chọn vai trò khi tạo (backend chặn lần nữa nếu thiếu).
    canAssignRole: boolean
    actorId: string
}

// Form tạo/sửa người dùng, dùng chung cho tab "Tạo" và tab "Cập nhật". Validate bằng chính schema của
// `@timmyhub/contracts` (luật #15) — cùng luật với backend, cùng câu lỗi qua catalog `api`.
//
// Trước đây form nằm trong hộp thoại; chuyển thành tab nên bỏ vỏ `Dialog`, phần thân giữ nguyên.
// 7 trạng thái: mặc định · đang tải (nút lưu quay, khoá form) · rỗng (N/A) · lỗi (`fieldErrors` dưới từng ô, lỗi
// nghiệp vụ hiện toast ở hook) · không có quyền (tab không hiện — nơi gọi quyết định) · vô hiệu hoá (đang gửi) ·
// thành công (toast + tab tự đóng, bảng đã dựng lại qua `revalidatePath`).
export function UserForm({ user, canAssignRole, actorId }: UserFormProps) {
    const isEdit = user !== null

    // ===== State =====
    const [values, setValues] = useState({
        email: '',
        password: '',
        firstName: user?.profile?.firstName ?? '',
        lastName: user?.profile?.lastName ?? '',
        displayName: user?.profile?.displayName ?? '',
        phone: user?.phone ?? '',
    })
    const [roles, setRoles] = useState<string[]>(user ? [...user.roles] : [UserRoleValue.USER])
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tApi = useTranslations('api')
    const tRole = useTranslations('role')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const editedUserId = user?.id

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
    const update = useUpdateUser({ onSucceeded: closeCurrentTab })
    const isPending = create.isPending || update.isPending

    // ===== Derived =====
    const roleOptions = USER_ROLES.map((role) => ({ value: role, label: tRole(ROLE_LABEL_KEY[role]) }))

    // ===== Handlers =====
    const setField = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((previous) => ({ ...previous, [field]: event.target.value }))
    }

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (isEdit) {
            const raw = {
                firstName: values.firstName,
                lastName: values.lastName,
                ...(values.displayName.trim() === '' ? {} : { displayName: values.displayName }),
                ...(values.phone.trim() === '' ? {} : { phone: values.phone }),
            }
            const parsed = UpdateUserSchema.safeParse(raw)
            if (!parsed.success) {
                setFieldErrors(toFieldErrors(parsed.error.issues, tApi))
                return
            }
            setFieldErrors({})
            update.mutate({ userId: user.id, input: parsed.data })
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
        <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4" noValidate>
            {!isEdit && (
                <>
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
                </>
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

            {!isEdit && canAssignRole && (
                <FloatMultiSelect
                    label={t('fieldRoles')}
                    options={roleOptions}
                    value={roles}
                    onValueChange={setRoles}
                    error={fieldErrors.roles}
                    disabled={isPending}
                    labelClassName={ON_CARD_LABEL_CLASS}
                />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
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
