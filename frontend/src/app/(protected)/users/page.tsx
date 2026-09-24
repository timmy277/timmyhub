import { NavLayout } from '@/components/layout'
import { UserManagementPage } from '@/features/users'

export default function Page() {
    return (
        <NavLayout>
            <UserManagementPage />
        </NavLayout>
    )
}
