---
title: TimmyHub — Mục lục tài liệu
status: approved
owner: Tech Lead
updated: 2026-09-19
related: [docs/00-overview/product-overview.md, docs/07-plan/implementation-plan.md, docs/08-handoff/handoff.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md]
---

# TimmyHub — Tài liệu dự án

TimmyHub là sàn thương mại điện tử đa vai trò (kiểu Shopee) kiêm **trung tâm trao đổi giữa admin – user – seller**:
seller đăng bán sản phẩm, đăng bài post và video quảng cáo, quản lý doanh số; user mua hàng, tương tác nội dung;
admin kiểm duyệt và vận hành toàn sàn.

Bản này (`timmy-hub`) là **thế hệ 2** của dự án `TimmyHub` cũ: backend viết lại thành một **modular monolith** NestJS
(`backend/apps/api`, 16+ module domain trong một app, một database — xem
[ADR-0015](01-architecture/adr/ADR-0015-modular-monolith.md); ban đầu dự tính tách microservices, đã đổi hướng
trước khi code, xem ADR-0001..0003 đã bị supersede), frontend đổi sang shadcn/ui + Tailwind, auth chuyển sang
NextAuth, i18n chuyển sang next-intl.

## Quy ước tài liệu

| Hạng mục | Quy ước |
|---|---|
| Ngôn ngữ | Văn xuôi **tiếng Việt**; identifier (service, bảng, field, route, enum, event) **tiếng Anh** |
| Requirement | Viết theo **EARS** tiếng Việt, mỗi requirement có ID `REQ-<DOMAIN>-<nnn>` |
| Truy vết | `FEAT-*` → `REQ-*` → `TASK-*`; quyết định kiến trúc ghi thành `ADR-*`; sự kiện ghi thành `EVT-*` |
| Sơ đồ | Mermaid inline, không dùng ảnh nhị phân |
| Trạng thái | Mỗi file có front-matter `status: draft \| review \| approved` |

Chi tiết đầy đủ các mẫu câu EARS và định dạng ID: [docs/06-quality/definition-of-done.md](06-quality/definition-of-done.md).

## Bản đồ đọc theo vai trò

### Dev mới vào dự án (đọc theo thứ tự, ~90 phút)
1. [00-overview/product-overview.md](00-overview/product-overview.md) — hiểu sản phẩm và các actor
2. [00-overview/glossary.md](00-overview/glossary.md) — thuật ngữ, tránh hiểu nhầm tên entity
3. [01-architecture/system-architecture.md](01-architecture/system-architecture.md) — bức tranh tổng
4. [01-architecture/service-catalog.md](01-architecture/service-catalog.md) — module `platform` + 16 module domain làm gì
5. [08-handoff/onboarding.md](08-handoff/onboarding.md) — dựng máy và chạy được hệ thống
6. [06-quality/coding-standards.md](06-quality/coding-standards.md) — viết code đúng chuẩn dự án

### Backend lead
1. [01-architecture/adr/ADR-0015-modular-monolith.md](01-architecture/adr/ADR-0015-modular-monolith.md) — quyết định kiến trúc nền, đọc trước tiên
2. [01-architecture/service-catalog.md](01-architecture/service-catalog.md)
3. [01-architecture/communication-patterns.md](01-architecture/communication-patterns.md) — DI trong process, EventEmitter2, outbox chỉ cho hiệu ứng ngoài
4. [01-architecture/data-architecture.md](01-architecture/data-architecture.md) — một database chung, ranh giới module bằng quy ước
5. [01-architecture/event-catalog.md](01-architecture/event-catalog.md) — hợp đồng sự kiện giữa các module
6. [02-domain/domain-model.md](02-domain/domain-model.md) + [02-domain/schemas/](02-domain/schemas/)
7. [03-specs/](03-specs/) — spec từng domain
8. [01-architecture/concurrency-and-consistency.md](01-architecture/concurrency-and-consistency.md) — chống oversell, tranh chấp đồng thời
9. [01-architecture/rbac-advanced.md](01-architecture/rbac-advanced.md) — phân quyền 4 lớp, phạm vi dữ liệu
10. [01-architecture/adr/](01-architecture/adr/) — vì sao chọn như vậy

### Frontend lead
1. [04-frontend/fe-architecture.md](04-frontend/fe-architecture.md)
2. [04-frontend/routes.md](04-frontend/routes.md)
3. [04-frontend/auth-nextauth.md](04-frontend/auth-nextauth.md)
4. [04-frontend/design-system.md](04-frontend/design-system.md) + [04-frontend/component-inventory.md](04-frontend/component-inventory.md)
5. [04-frontend/state-and-data.md](04-frontend/state-and-data.md)
6. [01-architecture/api-conventions.md](01-architecture/api-conventions.md) — hợp đồng với backend
7. [04-frontend/seo.md](04-frontend/seo.md) + [04-frontend/motion-and-effects.md](04-frontend/motion-and-effects.md) — ràng buộc render và hiệu ứng

### DevOps
1. [05-infra/local-dev.md](05-infra/local-dev.md)
2. [05-infra/docker.md](05-infra/docker.md) → [05-infra/kubernetes.md](05-infra/kubernetes.md)
3. [05-infra/environments.md](05-infra/environments.md)
4. [05-infra/cicd.md](05-infra/cicd.md)
5. [05-infra/runbook.md](05-infra/runbook.md)
6. [01-architecture/observability.md](01-architecture/observability.md)

### PM / PO
1. [00-overview/product-overview.md](00-overview/product-overview.md)
2. [00-overview/feature-inventory.md](00-overview/feature-inventory.md) — toàn bộ tính năng và trạng thái
3. [07-plan/milestones.md](07-plan/milestones.md) + [07-plan/implementation-plan.md](07-plan/implementation-plan.md)
4. [07-plan/risks.md](07-plan/risks.md)

## Tài liệu chuyên đề (đọc khi chạm tới)

Các tài liệu cắt ngang nhiều domain, không thuộc lối đọc nào ở trên nhưng **bắt buộc** đọc trước khi làm phần tương ứng:

| Tài liệu | Đọc khi |
|---|---|
| [01-architecture/technology-radar.md](01-architecture/technology-radar.md) | Định thêm thư viện/công cụ vào stack — có mục ADOPT/TRIAL/ASSESS/HOLD kèm lý do |
| [01-architecture/concurrency-and-consistency.md](01-architecture/concurrency-and-consistency.md) | Code chạm tồn kho, tiền, voucher, flash sale |
| [01-architecture/rbac-advanced.md](01-architecture/rbac-advanced.md) | Thêm quyền, phạm vi dữ liệu, uỷ quyền, mạo danh, break-glass |
| [01-architecture/adr/ADR-0015-modular-monolith.md](01-architecture/adr/ADR-0015-modular-monolith.md) | Trước khi thêm module mới, gọi chéo module, hoặc cân nhắc tách một module thành service riêng |
| [01-architecture/i18n-backend.md](01-architecture/i18n-backend.md) | Sinh thông điệp lỗi, nội dung gửi ra, tìm kiếm đa ngôn ngữ |
| [02-domain/product-variant.md](02-domain/product-variant.md) | Làm sản phẩm, biến thể, giá, tồn kho, snapshot đơn hàng |
| [02-domain/order-dispute.md](02-domain/order-dispute.md) | Làm tranh chấp đơn, hoàn tiền, ký quỹ, hạn xử lý |
| [04-frontend/seo.md](04-frontend/seo.md) | Thêm loại trang mới hoặc đổi cách render |
| [04-frontend/motion-and-effects.md](04-frontend/motion-and-effects.md) | Làm hiệu ứng, chuyển cảnh, parallax |
| [06-quality/coding-standards.md](06-quality/coding-standards.md) | Trước PR đầu tiên |
| [06-quality/performance.md](06-quality/performance.md) | Trang/endpoint chậm, hoặc trước khi phát hành màn hình nặng |
| [06-quality/quality-gates.md](06-quality/quality-gates.md) | Dựng CI cho a11y, Lighthouse, ngân sách gói |
| [06-quality/git-hooks.md](06-quality/git-hooks.md) | Cài Husky, viết commit đúng chuẩn, thêm scope mới |
| [01-architecture/media-video-pipeline.md](01-architecture/media-video-pipeline.md) | Làm upload, transcode, phát video (HLS, ffmpeg worker, tus) |
| [04-frontend/editor-and-uploader.md](04-frontend/editor-and-uploader.md) | Làm trình soạn thảo TipTap, trình tải lên Uppy, trình phát video |
| [05-infra/monorepo-and-build.md](05-infra/monorepo-and-build.md) | Đụng tới CI, Turborepo, phiên bản công cụ |

## Skill cho Claude Code

`.claude/skills/` chứa **10 skill** dự án; Claude tự nạp khi gặp loại việc tương ứng. Luật cứng và bản đồ tài liệu
nằm ở [`CLAUDE.md`](../CLAUDE.md) ở gốc repo, Claude đọc tự động mỗi phiên làm việc.

| Skill | Dùng cho |
|---|---|
| `spec-domain` | Viết/cập nhật spec một domain trong `03-specs/` |
| `docs-audit` | Rà soát link chết, truy vết ID, số liệu lệch trong `docs/` |
| `ui-component` | Tạo component giao diện đúng design system, đủ 7 trạng thái, đạt WCAG 2.2 AA |
| `page-build` | Dựng một route Next.js hoàn chỉnh: RSC, SEO + JSON-LD, loading/error/not-found, ngân sách |
| `design-review` | Rà soát UI/UX: 10 heuristic Nielsen, Laws of UX, phân cấp thị giác, WCAG 2.2 AA |
| `nest-endpoint` | Thêm endpoint backend đúng phân quyền, audit, idempotency, outbox |
| `prisma-schema` | Đổi mô hình dữ liệu: kiểu tiền/thời gian, index, khoá lạc quan, migration an toàn |
| `code-review` | Rà code trước khi merge: đua tranh, tiền, phạm vi dữ liệu, ranh giới module, bảo mật |
| `perf-audit` | Truy nguyên nhân chậm: gói JS, Core Web Vitals, N+1, index, cache, hàng đợi |
| `i18n-strings` | Trích chuỗi cứng, đặt tên khoá, ICU plural, thêm một ngôn ngữ mới |

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| [00-overview/](00-overview/) | Tổng quan sản phẩm, danh mục tính năng, vai trò & quyền, thuật ngữ |
| [01-architecture/](01-architecture/) | Kiến trúc hệ thống (modular monolith), danh mục module, giao tiếp, dữ liệu, sự kiện, bảo mật, quan sát, ADR |
| [02-domain/](02-domain/) | Mô hình miền, ERD, schema Prisma theo từng module, chuyên đề biến thể & tranh chấp đơn |
| [03-specs/](03-specs/) | 23 domain spec, mỗi domain có `requirements.md` / `design.md` / `tasks.md` |
| [04-frontend/](04-frontend/) | Kiến trúc FE, route, design system, component, state, auth, i18n, Storybook, SEO, chuyển động |
| [05-infra/](05-infra/) | Dev local, Docker, Kubernetes, CI/CD, biến môi trường, runbook |
| [06-quality/](06-quality/) | Chuẩn code, git hook và quy ước commit, hiệu năng, cổng chất lượng, chiến lược test, Definition of Done |
| [07-plan/](07-plan/) | Kế hoạch triển khai, mốc, rủi ro |
| [08-handoff/](08-handoff/) | Bàn giao, onboarding, di trú từ hệ thống cũ |

## Trạng thái tài liệu

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| 00-overview | approved | Chốt phạm vi MVP |
| 01-architecture | approved | ADR-0004..0012 + ADR-0014 + ADR-0015 đã chốt; ADR-0001/0002/0003 (microservices, database-per-service, RabbitMQ) `superseded by ADR-0015`; ADR-0013/0016/0017 còn là ứng viên ở `technology-radar.md` |
| 02-domain | approved | Schema có thể điều chỉnh khi implement, phải cập nhật lại doc |
| 03-specs | approved | 9 domain MVP ưu tiên implement trước |
| 04-frontend | approved | |
| 05-infra | approved | K8s manifest là mẫu tham khảo, cần điều chỉnh theo cluster thật |
| 06-quality | approved | |
| 07-plan | approved | Ước lượng cần rà lại sau Sprint 1 |
| 08-handoff | approved | |

## Nguyên tắc cập nhật

1. Code và doc đi cùng PR. Đổi API/schema/event mà không sửa doc tương ứng là **không đạt Definition of Done**.
2. Đổi quyết định kiến trúc → viết ADR mới, **không sửa ADR cũ**; ADR cũ chuyển `status: superseded by ADR-xxxx`.
3. Thêm requirement → cấp ID mới, **không tái sử dụng ID đã xoá**.
4. Mỗi file sửa xong phải cập nhật `updated:` trong front-matter.
