# Data Fetching Rules — timmy-hub

Mọi việc lấy dữ liệu (data fetching) trong ứng dụng Frontend (Next.js 16) **BẮT BUỘC** tuân thủ một trong hai mô hình dưới đây. **TUYỆT ĐỐI CẤM** dùng `useEffect` kết hợp `useState(loading)` để fetch API ở client component.

---

## 1. Mô hình 1: Server Component Fetching (Ưu tiên số 1)

Dành cho: Mọi trang (`page.tsx`), layout hoặc server component có thể truy vấn dữ liệu trước khi gửi HTML xuống client.

### Quy chuẩn:
1. `page.tsx` là `async function` (Server Component).
2. Lấy dữ liệu trực tiếp qua Server Actions hoặc gọi backend nội bộ.
3. Truyền dữ liệu xuống Client View thông qua props (`initialData` / `initialList` / `initialDetail`).
4. Xử lý error và loading ở tầng Next.js: `loading.tsx`, `error.tsx`.

### Ví dụ:

✅ **GOOD**:
```tsx
// app/(protected)/(admin)/users/page.tsx (Server Component)
export default async function UsersPage({ searchParams }: UsersPageProps) {
    const data = await loadUsersPageData(await searchParams)
    return <UserTabs initialData={data} />
}
```

---

## 2. Mô hình 2: TanStack Query (Client-side Query & Real-time State)

Dành cho: Các Client Components cần lấy dữ liệu động ở client, refetch khi tương tác, quản lý cache, polling, hoặc client-side detail modal/drawer.

### Quy chuẩn:
1. Luôn dùng `useQuery` kết hợp với **Query Key Factory** từ `@/constants` (`QUERY_KEY.<DOMAIN>.<ACTION>`).
2. Nếu trang đã có sẵn dữ liệu từ Server Component, truyền vào qua prop `initialData` để tránh giật lag UI (zero-flash loading).
3. Đọc dữ liệu thông qua các trạng thái chuẩn của TanStack Query: `data`, `isLoading`, `isError`, `refetch`.
4. Mọi thao tác ghi dữ liệu (mutation) dùng `useMutation` và **phải** invalidate query key liên quan qua `queryClient.invalidateQueries({ queryKey: QUERY_KEY.<DOMAIN>.<ACTION> })`.

### Ví dụ:

✅ **GOOD** (Client Component với TanStack Query):
```tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEY } from '@/constants'

export function SellerApplicationDetailPanel({ id, initialDetail }: Props) {
    const queryClient = useQueryClient()

    // 1. Client Query đồng bộ với Server initialData
    const { data: detail, isLoading, refetch } = useQuery({
        queryKey: QUERY_KEY.SELLER.APPLICATION_DETAIL(id),
        queryFn: async () => {
            const res = await getSellerApplicationDetailAdminAction(id)
            if (!res.ok) throw new Error(res.message)
            return res.data
        },
        initialData: initialDetail,
        enabled: Boolean(id),
    })

    // 2. Client Mutation tự động invalidate cache
    const approveMutation = useMutation({
        mutationFn: approveSellerApplicationAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.ALL })
        },
    })

    if (isLoading) return <Skeleton />
    return <div>...</div>
}
```

---

## 3. Cấm kỵ (Anti-patterns)

❌ **BAD** — Fetch thủ công trong `useEffect` và quản lý `loading`/`error` bằng `useState`:
```tsx
// ❌ CẤM TUYỆT ĐỐI
'use client'
export function BadComponent() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch('/api/data')
            .then(res => res.json())
            .then(d => setData(d))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <Spinner />
    return <div>{data?.title}</div>
}
```

❌ **BAD** — Tự chế query key dạng string trần `['seller', id]` thay vì dùng `QUERY_KEY` factory:
```tsx
// ❌ CẤM — Gây rò rỉ và không nhất quán khi invalidate
useQuery({
    queryKey: ['seller-detail', id],
    queryFn: ...
})

// ✅ ĐÚNG
useQuery({
    queryKey: QUERY_KEY.SELLER.APPLICATION_DETAIL(id),
    queryFn: ...
})
```
