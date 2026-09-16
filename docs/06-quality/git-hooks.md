---
title: Git hook và quy ước commit — Husky, lint-staged, commitlint
status: review
owner: Tech Lead
updated: 2026-09-16
related: [docs/06-quality/coding-standards.md, docs/06-quality/quality-gates.md, docs/05-infra/monorepo-and-build.md, docs/05-infra/cicd.md]
---

# Git hook và quy ước commit

> Hook cục bộ là **vòng phản hồi nhanh**, không phải cổng chất lượng. Mọi thứ hook chặn thì CI cũng phải chặn lại —
> vì hook bỏ qua được bằng `--no-verify` và không chạy trên máy người chưa cài.
>
> Nguyên tắc chọn việc cho hook: **chỉ giữ thứ chạy dưới 10 giây trên file đã đổi.** Hook chậm là hook bị vô hiệu hoá.

---

## 1. Phân công giữa hook và CI

| Bước | Công cụ | Chặn cái gì | Thời gian mục tiêu |
|---|---|---|---|
| `pre-commit` | `lint-staged`: Prettier → ESLint `--fix` | Định dạng, lỗi lint trên **file đã stage** | < 5 giây |
| `commit-msg` | `commitlint` | Thông điệp commit sai Conventional Commits | < 1 giây |
| `pre-push` | `tsc --noEmit` trên package bị ảnh hưởng | Lỗi kiểu | < 60 giây |
| CI | Toàn bộ lint, typecheck, test, build, cổng chất lượng | Mọi thứ, kể cả khi hook bị bỏ qua | Xem `docs/05-infra/cicd.md` |

Cố ý **không** đưa vào hook: chạy test toàn bộ, build, Lighthouse, axe, `size-limit`. Chúng thuộc về CI.
Cố ý **không** để `tsc` trong `pre-commit`: trên monorepo 18 đơn vị, typecheck mất hàng chục giây, người ta sẽ
`--no-verify` ngay tuần đầu.

---

## 2. Cài đặt

```bash
pnpm add -D -w husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init
```

`package.json` ở gốc workspace:

```json
{
    "scripts": {
        "prepare": "husky"
    }
}
```

`prepare` chạy tự động sau `pnpm install`, nên người mới clone về không phải nhớ bước nào.
Trong CI đặt `HUSKY=0` để không cài hook trên runner.

---

## 3. Các hook

`.husky/pre-commit`

```sh
pnpm exec lint-staged
```

`.husky/commit-msg`

```sh
pnpm exec commitlint --edit "$1"
```

`.husky/pre-push`

```sh
pnpm turbo run typecheck --filter='...[origin/main]'
```

---

## 4. `lint-staged`

`.lintstagedrc.json`

```json
{
    "*.{ts,tsx,js,jsx}": [
        "prettier --write",
        "eslint --fix --max-warnings=0"
    ],
    "*.{json,md,yml,yaml,css}": [
        "prettier --write"
    ],
    "*.prisma": [
        "prisma format"
    ]
}
```

Ba điều dễ sai:

1. **`--max-warnings=0`** là bắt buộc. Không có nó, cảnh báo tích tụ đến mức không ai đọc log lint nữa.
2. Chỉ chạy trên file đã stage — đó là lý do dùng `lint-staged` thay vì `eslint .`.
3. Không thêm `git add` vào lệnh; `lint-staged` tự lo, thêm vào sẽ nuốt mất thay đổi chưa stage.

---

## 5. Quy ước commit

Theo **Conventional Commits**. `commitlint.config.js`:

```js
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [2, 'always', [
            'feat', 'fix', 'perf', 'refactor', 'docs', 'test',
            'build', 'ci', 'chore', 'revert', 'style',
        ]],
        'scope-empty': [2, 'never'],
        'scope-enum': [2, 'always', [
            // service
            'gateway', 'identity', 'seller', 'catalog', 'cart', 'order', 'payment',
            'promotion', 'content', 'engagement', 'chat', 'notification', 'search',
            'media', 'media-worker', 'analytics', 'audit', 'masterdata',
            // package dùng chung
            'contracts', 'common', 'rmq',
            // khác
            'frontend', 'docs', 'infra', 'ci', 'deps',
        ]],
        'subject-case': [0],                    // tiêu đề tiếng Việt, không ép kiểu chữ
        'subject-max-length': [2, 'always', 72],
        'body-max-line-length': [2, 'always', 100],
    },
}
```

Cấu trúc:

```
<type>(<scope>): <tiêu đề tiếng Việt, câu mệnh lệnh, không dấu chấm cuối>

<thân: vì sao thay đổi, không phải thay đổi cái gì — diff đã nói cái gì rồi>

Refs: REQ-ORD-012, TASK-ORD-021
```

Ví dụ:

```
feat(order): thêm huỷ đơn khi chưa xác nhận

Người mua đang phải nhắn cho seller để huỷ. Thêm endpoint huỷ có kiểm
trạng thái nguồn và hoàn lại tồn kho trong cùng transaction.

Refs: REQ-ORD-018, TASK-ORD-034
```

Quy định kèm theo:

| Hạng mục | Quy định |
|---|---|
| `scope` | **Bắt buộc**, lấy từ `scope-enum` ở trên. Đụng nhiều service thì tách commit, không dùng scope gộp |
| Tiêu đề | Tiếng Việt, ≤ 72 ký tự, động từ mệnh lệnh ("thêm", "sửa", "bỏ"), không dấu chấm cuối |
| Thân | Giải thích **vì sao**; bắt buộc khi thay đổi > 100 dòng hoặc đổi hành vi |
| `Refs:` | Nối về `REQ-*` / `TASK-*` / issue. Đây là mắt xích giữ truy vết sống sau khi merge |
| Thay đổi phá vỡ | `feat(contracts)!: ...` kèm đoạn `BREAKING CHANGE:` mô tả cách di chuyển |
| `revert` | Dùng `git revert` để sinh thông điệp chuẩn, không tự gõ tay |

❌ **BAD**

```
update code
fix bug
feat: sửa nhiều thứ ở order và payment và catalog
```

✅ **GOOD**

```
fix(payment): xử lý IPN VNPay trùng lặp bằng idempotency key
docs(media): bổ sung ladder HLS và điều kiện chuyển sang dịch vụ ngoài
refactor(catalog): tách whereForScope ra khỏi service
```

---

## 6. Tên nhánh

```
<type>/<scope>-<mô-tả-ngắn-không-dấu>
feat/order-huy-don-hang
fix/payment-ipn-trung-lap
```

Kiểm bằng một hook `pre-push` nhỏ hoặc quy tắc bảo vệ nhánh trên GitHub. Nhánh `main` luôn ở trạng thái deploy được.

---

## 7. Khi nào được `--no-verify`

Chỉ hai trường hợp: đang vá sự cố sản xuất, hoặc hook hỏng do môi trường. Cả hai đều phải **nói trong PR**.
`--no-verify` thành thói quen là dấu hiệu hook quá chậm — khi đó sửa hook, đừng đổ lỗi cho người dùng.

CI **không** tin hook: mọi thứ hook chặn đều được chạy lại trên CI. Hook là để đỡ mất thời gian chờ, không phải để
thay CI.

---

## 8. Checklist

- [ ] `pnpm install` là đủ để hook hoạt động (nhờ `prepare`), không cần bước thủ công
- [ ] `pre-commit` chạy dưới 5 giây trên một commit thường
- [ ] `HUSKY=0` trong CI
- [ ] `commitlint` chặn scope rỗng và scope không có trong danh sách
- [ ] Danh sách `scope-enum` khớp `docs/01-architecture/service-catalog.md` (18 đơn vị + 3 package dùng chung)
- [ ] Mọi quy tắc hook đều có bản sao ở CI
- [ ] `.gitattributes` đặt `* text=auto eol=lf` để Windows không sinh commit đổi toàn bộ dòng
