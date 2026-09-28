// Mutex refresh phiên DÙNG CHUNG giữa các tab (design.md §5 yêu cầu mutex refresh phía client).
//
// Mutex trong RAM chỉ chặn được các request trong cùng một tab — race thật xảy ra giữa các tab, khi mỗi tab
// đọc session gần như cùng lúc sau khi access token hết hạn. Web Locks khoá theo origin nên mọi tab của cùng
// profile trình duyệt xếp hàng qua đây: tab thua đợi tab thắng xoay token xong rồi mới đọc session (lúc đó
// cookie phiên mới của tab thắng đã nằm trong cookie jar dùng chung).
//
// Nhờ vậy KHÔNG bao giờ có hai request refresh chạy đồng thời, nên BE không phải đoán xem một lần dùng lại
// refresh token là race hợp lệ hay là token bị đánh cắp (REQ-IDN-006 thu hồi toàn bộ phiên).
const REFRESH_LOCK_NAME = 'timmyhub-auth-refresh'

export async function withAuthRefreshLock<T>(task: () => Promise<T>): Promise<T> {
    // Trình duyệt không hỗ trợ Web Locks (hoặc chạy ở môi trường không có `navigator`) — chạy thẳng; vẫn còn
    // mutex trong tab ở interceptor axios.
    if (typeof navigator === 'undefined' || typeof navigator.locks?.request !== 'function') {
        return task()
    }

    return navigator.locks.request(REFRESH_LOCK_NAME, task)
}
