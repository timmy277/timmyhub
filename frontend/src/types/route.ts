// Props mà Next truyền cho `error.tsx` / `global-error.tsx` (Next 16.3: `retry` đã ổn định — tải lại dữ liệu rồi
// render lại segment; `reset` chỉ xoá trạng thái lỗi nên không dùng).
export interface RouteErrorProps {
    error: Error & { digest?: string }
    retry: () => void
}
