---
title: TimmyHub — Mục lục tài liệu
status: approved
owner: Tech Lead
updated: 2026-09-15
related: [docs/00-overview/product-overview.md, docs/07-plan/implementation-plan.md, docs/08-handoff/handoff.md]
---

# TimmyHub — Tài liệu dự án

TimmyHub là sàn thương mại điện tử đa vai trò (kiểu Shopee) kiêm **trung tâm trao đổi giữa admin – user – seller**:
seller đăng bán sản phẩm, đăng bài post và video quảng cáo, quản lý doanh số; user mua hàng, tương tác nội dung;
admin kiểm duyệt và vận hành toàn sàn.

Bản này (`timmy-hub`) là **thế hệ 2** của dự án `TimmyHub` cũ: backend tách thành microservices, frontend đổi sang
shadcn/ui + Tailwind, auth chuyển sang NextAuth, i18n chuyển sang next-intl.

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
4. [01-architecture/service-catalog.md](01-architecture/service-catalog.md) — 17 service làm gì
5. [08-handoff/onboarding.md](08-handoff/onboarding.md) — dựng máy và chạy được hệ thống
6. [06-quality/coding-standards.md](06-quality/coding-standards.md) — viết code đúng chuẩn dự án

### Backend lead
1. [01-architecture/service-catalog.md](01-architecture/service-catalog.md)
2. [01-architecture/communication-patterns.md](01-architecture/communication-patterns.md) — RabbitMQ, saga, outbox, idempotency
3. [01-architecture/data-architecture.md](01-architecture/data-architecture.md) — database-per-service
4. [01-architecture/event-catalog.md](01-architecture/event-catalog.md) — hợp đồng sự kiện giữa các service
5. [02-domain/domain-model.md](02-domain/domain-model.md) + [02-domain/schemas/](02-domain/schemas/)
6. [03-specs/](03-specs/) — spec từng domain
7. [01-architecture/adr/](01-architecture/adr/) — vì sao chọn như vậy

### Frontend lead
1. [04-frontend/fe-architecture.md](04-frontend/fe-architecture.md)
2. [04-frontend/routes.md](04-frontend/routes.md)
3. [04-frontend/auth-nextauth.md](04-frontend/auth-nextauth.md)
4. [04-frontend/design-system.md](04-frontend/design-system.md) + [04-frontend/component-inventory.md](04-frontend/component-inventory.md)
5. [04-frontend/state-and-data.md](04-frontend/state-and-data.md)
6. [01-architecture/api-conventions.md](01-architecture/api-conventions.md) — hợp đồng với backend

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

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| [00-overview/](00-overview/) | Tổng quan sản phẩm, danh mục tính năng, vai trò & quyền, thuật ngữ |
| [01-architecture/](01-architecture/) | Kiến trúc hệ thống, danh mục service, giao tiếp, dữ liệu, sự kiện, bảo mật, quan sát, ADR |
| [02-domain/](02-domain/) | Mô hình miền, ERD, schema Prisma theo từng service |
| [03-specs/](03-specs/) | 23 domain spec, mỗi domain có `requirements.md` / `design.md` / `tasks.md` |
| [04-frontend/](04-frontend/) | Kiến trúc FE, route, design system, component, state, auth, i18n, Storybook |
| [05-infra/](05-infra/) | Dev local, Docker, Kubernetes, CI/CD, biến môi trường, runbook |
| [06-quality/](06-quality/) | Chuẩn code, chiến lược test, Definition of Done |
| [07-plan/](07-plan/) | Kế hoạch triển khai, mốc, rủi ro |
| [08-handoff/](08-handoff/) | Bàn giao, onboarding, di trú từ hệ thống cũ |

## Trạng thái tài liệu

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| 00-overview | approved | Chốt phạm vi MVP |
| 01-architecture | approved | ADR-0001..0012 đã chốt |
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
