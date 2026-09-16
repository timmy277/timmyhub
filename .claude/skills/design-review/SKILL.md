---
name: design-review
description: Rà soát UI/UX một màn hình hoặc một PR giao diện TimmyHub theo 10 heuristic Nielsen, Laws of UX, hệ thống phân cấp thị giác, WCAG 2.2 AA và design system của dự án. Dùng khi được yêu cầu "review giao diện", "màn này xấu/khó dùng", "kiểm tra UX", "đánh giá thiết kế", hoặc trước khi merge một PR frontend.
---

# Rà soát UI/UX

Chấm điểm từng mục theo thang **Đạt / Cần sửa / Chặn merge**, báo cáo dạng bảng, mỗi lỗi kèm **vị trí file + dòng** và
**cách sửa cụ thể**. Không viết nhận xét chung chung kiểu "nên đẹp hơn".

## 0. Trước khi chấm

Xác định màn này thuộc luồng nào (mua hàng · bán hàng · quản trị) và ai dùng. Luồng ra tiền
(chi tiết sản phẩm, giỏ, thanh toán) chấm nghiêm hơn một bậc: lỗi mức "Cần sửa" ở đó thành "Chặn merge".

Đọc `docs/04-frontend/design-system.md`, `docs/04-frontend/motion-and-effects.md`,
`docs/06-quality/performance.md` trước khi kết luận — quy ước của dự án thắng sở thích cá nhân.

## 1. Mười heuristic Nielsen — soi theo thứ tự này

| # | Heuristic | Hỏi cụ thể trên màn đang xem |
|---|---|---|
| 1 | Trạng thái hệ thống hiển thị rõ | Bấm nút có phản hồi < 100 ms không? Việc chạy > 1 s có tiến trình thật (phần trăm, bước) hay chỉ spinner vô hạn? Upload/transcode có nói "còn bao lâu"? |
| 2 | Khớp với thế giới thật | Nhãn dùng từ người mua hiểu ("Đơn đã giao"), không phải từ trong database (`FULFILLED`)? Tiền hiển thị `1.250.000 ₫` chứ không `1250000`? |
| 3 | Người dùng kiểm soát được | Có đường thoát khỏi mọi modal/wizard? Thao tác phá huỷ có hoàn tác (undo) hoặc xác nhận? Huỷ upload được? |
| 4 | Nhất quán | Cùng một hành động có cùng nhãn, cùng vị trí, cùng màu ở mọi màn? Nút chính luôn nằm cùng phía? |
| 5 | Ngăn lỗi từ đầu | Chặn được thì đừng để báo lỗi sau: vô hiệu hoá ngày không hợp lệ, giới hạn ký tự ngay, cảnh báo trước khi vượt tồn kho |
| 6 | Nhận ra thay vì nhớ | Bộ lọc đang bật có hiện thành chip? Người dùng có phải nhớ mã đơn từ màn trước không? |
| 7 | Linh hoạt cho người thạo | Có phím tắt, thao tác hàng loạt, lưu bộ lọc cho màn quản trị? |
| 8 | Tối giản | Mỗi phần tử trên màn có lý do tồn tại? Bỏ đi thì người dùng có mất gì không? |
| 9 | Thông báo lỗi giúp sửa được | Lỗi nói **cái gì sai, ở đâu, sửa thế nào**? "Đã xảy ra lỗi" là **Chặn merge** |
| 10 | Trợ giúp đúng chỗ | Trường khó (mã số thuế, phí ship, chính sách hoàn) có gợi ý tại chỗ? |

## 2. Laws of UX — dùng để xếp bố cục, không phải để trang trí

- **Jakob**: sàn TMĐT có quy ước sẵn (giỏ ở góc phải trên, giá dưới ảnh, biến thể trước nút mua). Đi ngược quy ước
  phải có lý do viết ra được.
- **Fitts**: hành động chính là mục tiêu to nhất, gần ngón tay cái nhất. Trên di động, nút mua nằm ở thanh dính đáy màn.
- **Hick**: > 7 lựa chọn ngang hàng thì gom nhóm hoặc phân cấp. Menu 20 mục phẳng là lỗi.
- **Miller**: chia thông tin thành cụm 5–7; mã đơn, số điện thoại, số tài khoản phải tách nhóm.
- **Proximity/Similarity (Gestalt)**: khoảng cách **trong** một nhóm luôn nhỏ hơn khoảng cách **giữa** các nhóm. Đây là
  lỗi hay gặp nhất và cũng dễ sửa nhất.
- **Von Restorff**: một màn chỉ có **một** hành động nổi bật. Hai nút primary cạnh nhau = không có nút nào primary.
- **Doherty**: phản hồi dưới 400 ms thì người dùng giữ được mạch; chậm hơn phải có skeleton hoặc optimistic update.

## 3. Phân cấp thị giác

| Hạng mục | Quy định |
|---|---|
| Kích cỡ chữ | Tối đa 3 cấp trên một màn; cấp nhỏ nhất ≥ 14 px, thân bài ≥ 16 px trên di động |
| Độ dài dòng | 45–75 ký tự cho đoạn văn; vượt là khó đọc |
| Khoảng cách | Theo thang 4 px của design system, **không** số lẻ tự chế (`13px`, `7px`) |
| Màu | Màu thương hiệu dành cho hành động, không dùng để trang trí; trạng thái không **chỉ** dựa vào màu (kèm icon/chữ) |
| Ảnh | Luôn có tỉ lệ cố định ⇒ CLS = 0; ảnh sản phẩm cùng tỉ lệ trong một lưới |
| Trạng thái rỗng | Có tranh/icon, một câu giải thích, và **một hành động** đưa người dùng đi tiếp |

## 4. Bảy trạng thái bắt buộc

Kiểm đủ: mặc định · đang tải · rỗng · lỗi · không có quyền · vô hiệu hoá · thành công.
Thiếu bất kỳ trạng thái nào (đặc biệt **rỗng** và **không có quyền**) → **Chặn merge**.
Skeleton phải đúng kích thước nội dung thật, lệch kích thước là gây nhảy layout.

## 5. Khả năng truy cập — WCAG 2.2 AA

| Kiểm | Cách kiểm nhanh |
|---|---|
| Bàn phím | Tab xuyên toàn màn, làm được mọi việc, không bẫy focus, vòng focus luôn thấy được |
| Tương phản | ≥ 4.5:1 chữ thường, ≥ 3:1 chữ lớn và viền thành phần |
| Vùng bấm | ≥ 24×24 px (2.5.8), khuyến nghị 44×44 px trên di động |
| Nhãn | Mọi input có `<label>` thật; icon-button có `aria-label` |
| Lỗi form | Gắn `aria-describedby`, đọc được bằng trình đọc màn hình, focus nhảy về trường sai đầu tiên |
| Focus không bị che (2.4.11) | Thanh dính/header không che phần tử đang focus |
| Chuyển động | `prefers-reduced-motion` tắt hết hiệu ứng lớn, parallax, autoplay |

Chạy thêm axe (Storybook/Playwright) theo `docs/06-quality/quality-gates.md` — nhưng nhớ: công cụ tự động bắt được
tối đa ~40%, phần còn lại là việc của lượt rà soát này.

## 6. Kiểm theo dự án

- Token của design system, không hardcode màu/khoảng cách.
- Chuỗi hiển thị qua `next-intl`; kiểm cả bản tiếng Việt **và** tiếng Anh — tiếng Anh thường dài hơn 30%, dễ vỡ layout.
- Tiền định dạng qua `Intl.NumberFormat` từ chuỗi decimal, không `toLocaleString()` trên `number` tự tính.
- Thư viện nặng nạp động; kiểm `size-limit` không tăng.
- Ảnh dùng `next/image`, `priority` chỉ cho ảnh LCP.
- Responsive thật ở 360 px, 768 px, 1280 px — không chỉ thu nhỏ cửa sổ trên desktop.

## 7. Mẫu báo cáo

```
| Mức | Vị trí | Vấn đề | Heuristic | Cách sửa |
|---|---|---|---|---|
| Chặn merge | ProductCard.tsx:42 | Không có trạng thái rỗng khi hết biến thể | #1, 7 trạng thái | Thêm EmptyState + nút "Xem sản phẩm tương tự" |
| Cần sửa | CheckoutSummary.tsx:88 | Hai nút primary cạnh nhau | Von Restorff | Nút "Quay lại" chuyển sang ghost |
```

Kết thúc bằng: số lỗi theo mức · ba việc nên sửa trước · ước lượng thời gian dọn.

## 8. Tự kiểm trước khi trả lời

- [ ] Mỗi lỗi có vị trí cụ thể và cách sửa cụ thể
- [ ] Đã phân biệt "sai quy ước dự án" với "sở thích cá nhân" — cái sau chỉ được nêu ở mức gợi ý
- [ ] Đã kiểm bằng bàn phím, không chỉ nhìn
- [ ] Đã kiểm ở 360 px
- [ ] Không đề xuất thay đổi kéo theo sửa design system mà không nói rõ chi phí
