# Component Architecture & File Placement Rules — timmy-hub

Tài liệu này quy định kiến trúc phân chia component, giới hạn độ dài mã nguồn và quy ước đặt file trong toàn bộ dự án Frontend (`frontend/src`). Mọi thành viên và trợ lý AI **BẮT BUỘC** tuân thủ nghiêm ngặt.

---

## 1. Nguyên tắc phân chia Component (Single Responsibility Principle)

1. **Một trách nhiệm duy nhất (SRP)**: Mỗi file `.tsx` chỉ quản lý đúng một vùng giao diện hoặc một luồng tương tác cụ thể.
   - Không tạo ra các component "monolith" kiêm nhiệm: vừa quản lý scroll container, vừa làm player canvas, vừa render floating action bar, vừa nhồi nhét card sản phẩm con, vừa render comment drawer.
2. **Một component chính cho mỗi file**:
   - Mỗi file `.tsx` chỉ export duy nhất một component chính (named export).
   - **CẤM** định nghĩa nhiều component lớn (> 30 dòng) trong cùng một file.
   - Chỉ cho phép viết sub-component trong cùng file nếu component đó mang tính phụ trợ đặc thù, cực kỳ ngắn (< 30 dòng), không chứa state phức tạp và chỉ dùng nội bộ tại file đó.

---

## 2. Giới hạn độ dài file (File Length Limits)

| Loại file | Độ dài khuyến nghị | Ngưỡng tối đa cho phép | Hành động khi vượt ngưỡng |
|---|---|---|---|
| Component chuẩn | **< 150 dòng** | **200 dòng** | Bắt buộc tách sub-components |
| View Container / Page View | **< 180 dòng** | **250 dòng** (nghiêm cấm vượt quá) | Tách hook, tách view components |
| Custom Hook | **< 100 dòng** | **150 dòng** | Chia nhỏ thành các hook con |

### Khi nào BẮT BUỘC phải phân tách (Decompose)?
1. File component đạt đến hoặc vượt quá **150 dòng**.
2. Component chứa từ **hai khối giao diện hoặc nghiệp vụ độc lập trở lên**, ví dụ:
   - Header / Navigation bar
   - Floating Action Stack (Like, Share, Comment buttons...)
   - Shoppable / Detail Card
   - Modal / Drawer / Dialog
   - Form Sections / Tab Panels
3. Khối JSX con có lifecycle, state hoặc animation độc lập (như tap feedback, heart burst, loading indicators).

---

## 3. Quy ước cấu trúc thư mục và đặt file (Folder Conventions)

```
frontend/src/
├── app/                           # CHỈ route handlers: page.tsx, layout.tsx, loading.tsx, error.tsx
├── components/
│   ├── ui/                        # shadcn primitives nguyên bản (button, dialog, input...)
│   ├── common/                    # Component dùng chung toàn dự án (header, footer, table-wrapper...)
│   └── icons/                     # SVG icons tùy chỉnh (icon-path.tsx)
├── features/<domain>/             # UI chính của từng nghiệp vụ (content, product, order, auth...)
│   ├── components/                # Toàn bộ components của feature
│   │   ├── <sub-component-1>.tsx  # Các component con (< 150 dòng)
│   │   ├── <sub-component-2>.tsx
│   │   ├── <main-view>.tsx        # Container kết nối (< 200 dòng)
│   │   └── index.ts               # Barrel export public components của feature
│   ├── hooks/                     # Custom hooks đặc thù của feature
│   │   └── index.ts
│   └── index.ts                   # Public API của feature
├── hooks/                         # Custom hooks dùng chung toàn dự án (use-debounced-value...)
├── stores/                        # Zustand stores (*.store.ts)
├── schemas/                       # Client Zod schemas
├── services/                      # API / Server Action callers
├── constants/                     # Hằng số (routes, query keys, limits...)
├── types/                         # Types chỉ dùng ở tầng giao diện (shared types nằm ở @timmyhub/contracts)
└── utils/                         # Pure utility functions (cn, format...)
```

### Quy tắc đặt file:
1. **Component của feature**: Đặt trong `src/features/<domain>/components/`. Tuyệt đối không đặt lung tung ngoài root của feature hay trong `app/`.
2. **Component dùng chung**: Đặt trong `src/components/common/`. Chỉ đưa lên đây khi được dùng ở từ 2 feature khác nhau trở lên.
3. **Hook**: Nếu chỉ dùng cho 1 feature → `src/features/<domain>/hooks/`. Nếu dùng chung → `src/hooks/`.
4. **Hằng số, enum, options**: Đặt trong `src/constants/` hoặc `@timmyhub/contracts` (nếu dùng chung FE/BE). Không hardcode chuỗi/số trong component.
5. **Barrel export (`index.ts`)**: Mỗi thư mục component / feature bắt buộc có `index.ts` để re-export sạch.

---

## 4. Cấu trúc nội bộ một Component (Lifecycle Grouping)

Mỗi component tuân thủ thứ tự 5 nhóm có comment phân tách:
```tsx
export function MyComponent(props: Props) {
    // ===== State =====
    const [isOpen, setIsOpen] = useState(false)

    // ===== Hooks =====
    const t = useTranslations('myDomain')
    const user = useAuthStore((s) => s.user)

    // ===== Derived =====
    const isReady = Boolean(user && !isOpen)

    // ===== Handlers =====
    const handleToggle = () => setIsOpen((prev) => !prev)

    // ===== Effects =====
    useEffect(() => {
        // ...
    }, [])

    return (
        // JSX gọn gàng, ủy quyền các khối con cho sub-components
    )
}
```

---

## 5. Ví dụ Minh họa (❌ BAD vs ✅ GOOD)

### ❌ BAD — Monolithic Component (650+ dòng trong 1 file):

```tsx
// features/content/components/fullscreen-video-view.tsx (650 dòng!)
// Ôm trọn cả Container, HlsPlayer, ActionStack, ProductCard, Header, Drawer trong cùng 1 file.
function ShoppableCard() { /* 120 dòng */ }
function FeedItem() { /* 300 dòng */ }
export function FullscreenVideoView() { /* 230 dòng */ }
```

### ✅ GOOD — Decomposed Sub-components (< 150 dòng/file):

```
features/content/components/
├── fullscreen-header.tsx         # ~40 dòng: nút back, mute
├── shoppable-product-card.tsx    # ~90 dòng: card sản phẩm, giá, nút mua, thumbnail
├── video-action-stack.tsx        # ~90 dòng: like, comment, share, view count, chevrons
├── fullscreen-feed-item.tsx      # ~130 dòng: ghép player canvas + overlay + product card + action stack
├── fullscreen-video-view.tsx     # ~130 dòng: container scroll-snap, keyboard, drawer
└── index.ts                      # barrel export
```
