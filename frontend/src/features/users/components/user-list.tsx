'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AgGridTable, ConfirmDialog } from '@/components'
import { createUserColumns } from '@/config'
import { TOAST_ID, USER_TABLE_ROW_HEIGHT_PX } from '@/constants'
import { MOCK_USERS_LATENCY_MS, createMockUsers } from '@/mocks'
import type { DemoUser } from '@/types'

// Bản demo của `UserList` ở TimmyHub gốc: dữ liệu giả trong state, khoá/mở khoá qua hộp xác nhận. Khi có API thì
// thay `createMockUsers` bằng query và `handleConfirmToggle` bằng mutation `POST /api/admin/users/:id/lock`.
export function UserList() {
    // ===== State =====
    const [users, setUsers] = useState<DemoUser[]>(() => createMockUsers())
    const [loading, setLoading] = useState(false)
    const [pendingToggle, setPendingToggle] = useState<DemoUser | null>(null)
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tRole = useTranslations('role')

    // ===== Derived =====
    const columnDefs = useMemo(
        () =>
            createUserColumns({
                t,
                tRole,
                actions: {
                    onDetail: (user) => toast.info(t('viewing', { email: user.email })),
                    onUpdate: () => toast.info(t('editNotConnected')),
                    onToggleStatus: setPendingToggle,
                },
            }),
        [t, tRole],
    )
    const isLocking = pendingToggle?.isActive ?? true
    const actionLabel = isLocking ? t('lockAccount') : t('unlockAccount')

    // ===== Handlers =====
    const handleRefresh = () => {
        setLoading(true)
        // Giả lập request; timer được huỷ khi unmount (xem Effects) để không setState trên component đã gỡ.
        const refresh = new Promise<DemoUser[]>((resolve) => {
            refreshTimerRef.current = setTimeout(() => resolve(createMockUsers()), MOCK_USERS_LATENCY_MS)
        })
            .then(setUsers)
            .finally(() => setLoading(false))
        toast.promise(refresh, {
            id: TOAST_ID.USERS_REFRESH,
            loading: t('refreshing'),
            success: t('refreshed'),
            error: t('refreshFailed'),
        })
    }

    const handleConfirmToggle = () => {
        if (!pendingToggle) return
        const { id, email, isActive } = pendingToggle
        setUsers((previous) => previous.map((user) => (user.id === id ? { ...user, isActive: !isActive } : user)))
        toast.success(isActive ? t('locked', { email }) : t('unlocked', { email }))
    }

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) setPendingToggle(null)
    }

    // ===== Effects =====
    useEffect(
        () => () => {
            clearTimeout(refreshTimerRef.current)
            toast.dismiss(TOAST_ID.USERS_REFRESH)
        },
        [],
    )

    return (
        <>
            <AgGridTable<DemoUser>
                rowData={users}
                columnDefs={columnDefs}
                getRowId={(params) => params.data.id}
                loading={loading}
                onRefresh={handleRefresh}
                onAdd={() => toast.info(t('addNotConnected'))}
                addLabel={t('addUser')}
                searchLabel={t('searchLabel')}
                exportFileName={t('exportFileName')}
                gridProps={{ rowHeight: USER_TABLE_ROW_HEIGHT_PX }}
            />

            <ConfirmDialog
                open={pendingToggle !== null}
                onOpenChange={handleDialogOpenChange}
                title={actionLabel}
                description={
                    pendingToggle &&
                    (isLocking
                        ? t('confirmLock', { email: pendingToggle.email })
                        : t('confirmUnlock', { email: pendingToggle.email }))
                }
                confirmLabel={actionLabel}
                variant={isLocking ? 'destructive' : 'default'}
                onConfirm={handleConfirmToggle}
            />
        </>
    )
}
