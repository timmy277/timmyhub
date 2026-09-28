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
| `pre-commit` | `lint-staged`: ESLint `--fix` theo từng app, Prettier cho file cấu hình ở gốc | Định dạng, lỗi lint trên **file đã stage** | < 5 giây |
| `commit-msg` | `commitlint` | Thông điệp commit sai Conventional Commits | < 1 giây |
| `pre-push` | `tsc --noEmit` trên package bị ảnh hưởng | Lỗi kiểu | < 60 giây |
| CI | Toàn bộ lint, typecheck, test, build, cổng chất lượng | Mọi thứ, kể cả khi hook bị bỏ qua | Xem `docs/05-infra/cicd.md` |

> **Trạng thái hiện tại của repo:** `pre-commit` và `commit-msg` đã bật. `pre-push` **chưa bật** vì Turborepo chưa
> được cài ở gốc — chỉ thêm hook này sau khi `turbo` chạy được, hook gọi lệnh không tồn tại còn tệ hơn không có hook.

Cố ý **không** đưa vào hook: chạy test toàn bộ, build, Lighthouse, axe, `size-limit`. Chúng thuộc về CI.
Cố ý **không** để `tsc` trong `pre-commit`: trên monorepo 18 đơn vị, typecheck mất hàng chục giây, người ta sẽ
`--no-verify` ngay tuần đầu.

---

## 2. Cài đặt

Công cụ hook nằm ở **gốc workspace**, không nằm trong `frontend/` hay `backend/`:

```bash
pnpm add -D -w husky lint-staged @commitlint/cli @commitlint/config-conventional prettier
pnpm exec husky init
```

`package.json` ở gốc:

```json
{
    "scripts": {
        "prepare": "husky"
    }
}
```

`prepare` chạy tự động sau `pnpm install`; nó đặt `core.hooksPath=.husky/_`. Kiểm bằng:

```bash
git config core.hooksPath      # phải in ra .husky/_
```

Trong CI đặt `HUSKY=0` để không cài hook trên runner.

---

## 3. Các hook

`.husky/pre-commit`

```sh
npx --no -- lint-staged
```

`.husky/commit-msg`

```sh
npx --no -- commitlint --edit "$1"
```

Husky 9 **không** cần dòng shebang và **không** cần `source .husky/_/husky.sh` — hai thứ đó là cú pháp Husky 4–8, để lại
sẽ gây cảnh báo khai tử.

Dùng `npx --no --` chứ không dùng `pnpm exec`: `pnpm exec` kiểm tra trạng thái phụ thuộc trước mỗi lần chạy, một
cảnh báo cài đặt nhỏ ở gốc cũng làm hỏng mọi commit.

`pre-push` sẽ là (khi bật Turborepo):

```sh
npx --no -- turbo run typecheck --filter='...[origin/main]'
```

---

## 4. `lint-staged`

Cấu hình đặt **trong `package.json` ở gốc** (một nguồn duy nhất, không thêm `.lintstagedrc`):

```json
{
    "lint-staged": {
        "frontend/**/*.{ts,tsx,js,jsx,mjs}": ["pnpm -C frontend exec eslint --fix --max-warnings=0", "prettier --write"],
        "backend/**/*.ts": ["pnpm -C backend exec eslint --fix --max-warnings=0", "prettier --write"],
        "*.{ts,js,mjs,cjs,json,yml,yaml}": ["prettier --write"]
    }
}
```

Nghĩa là **commit tự động được định dạng lại**: thụt lề 4 space, 120 cột, không chấm phẩy, nháy đơn — đúng bảng ở
[coding-standards.md](coding-standards.md) §1.1. Người viết không phải chỉnh tay, và không ai review về định dạng nữa.

Năm điều dễ sai:

1. **Chỉ một `prettier.config.mjs` ở gốc.** Không để `.prettierrc` trong `frontend/` hay `backend/` — Prettier tìm
   cấu hình gần file nhất, một file con là hai app lệch nhau ngay. `eslint-plugin-prettier` của backend cũng đọc đúng
   cấu hình gốc này, nên `eslint --fix` và `prettier --write` không đánh nhau.
2. `.editorconfig` chỉ dạy IDE lúc gõ; **Prettier mới là thứ quyết định**, vì nó chạy trong hook và trong CI.
3. **Lint phải chạy bằng ESLint của chính app đó** (`pnpm -C <app> exec`), không phải một ESLint ở gốc. Mỗi app có
   `eslint.config.mjs` và bộ plugin riêng (`eslint-config-next` cho frontend, `eslint-plugin-prettier` cho backend);
   ép chúng chạy qua một ESLint phiên bản khác ở gốc sẽ vỡ ngay khi tải rule.
4. **`--max-warnings=0`** là bắt buộc. Không có nó, cảnh báo tích tụ đến mức không ai đọc log lint nữa.
5. Không thêm `git add` vào lệnh; `lint-staged` tự lo, thêm vào sẽ nuốt mất thay đổi chưa stage.

Đổi quy tắc định dạng thì **định dạng lại toàn bộ trong một commit riêng**, đừng để hook sửa dần từng file — nếu không
mọi commit sau đều lẫn nhiễu định dạng vào diff nghiệp vụ. Ghi hash commit đó vào `.git-blame-ignore-revs` để
`git blame` bỏ qua.

`docs/**` nằm trong `.prettierignore`: tài liệu theo quy ước định dạng riêng (bảng căn tay, 4 space), để Prettier
chạy lên sẽ sinh diff hàng chục file không liên quan tới commit đang làm.

### 4.1 Ba workspace pnpm độc lập

`frontend/` và `backend/` mỗi nơi có **`pnpm-workspace.yaml` riêng** (rỗng về `packages`, chỉ khai `allowBuilds`),
khiến chúng là gốc workspace pnpm độc lập, tách khỏi workspace ở thư mục gốc repo. **Bắt buộc phải có file này**, dù
trông như thừa: pnpm tìm `pnpm-workspace.yaml` bằng cách trèo lên thư mục cha; không có file riêng, `pnpm install`
chạy trong `frontend/`/`backend/` sẽ thấy workspace ở gốc repo, nhận ra thư mục đó không khớp glob nào trong
`packages:` của gốc, và chỉ cài đúng package `timmyhub` ở gốc — **bỏ qua toàn bộ dependency của app**, không báo lỗi
gì cả ngoài việc `node_modules/` app rỗng.

Vì vậy repo có 3 workspace pnpm tách biệt, không lồng nhau:

| Workspace | `pnpm-workspace.yaml` | Quản lý gì |
|---|---|---|
| gốc repo | `packages: [backend/apps/*, backend/libs/*, shared/*]` (glob chưa khớp gì) | husky, lint-staged, commitlint, prettier |
| `frontend/` | `packages: []` (mặc định) | Next.js app, cài bằng `pnpm install` trong chính thư mục đó |
| `backend/` | `packages: []` (mặc định) | NestJS app, cài bằng `pnpm install` trong chính thư mục đó |

Ba workspace sẽ gộp về một khi tái cấu trúc thành `backend/apps/*` theo
[monorepo-and-build.md](../05-infra/monorepo-and-build.md) — lúc đó `frontend/pnpm-workspace.yaml` và
`backend/pnpm-workspace.yaml` mới bị xoá.

---

## 5. Quy ước commit

Theo **Conventional Commits**. `commitlint.config.mjs` (ESM — gốc workspace là `type: module` theo mặc định của
ESLint flat config; dùng `.js` với `module.exports` sẽ bị chính lint chặn):

```js
export default {
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
        'subject-case': [0],                    // tiêu đề tiếng Anh, không ép kiểu chữ
        'subject-max-length': [2, 'always', 72],
        'body-max-line-length': [2, 'always', 100],
    },
}
```

Cấu trúc:

```
<type>(<scope>): <tiêu đề tiếng Anh, câu mệnh lệnh, không dấu chấm cuối>

<thân tiếng Anh: vì sao thay đổi, không phải thay đổi cái gì — diff đã nói cái gì rồi>

Refs: REQ-ORD-012, TASK-ORD-021
```

Ví dụ:

```
feat(order): let buyers cancel an order before it is confirmed

Buyers currently have to message the seller to cancel. The new endpoint checks the
source state and restores stock in the same transaction.

Refs: REQ-ORD-018, TASK-ORD-034
```

Quy định kèm theo:

| Hạng mục | Quy định |
|---|---|
| `scope` | **Bắt buộc**, lấy từ `scope-enum` ở trên. Đụng nhiều service thì tách commit, không dùng scope gộp |
| Tiêu đề | **Tiếng Anh**, ≤ 72 ký tự, động từ mệnh lệnh ("add", "fix", "drop"), không dấu chấm cuối |
| Thân | Giải thích **vì sao**; bắt buộc khi thay đổi > 100 dòng hoặc đổi hành vi |
| `Refs:` | Nối về `REQ-*` / `TASK-*` / issue. Đây là mắt xích giữ truy vết sống sau khi merge |
| Thay đổi phá vỡ | `feat(contracts)!: ...` kèm đoạn `BREAKING CHANGE:` mô tả cách di chuyển |
| `revert` | Dùng `git revert` để sinh thông điệp chuẩn, không tự gõ tay |

❌ **BAD**

```
update code
fix bug
feat: change a lot of things in order, payment and catalog
```

✅ **GOOD**

```
fix(payment): handle duplicate VNPay IPN with an idempotency key
docs(media): document the HLS ladder and when to use an external service
refactor(catalog): extract whereForScope out of the service
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
- [ ] `git config core.hooksPath` trả về `.husky/_` — nếu rỗng thì hook chỉ là file chết, chạy lại `pnpm install`
