import {
    ROW_ACTIONS_BUTTON_WIDTH_PX,
    ROW_ACTIONS_CELL_INSET_PX,
    ROW_ACTIONS_GAP_PX,
    ROW_ACTIONS_HEADER_MIN_WIDTH_PX,
} from '@/constants'

// Bề rộng cột thao tác tính từ **số nút thật sự render** cho người đang xem, không phải từ con số tối đa. Người chỉ
// có quyền xem không phải chịu một cột rộng bằng bốn nút; người có đủ bốn quyền thì ra đúng 164px như trước.
//
// Lấy max với bề rộng tiêu đề vì tiêu đề ("Thao tác" / "Actions") không co theo số nút — cột hẹp hơn chữ thì tiêu đề
// bị cắt, mà cắt tiêu đề thì không còn cách nào biết cột đó là gì.
export function rowActionsColumnWidth(actionCount: number): number {
    if (actionCount <= 0) return 0

    const buttonsWidth =
        actionCount * ROW_ACTIONS_BUTTON_WIDTH_PX +
        (actionCount - 1) * ROW_ACTIONS_GAP_PX +
        2 * ROW_ACTIONS_CELL_INSET_PX

    return Math.max(ROW_ACTIONS_HEADER_MIN_WIDTH_PX, buttonsWidth)
}

// So sánh hai mốc theo NGÀY LỊCH ĐỊA PHƯƠNG thay vì theo mốc thời gian đầy đủ. Ô lọc ngày của AG Grid chỉ cho chọn
// ngày, nên "trong khoảng 01/09 – 30/09" phải được hiểu là trọn hai ngày đó: bản ghi tạo lúc 30/09 23:59 vẫn thuộc
// khoảng. Cắt cả hai vế về 00:00 giờ địa phương rồi so sánh là đủ để có kết quả đó.
//
// Dùng đúng phép so này ở phía client để phần lọc tại chỗ của lưới (chạy trên 20 dòng server vừa trả về) không cắt
// oan bản ghi nào mà `createdFrom`/`createdTo` phía server đã cho qua — lệch một bên là lưới hiện ít dòng hơn con số
// phân trang.
//
// Đầu mút bỏ trống trả 0 nghĩa là "không chặn phía đó". Bộ lọc gọi `inRange` với `inRangeInclusive: true`, tức phép
// so là `compare(from, cell) >= 0 && compare(to, cell) <= 0`; giá trị 0 thoả cả hai vế nên khoảng để mở đúng phía
// người dùng không điền — chỉ điền "từ ngày" là "từ ngày đó trở đi", khớp với việc backend chỉ nhận `gte` mà không
// nhận `lte`. Đây là chủ ý, không phải sót.
export function compareByLocalDay(filterDate: Date | null, cellValue: unknown): number {
    if (!(filterDate instanceof Date) || Number.isNaN(filterDate.getTime())) return 0
    if (!(cellValue instanceof Date) || Number.isNaN(cellValue.getTime())) return 1

    const filterDay = startOfLocalDay(filterDate).getTime()
    const cellDay = startOfLocalDay(cellValue).getTime()

    if (cellDay === filterDay) return 0
    return cellDay < filterDay ? -1 : 1
}

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
