---
title: ADR-0009 — Prisma migrate thay db push --accept-data-loss
status: accepted
owner: Backend Lead
updated: 2026-09-16
related: [.claude/skills/prisma-schema/SKILL.md, docs/05-infra/cicd.md]
---

# ADR-0009 — Prisma migrate thay `db push --accept-data-loss`

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Backend Lead

## Bối cảnh

Bản gốc dùng `prisma db push --accept-data-loss` trong quy trình phát triển thường ngày — kể cả khi deploy. Hệ quả:
**không có lịch sử migration**, không thể biết schema production đã trải qua những thay đổi gì, không rollback được
theo bước, và `--accept-data-loss` là cờ tự động chấp nhận mất dữ liệu mà không có bước xác nhận thủ công — cực kỳ
rủi ro nếu chạy nhầm trên production.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ `db push`, chỉ bỏ cờ `--accept-data-loss` | Ít việc đổi | `db push` vẫn không tạo file migration, không có lịch sử, không review được thay đổi schema trong PR |
| **B. `prisma migrate dev` (local) + `prisma migrate deploy` (CI/CD)** | Mỗi thay đổi schema sinh file SQL migration có tên, review được trong PR như code thường; `migrate deploy` chạy tuần tự, có thể rollback theo migration; production không bao giờ chạy lệnh có khả năng mất dữ liệu tự động | Thao tác migration phức tạp hơn (phải tạo migration file, không "gõ lại schema là xong" như `db push`); migration có breaking change (đổi kiểu cột, xoá cột) cần quy trình 6 bước an toàn (backward-compatible trước, dọn sau) |
| C. Công cụ migration khác (Atlas, Flyway) song song Prisma | Mạnh hơn về một số kịch bản edge case | Thêm một công cụ, một nguồn sự thật nữa — Prisma migrate đã đủ cho nhu cầu, không cần thêm phức tạp |

## Quyết định

Chọn **B**. `prisma db push` **chỉ** được dùng trên máy cá nhân lúc thử nghiệm nhanh (prototype schema chưa chốt),
**không bao giờ** chạy trên môi trường chia sẻ (staging, production) — CI chặn bằng cách chỉ chạy `migrate deploy`,
không có quyền chạy `db push`.

Migration có rủi ro (đổi kiểu cột, xoá cột/bảng, đổi ràng buộc NOT NULL) theo quy trình 6 bước an toàn — chi tiết ở
skill `prisma-schema`: thêm cột mới (nullable) → backfill dữ liệu → deploy code đọc cả cột cũ/mới → chuyển ghi sang
cột mới → xác nhận không còn traffic dùng cột cũ → xoá cột cũ ở migration riêng, sau khi đã chắc chắn an toàn.

## Hệ quả

- Tên migration phải mô tả được việc (`20260916_add_variant_option_key`), không để Prisma tự sinh tên vô nghĩa.
- Migration file là artifact review được trong PR, giống mọi thay đổi code khác — checklist merge yêu cầu người
  review đọc migration SQL, không chỉ đọc `schema.prisma`.
