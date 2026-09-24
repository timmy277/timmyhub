import { UserList } from './user-list'

// Khung server của trang — chỉ phần bảng (`UserList`) là client.
export function UserManagementPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <UserList />
            </section>
        </div>
    )
}
