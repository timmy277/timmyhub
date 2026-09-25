---
title: Thuật ngữ & quy ước đặt tên
status: approved
owner: Tech Lead
updated: 2026-09-15
related: [docs/00-overview/product-overview.md, docs/01-architecture/service-catalog.md, docs/06-quality/coding-standards.md]
---

# Thuật ngữ & quy ước đặt tên

Mục đích: mọi người gọi cùng một thứ bằng cùng một tên. Trong code **luôn dùng cột "Identifier (EN)"**; trong văn bản
tiếng Việt dùng cột "Tiếng Việt" nhưng giữ nguyên identifier khi nhắc đến entity kỹ thuật.

## 1. Thuật ngữ nghiệp vụ

| Tiếng Việt | Identifier (EN) | Định nghĩa |
|---|---|---|
| Người dùng | `User` | Tài khoản trên hệ thống, bất kể vai trò |
| Người mua | `Buyer` | Vai trò ngữ cảnh của `User` khi đặt đơn; **không phải entity riêng** |
| Người bán | `Seller` | `User` có role `SELLER`; hồ sơ nằm ở `SellerProfile` |
| Gian hàng / shop | `Shop` | Mặt tiền công khai của `SellerProfile`, truy cập qua `slug` |
| Thương hiệu | `BrandProfile` | Nhãn hàng gắn vào sản phẩm, khác với shop |
| Danh mục | `Category` | Cây phân loại sản phẩm nhiều cấp |
| Sản phẩm | `Product` | Đơn vị đăng bán, có ít nhất một biến thể |
| Biến thể | `ProductVariant` | Đơn vị **thực sự bán và trừ kho** (SKU); giá và tồn nằm ở đây |
| SKU | `sku` | Mã định danh biến thể do seller đặt, duy nhất trong shop |
| Tồn thực có | `onHand` | Số lượng vật lý đang có |
| Tồn đang giữ | `reserved` | Đã giữ cho đơn chưa thanh toán |
| Tồn khả dụng | `available` | `onHand - reserved`; con số hiển thị cho người mua |
| Giữ tồn | `reserve` | Hành động trừ `available` khi tạo đơn |
| Chốt tồn | `commit` | Trừ `onHand` khi thanh toán thành công |
| Nhả tồn | `release` | Trả `reserved` về khi huỷ / hết hạn |
| Giỏ hàng | `Cart` | Giỏ bền vững theo `User` |
| Ảnh giá | `price snapshot` | Giá được sao chép vào `OrderItem` lúc đặt, không đổi về sau |
| Đơn hàng | `Order` | Một lần mua từ **một shop**; giỏ nhiều shop tách thành nhiều `Order` |
| Dòng đơn | `OrderItem` | Một biến thể trong đơn, kèm ảnh giá |
| Thanh toán | `Payment` | Bản ghi giao dịch tiền của một đơn |
| IPN | `IPN` | *Instant Payment Notification* — callback server-to-server của VNPay, **nguồn sự thật** của trạng thái thanh toán |
| Return URL | `returnUrl` | Nơi VNPay chuyển trình duyệt về; **chỉ để hiển thị**, không chốt trạng thái |
| Đối soát | `reconciliation` | So khớp giao dịch hệ thống với sao kê cổng thanh toán |
| Ví | `Wallet` | Số dư của seller (hoặc user) trên sàn |
| Số dư khả dụng | `availableBalance` | Phần rút được |
| Số dư đang giữ | `heldBalance` | Đã ghi có nhưng chưa hết thời gian giữ |
| Hoa hồng | `commission` | Phần sàn giữ lại trên mỗi đơn hoàn tất |
| Rút tiền | `Withdrawal` | Yêu cầu chuyển tiền từ ví ra ngân hàng |
| Voucher | `Voucher` | Mã giảm giá; loại xác định bởi `VoucherType` |
| Kho voucher | `UserVoucher` | Voucher đã được một user thu thập |
| Chiến dịch | `PromotionCampaign` | Đợt khuyến mãi có thời gian, tập hợp sản phẩm |
| Flash sale | `FlashSale` | Chiến dịch khung giờ ngắn, có hạn mức tồn riêng |
| Bài đăng | `Post` | Nội dung do seller tạo (văn bản/ảnh/video) |
| Video quảng cáo | `AdCreative` | Nội dung được dùng trong chiến dịch quảng cáo |
| Chiến dịch quảng cáo | `AdCampaign` | Đợt quảng cáo trả phí có ngân sách |
| Lượt hiển thị | `impression` | Một lần nội dung quảng cáo hiện đủ điều kiện đếm |
| CTR | `ctr` | `clicks / impressions` |
| Quy kết | `attribution` | Gán doanh thu đơn hàng về nội dung/quảng cáo đã dẫn dắt |
| Đánh giá | `Review` | Nhận xét + số sao cho sản phẩm đã mua |
| Hữu ích | `ReviewHelpfulVote` | Bình chọn đánh giá hữu ích |
| Danh sách yêu thích | `WishlistItem` | Sản phẩm người dùng lưu lại |
| Hội thoại | `Conversation` | Luồng chat giữa các bên |
| Ticket | `SupportTicket` | Yêu cầu hỗ trợ có trạng thái và SLA |
| Tranh chấp | `Dispute` | Ticket gắn với một đơn hàng, có ba bên tham gia |
| Thông báo | `Notification` | Bản ghi thông báo trong ứng dụng |
| Hàng đợi kiểm duyệt | `moderation queue` | Danh sách chờ admin duyệt (seller/sản phẩm/nội dung/quảng cáo/rút tiền) |
| Nhật ký kiểm toán | `AuditLog` | Bản ghi bất biến "ai làm gì với cái gì, khi nào" |
| Nhật ký hệ thống | `SystemLog` | Sự kiện kỹ thuật (job, tích hợp ngoài, lỗi) |
| Dữ liệu nền | `master data` | Tỉnh/huyện/xã, cấu hình, feature flag, bảng phí |
| Cờ tính năng | `FeatureFlag` | Công tắc bật/tắt tính năng theo môi trường |
| GMV | `gmv` | Tổng giá trị hàng hoá của đơn đã xác nhận, **trước** khấu trừ |
| Doanh thu thuần | `netRevenue` | GMV trừ huỷ, hoàn, giảm giá |

## 2. Thuật ngữ kỹ thuật

| Tiếng Việt | Identifier (EN) | Định nghĩa |
|---|---|---|
| Cổng API | `api-gateway` | Điểm vào HTTP/WS duy nhất từ bên ngoài |
| Dịch vụ | `service` | Một ứng dụng NestJS triển khai độc lập, có DB riêng |
| Ngữ cảnh nghiệp vụ | `bounded context` | Ranh giới ngữ nghĩa của một domain; trùng ranh giới service |
| Sự kiện miền | `domain event` | Sự việc đã xảy ra, phát bất đồng bộ, đặt tên ở thì quá khứ |
| Hộp thư đi | `outbox` | Bảng trong DB service lưu event chờ phát, ghi cùng transaction nghiệp vụ |
| Tiêu thụ bất biến | `idempotent consumer` | Consumer xử lý cùng một event nhiều lần cho ra cùng kết quả |
| Bảng đã xử lý | `processed_events` | Bảng lưu `eventId` đã tiêu thụ, dùng để khử trùng lặp |
| Saga | `saga` | Chuỗi bước nghiệp vụ xuyên service kèm hành động bù trừ |
| Hành động bù trừ | `compensating action` | Bước hoàn tác khi một bước sau của saga thất bại |
| Gọi đồng bộ | `RPC` | Yêu cầu–phản hồi qua RabbitMQ (`@MessagePattern`), có timeout |
| Khoá học đọc | `read model` | Bản sao dữ liệu của service khác, dựng từ event, chỉ để đọc |
| Ngắt mạch | `circuit breaker` | Cơ chế ngừng gọi service đang hỏng |
| Giới hạn tần suất | `rate limit` | Chặn gọi quá ngưỡng |
| Hàng đợi công việc | `BullMQ queue` | Job nền chạy trong nội bộ một service |
| Bộ chuyển hoá socket | `Redis adapter` | Cho phép nhiều instance WebSocket chia sẻ room |
| Phòng | `room` | Nhóm kết nối WebSocket, đặt tên `<entity>:<id>` |
| Dấu vết | `traceId` | Mã theo dõi một yêu cầu xuyên nhiều service |
| Mã yêu cầu | `requestId` | Mã một lần gọi HTTP, sinh ở gateway |
| Bối cảnh cục bộ | `CLS` | AsyncLocalStorage giữ `actorId`, `requestId`, `traceId` trong suốt một yêu cầu |

## 3. Quy ước đặt tên

### 3.1 Service

`<domain>-service`, kebab-case, số ít: `catalog-service`, `order-service`, `payment-service`.
Ngoại lệ duy nhất: `api-gateway`.

### 3.2 Cơ sở dữ liệu

`<domain>_db`, snake_case: `catalog_db`, `order_db`. Một service **chỉ** kết nối tới DB của chính nó.

### 3.3 Model & bảng Prisma

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Model | `PascalCase`, số ít | `ProductVariant` |
| Bảng vật lý | `snake_case`, số nhiều | `@@map("product_variants")` |
| Trường | `camelCase` | `sellerProfileId` |
| Cột vật lý | `snake_case` | `@map("seller_profile_id")` |
| Khoá chính | `id`, kiểu `String @id @default(cuid())` | |
| Khoá ngoại | `<model>Id` | `productId` |
| Mốc thời gian | `createdAt`, `updatedAt`, `deletedAt` | |
| Enum | `PascalCase`, giá trị `SCREAMING_SNAKE_CASE` | `OrderStatus.PENDING_PAYMENT` |

### 3.4 Route HTTP

```
/v1/<resource số nhiều>[/<id>[/<sub-resource>]]
```

| Nguyên tắc | ❌ BAD | ✅ GOOD |
|---|---|---|
| Danh từ số nhiều | `/v1/product` | `/v1/products` |
| Không động từ trong path | `/v1/getProducts` | `GET /v1/products` |
| Hành động là sub-resource | `POST /v1/products/approve/:id` | `POST /v1/products/:id/approval` |
| Phạm vi ở tiền tố | `/v1/products?scope=mine` | `/v1/seller/products` |
| Phiên bản luôn có | `/products` | `/v1/products` |

Ba tiền tố phạm vi: `/v1/...` (công khai & người mua), `/v1/seller/...`, `/v1/admin/...`.

### 3.5 Sự kiện

```
<domain>.<entity>.<hành động ở thì quá khứ>
```

| ❌ BAD | ✅ GOOD |
|---|---|
| `createOrder` | `order.created` |
| `order.create` | `order.created` |
| `OrderPaidEvent` | `order.paid` |
| `product.update.approved` | `product.approved` |

Định danh tài liệu: `EVT-order.paid`. Danh mục đầy đủ:
[event-catalog.md](../01-architecture/event-catalog.md).

### 3.6 Permission

`module:resource:action[:any]` — xem [roles-and-permissions.md §3](roles-and-permissions.md#3-quy-ước-đặt-tên-permission).

### 3.7 Khoá Redis

```
<service>:<mục đích>:<định danh>
```

Ví dụ: `identity:perm:user:ckx123`, `catalog:product:slug:ao-thun-nam`, `gateway:ratelimit:ip:1.2.3.4`.
Mọi khoá **phải** có TTL trừ khi là dữ liệu bền vững có chủ đích.

### 3.8 Thư mục & tệp frontend

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Route segment | kebab-case | `app/(shop)/product-detail/` |
| Component | `PascalCase.tsx` | `ProductCard.tsx` |
| Hook | `useXxx.ts` | `useCartQuery.ts` |
| Store Zustand | `xxx.store.ts` | `cart.store.ts` |
| Schema zod dùng chung | `xxx.schema.ts` trong `@timmyhub/contracts` | `order.schema.ts` |
| Story | `Xxx.stories.tsx` | `ProductCard.stories.tsx` |

### 3.9 Biến môi trường

`SCREAMING_SNAKE_CASE`, nhóm theo tiền tố hệ thống ngoài: `VNPAY_*`, `SUPABASE_*`, `SMTP_*`, `UPSTASH_*`, `JWT_*`.
Biến lộ ra trình duyệt **bắt buộc** có tiền tố `NEXT_PUBLIC_` và **không được** chứa secret.
Danh sách đầy đủ theo service: [environments.md](../05-infra/environments.md).

## 4. Từ dễ nhầm

| Cặp từ | Phân biệt |
|---|---|
| `Product` vs `ProductVariant` | Người mua chọn `Product`, nhưng **giá và tồn kho nằm ở `ProductVariant`**. Không bao giờ trừ kho ở `Product`. |
| `Seller` vs `Shop` vs `BrandProfile` | `Seller` là vai trò, `Shop` là mặt tiền của `SellerProfile`, `BrandProfile` là nhãn hàng — một shop bán nhiều brand. |
| `Order` vs `Payment` | Một `Order` có **nhiều lần** thử thanh toán nhưng chỉ một `Payment` thành công. |
| `returnUrl` vs `IPN` | `returnUrl` là trải nghiệm người dùng; **chỉ IPN được phép đổi trạng thái thanh toán**. |
| `AuditLog` vs `SystemLog` vs application log | `AuditLog` = hành động nghiệp vụ có actor (bất biến). `SystemLog` = sự kiện kỹ thuật có nghĩa nghiệp vụ. Application log (pino) = log vận hành, có thể xoay vòng và mất. |
| `Post` vs `AdCampaign` | `Post` là nội dung; `AdCampaign` là **tiền** chi để đẩy nội dung đó đi xa hơn. |
| `Notification` vs email | `Notification` là bản ghi trong ứng dụng; email là **một kênh giao** của cùng sự kiện. |
| `reserved` vs `onHand` | Người mua thấy `available`; kế toán kho quan tâm `onHand`. |
| `role` vs `permission` | `role` là nhóm, `permission` là hành động cụ thể. Không bao giờ kiểm tra role ở chỗ cần permission. |
| `GMV` vs `netRevenue` | GMV không trừ huỷ/hoàn; báo cáo tài chính dùng `netRevenue`. |

## 5. Từ viết tắt

| Viết tắt | Đầy đủ |
|---|---|
| ADR | Architecture Decision Record |
| CASL | Thư viện phân quyền theo bản ghi dùng trong dự án |
| CLS | Continuation Local Storage (AsyncLocalStorage) |
| CPC / CPM | Cost Per Click / Cost Per Mille (nghìn lượt hiển thị) |
| DLQ | Dead Letter Queue |
| EARS | Easy Approach to Requirements Syntax |
| ERD | Entity Relationship Diagram |
| GMV | Gross Merchandise Value |
| HPA | Horizontal Pod Autoscaler |
| IPN | Instant Payment Notification |
| RBAC | Role-Based Access Control |
| RPC | Remote Procedure Call |
| RSC | React Server Component |
| SLA | Service Level Agreement |
| SSO | Single Sign-On |
| WCAG | Web Content Accessibility Guidelines |
