'use client'

import { useMemo, useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AgGridTable,
} from '@/components'

import { createMockUsers, type DemoUser } from '../mock-users'
import { createUserColumns } from './user-columns'

// Bản demo của `UserList` ở TimmyHub gốc: dữ liệu giả trong state, khoá/mở khoá qua hộp xác nhận. Khi có API thì
// thay `createMockUsers` bằng query và `handleConfirmToggle` bằng mutation `POST /api/admin/users/:id/lock`.
export function UserList() {
    const t = useTranslations('userManagement')
    const [users, setUsers] = useState(createMockUsers)
    const [loading, setLoading] = useState(false)
    const [pendingToggle, setPendingToggle] = useState<DemoUser | null>(null)

    const columnDefs = useMemo(
        () =>
            createUserColumns(t, {
                onDetail: (user) => toast.info(t('viewing', { email: user.email })),
                onUpdate: () => toast.info(t('editNotConnected')),
                onToggleStatus: setPendingToggle,
            }),
        [t],
    )

    const handleRefresh = () => {
        setLoading(true)
        setTimeout(() => {
            setUsers(createMockUsers())
            setLoading(false)
        }, 600)
    }

    const handleConfirmToggle = () => {
        if (!pendingToggle) return
        const { id, email, isActive } = pendingToggle
        setUsers((previous) => previous.map((user) => (user.id === id ? { ...user, isActive: !isActive } : user)))
        toast.success(isActive ? t('locked', { email }) : t('unlocked', { email }))
        setPendingToggle(null)
    }

    const isLocking = pendingToggle?.isActive ?? true
    const actionLabel = isLocking ? t('lockAccount') : t('unlockAccount')

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
                exportFileName="users"
                gridProps={{ rowHeight: 52 }}
            />

            <AlertDialog open={pendingToggle !== null} onOpenChange={(open) => !open && setPendingToggle(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className={isLocking ? 'bg-destructive/10 text-destructive' : undefined}>
                            <TriangleAlertIcon />
                        </AlertDialogMedia>
                        <AlertDialogTitle>{actionLabel}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingToggle &&
                                (isLocking
                                    ? t('confirmLock', { email: pendingToggle.email })
                                    : t('confirmUnlock', { email: pendingToggle.email }))}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={isLocking ? 'destructive' : 'default'}
                            onClick={handleConfirmToggle}
                        >
                            {actionLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
