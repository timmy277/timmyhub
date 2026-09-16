---
title: ADR-0010 — Zod là nguồn validation duy nhất
status: accepted
owner: Backend Lead
updated: 2026-09-16
related: [docs/01-architecture/api-conventions.md, docs/06-quality/coding-standards.md]
---

# ADR-0010 — Zod là nguồn validation duy nhất

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Backend Lead

## Bối cảnh

Bản gốc **lẫn cả class-validator và không có validation nào chạy thật** ở một số DTO — nhiều `@Body() body: any`
hoặc DTO có decorator `class-validator` nhưng `ValidationPipe` không được bật global nhất quán, nên decorator không
có tác dụng thực tế. Kết quả: endpoint nhận dữ liệu sai định dạng mà không báo lỗi rõ ràng, lỗi chỉ lộ ra khi Prisma
ném exception khó hiểu ở tầng dưới.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Sửa lại class-validator cho đúng, bật `ValidationPipe` global | Ít việc đổi so với bản gốc | Schema định nghĩa bằng decorator (`@IsString()`, `@IsInt()`) tách biệt hoàn toàn khỏi type TypeScript — dễ lệch nhau; **không dùng chung được với frontend** (class-validator không chạy trong trình duyệt hợp lý) |
| **B. Zod, qua `nestjs-zod`, là nguồn validation duy nhất, dùng chung FE/BE qua `@timmyhub/contracts`** | Một schema định nghĩa cả runtime validation **và** suy ra type TypeScript (`z.infer`) — không thể lệch nhau vì cùng một nguồn; dùng được cả ở frontend (`react-hook-form` + `zodResolver`) lẫn backend; báo lỗi có cấu trúc rõ ràng, dễ map sang thông điệp lỗi theo `code` | Cần bọc thêm `nestjs-zod` để tích hợp với pipe/decorator của Nest — có đường cong học nhỏ nếu quen class-validator |
| C. Yup | Tương tự Zod về ý tưởng | Hệ sinh thái TypeScript-first yếu hơn Zod, cộng đồng NestJS ít dùng hơn |

## Quyết định

Chọn **B**. Zod là **nguồn duy nhất** cho mọi validation input — request body, query, param, payload event, biến môi
trường (`zod` validate `.env` lúc khởi động, fail-fast nếu thiếu biến bắt buộc). **Cấm** import `class-validator` ở
bất kỳ đâu, chặn bằng ESLint `no-restricted-imports`.

Schema dùng chung FE/BE đặt trong `@timmyhub/contracts`, bao gồm cả payload event (`EVT-*`) — event contract cũng
phải qua zod để consumer không nhận payload sai hình dạng.

## Hệ quả

- Type TypeScript của DTO **luôn suy ra** từ schema Zod bằng `z.infer<typeof Schema>`, không viết interface tay song
  song — viết tay song song là dấu hiệu vi phạm ADR này.
- Input mới không có zod schema thì không được merge — checklist review có mục riêng cho việc này
  (`coding-standards.md` §9).
