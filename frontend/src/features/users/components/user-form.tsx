'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { UserRole, UserSummary } from '@timmyhub/contracts'
import { CreateUserSchema, UpdateUserSchema, USER_ROLES, UserRole as UserRoleValue } from '@timmyhub/contracts'

import { Button, FloatInput, FloatMultiSelect, ON_CARD_LABEL_CLASS } from '@/components'
import { ROLE_LABEL_KEY, USER_TAB } from '@/constants'
import { useCreateUser, useUpdateUser } from '@/hooks'
import { toFieldErrors } from '@/utils'

import { buildUserTabCloseHref, type UserTabItem } from '../user-tab-query'

interface UserFormProps {
    // `null` = tạo mới; có giá trị = sửa tài khoản đó.
    user: UserSummary | null
    // Chỉ có `identity:users:assign-role` mới được chọn vai trò khi tạo (backend chặn lần nữa nếu thiếu).
    canAssignRole: boolean
}

// Form tạo/sửa người dùng, dùng chung cho tab "Tạo" và tab "Cập nhật". Validate bằng chính schema của
// `@timmyhub/contracts` (luật #15) — cùng luật với backend, cùng câu lỗi qua catalog `api`.
//
// Trước đây form nằm trong hộp thoại; chuyển thành tab nên bỏ vỏ `Dialog`, phần thân giữ nguyên.
// 7 trạng thái: mặc định · đang tải (nút lưu quay, khoá form) · rỗng (N/A) · lỗi (`fieldErrors` dưới từng ô, lỗi
// nghiệp vụ hiện toast ở hook) · không có quyền (tab không hiện — nơi gọi quyết định) · vô hiệu hoá (đang gửi) ·
// thành công (toast + tab tự đóng, bảng đã dựng lại qua `revalidatePath`).
export function UserForm({ user, canAssignRole }: UserFormProps) {
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

    // Ghi xong thì chính tab này tự đóng và nhường chỗ cho tab liền trước (thường là danh sách) — ở dạng tab không còn
    // "đóng hộp thoại" để báo là đã xong. `leaveHref` khai báo ở khối Derived bên dưới; hai callback này chỉ chạy sau
    // khi render xong nên không sao.
    const create = useCreateUser({ onSucceeded: () => router.push(leaveHref) })
    const update = useUpdateUser({ onSucceeded: () => router.push(leaveHref) })
    const isPending = create.isPending || update.isPending

    // ===== Derived =====
    const roleOptions = USER_ROLES.map((role) => ({ value: role, label: tRole(ROLE_LABEL_KEY[role]) }))

    // Tab của chính form này, để biết cần gỡ tab nào khỏi danh sách đang mở. Lưu xong hay bấm Huỷ đều đi qua đây: form
    // đóng thì tab cũng đóng, còn các tab khác đang mở vẫn nguyên trên thanh tab.
    const selfTab: UserTabItem = isEdit ? { tab: USER_TAB.UPDATE, id: user.id } : { tab: USER_TAB.CREATE }
    const leaveHref = buildUserTabCloseHref(pathname, searchParams, selfTab)

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
                    <Button type="button" variant="outline" asChild>
                        <Link href={leaveHref}>{t('cancel')}</Link>
                    </Button>
                )}
                <Button type="submit" disabled={isPending}>
                    {isPending ? t('saving') : t('save')}
                </Button>
            </div>
        </form>
    )
}
