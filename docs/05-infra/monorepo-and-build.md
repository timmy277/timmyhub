---
title: Monorepo và hệ thống build — pnpm workspace + Turborepo
status: review
owner: DevOps
updated: 2026-09-19
related: [docs/05-infra/cicd.md, docs/06-quality/quality-gates.md, docs/01-architecture/service-catalog.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/04-frontend/storybook.md]
---

# Monorepo và hệ thống build

> Cập nhật theo [ADR-0015](../01-architecture/adr/ADR-0015-modular-monolith.md): backend không còn là 16+ service
> tách rời mà là **một app NestJS** (`backend/apps/api`) chứa mọi module domain, cộng một **process worker**
> (`backend/apps/worker`) chạy BullMQ, cộng frontend, cộng ba package dùng chung. Tổng cộng còn **3 đơn vị triển
> khai backend**: `api` (web), `worker` (job nhẹ: mail, index, thumbnail) và `worker-media` (ffmpeg, deployment
> riêng vì ăn CPU 100% và cần HPA theo độ sâu hàng đợi — xem
> [media-video-pipeline.md §5.3](../01-architecture/media-video-pipeline.md#53-worker)), hai cái worker dùng chung
> codebase `backend/apps/worker` nhưng khác entrypoint/image.
>
> Ngay cả với 3 đơn vị thay vì 18, Turborepo vẫn cần thiết: build/test frontend + `shared/contracts` + 3 app backend
> mà không có cache tăng dần thì CI vẫn chậm hơn mức chấp nhận được mỗi khi chỉ một phần nhỏ thay đổi.
>
> Turborepo giải quyết đúng một việc: **chỉ chạy lại tác vụ có đầu vào đã đổi**, phần còn lại lấy từ cache.

---

## 1. Bố cục

```
timmy-hub/
├── backend/
│   ├── apps/
│   │   ├── api/                  # web process — mọi module domain + module platform (HTTP/WS)
│   │   └── worker/                # process BullMQ — entrypoint mặc định (job nhẹ) và entrypoint --queue=media (ffmpeg)
│   ├── src/modules/<domain>/      # dùng chung giữa api và worker qua import trong cùng workspace package
│   └── libs/                      # thư viện dùng chung phía backend (không phải module domain)
├── frontend/
├── shared/
│   ├── contracts/               # @timmyhub/contracts — zod schema + kiểu + hợp đồng event
│   └── common/                  # @timmyhub/common — guard, decorator, filter, logger
├── pnpm-workspace.yaml
└── turbo.json
```

Ranh giới giữa các module domain (`src/modules/<domain>/`) không còn là ranh giới triển khai — nó là quy ước code,
thực thi bằng rule ESLint chặn import chéo module ngoài `index.ts` (xem
[service-catalog.md](../01-architecture/service-catalog.md)). `@timmyhub/rmq` (outbox RabbitMQ) bị loại bỏ: outbox
giờ chỉ phục vụ hiệu ứng phụ đi ra ngoài process (mail, webhook), dispatch bằng BullMQ trong `backend/apps/worker`,
không cần package riêng cho consumer RabbitMQ.

pnpm là trình quản lý gói duy nhất (`packageManager` trong `package.json`, `engines.node = 22`). Corepack bật trong CI
để phiên bản pnpm giống hệt nhau ở mọi máy.

---

## 2. `turbo.json`

```json
{
    "$schema": "https://turbo.build/schema.json",
    "globalDependencies": ["pnpm-lock.yaml", "tsconfig.base.json"],
    "globalEnv": ["NODE_ENV"],
    "tasks": {
        "build":      { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
        "lint":       { "dependsOn": ["^build"] },
        "typecheck":  { "dependsOn": ["^build"], "outputs": [] },
        "test":       { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
        "test:e2e":   { "dependsOn": ["build"], "cache": false },
        "dev":        { "cache": false, "persistent": true },
        "db:migrate": { "cache": false }
    }
}
```

Bốn quy tắc dễ sai:

1. **Khai đủ `outputs`.** Thiếu thì cache "trúng" nhưng không có file nào được khôi phục, và bước sau đứt.
2. **Việc chạm mạng hoặc database đặt `cache: false`** (`db:migrate`, `test:e2e`, `dev`). Cache một lần migrate là hỏng dữ liệu.
3. **Biến môi trường ảnh hưởng đầu ra phải khai trong `env`** của task, nếu không Turborepo trả cache của môi trường khác.
4. `NEXT_PUBLIC_*` nằm trong `env` của task `build` frontend — chúng được nhúng thẳng vào bundle.

---

## 3. Cache từ xa

Cache cục bộ chỉ giúp máy lập trình viên. Lợi ích thật ở CI đến từ **remote cache**: PR thứ hai chạm cùng service lấy
lại kết quả của PR thứ nhất.

| Phương án | Ghi chú |
|---|---|
| Vercel Remote Cache | Cấu hình 5 phút, miễn phí ở mức dùng của ta; gửi artifact build ra bên thứ ba |
| `turborepo-remote-cache` tự host (S3/R2) | Dữ liệu ở lại hạ tầng của ta; thêm một dịch vụ phải vận hành |

Chốt: **tự host trên R2** vì bundle frontend và `dist` backend là tài sản nội bộ. Dựng ở Sprint hạ tầng, trước đó dùng
cache cục bộ của GitHub Actions.

Bảo mật: khoá cache ký bằng `TURBO_REMOTE_CACHE_SIGNATURE_KEY`; không bao giờ đưa bí mật vào đầu vào tác vụ, vì đầu vào
quyết định khoá cache và khoá cache thì bị chia sẻ.

---

## 4. CI chỉ chạy phần đã đổi

```yaml
- run: pnpm turbo run lint typecheck test build --filter='...[origin/main]' --cache-dir=.turbo
```

`--filter='...[origin/main]'` chọn các package đổi **và** mọi package phụ thuộc chúng — sửa `@timmyhub/contracts` thì
toàn bộ service dùng nó đều được kiểm lại, đúng như mong muốn.

Bước dựng image Docker cũng dùng danh sách đó (`turbo run build --dry=json` → danh sách package) để chỉ dựng lại
image nào thật sự đổi trong 3 (`api`, `worker`, `worker-media` — hai cái sau chung Dockerfile, khác `CMD`).

| Chỉ số CI | Mục tiêu |
|---|---|
| PR chỉ sửa 1 module domain | < 6 phút |
| PR sửa `shared/contracts` | < 15 phút |
| Tỉ lệ trúng cache trên `main` | > 70% |

---

## 5. Phiên bản công cụ đã chốt

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node | 22 LTS | Cùng phiên bản ở dev, CI và image production |
| pnpm | 10.x qua Corepack | |
| Turborepo | 2.x | |
| **Storybook** | **9.x** | Nâng từ 8 đã ghi trong kế hoạch: nhẹ hơn, test runner chạy trên Vitest, addon a11y/interaction gộp vào lõi |
| TypeScript | 5.x, `strict: true` ở **mọi** package | |

Về Storybook 9: khác biệt đáng kể với 8 là bộ addon được gộp và test chạy bằng Vitest thay vì Jest — nghĩa là cấu hình
test của frontend chỉ còn một bộ. Cần kiểm lại addon bên thứ ba trước khi nâng; addon nào chưa hỗ trợ 9 thì bỏ, không
giữ Storybook ở bản cũ chỉ vì một addon.

---

## 6. Checklist

- [ ] Mọi task có `outputs` đúng; đã thử xoá `dist` rồi chạy lại để xác nhận cache khôi phục đủ file
- [ ] Task chạm database/mạng đặt `cache: false`
- [ ] Biến môi trường ảnh hưởng đầu ra đã khai trong `env`
- [ ] CI dùng `--filter='...[origin/main]'`, chỉ dựng lại image (`api`/`worker`/`worker-media`) thật sự đổi
- [ ] Remote cache có ký chữ ký; không có bí mật trong đầu vào tác vụ
- [ ] Node/pnpm/TS giống nhau ở dev, CI, production
