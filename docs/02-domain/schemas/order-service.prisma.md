---
title: Schema dữ liệu — order-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/02-domain/product-variant.md, docs/02-domain/order-dispute.md, docs/03-specs/order-fulfillment, docs/03-specs/user-profile]
---

# Schema dữ liệu — order-service (`order_db`)

Sở hữu đơn hàng, dòng đơn (đã snapshot bất biến — xem [product-variant.md §4](../product-variant.md)), sổ địa chỉ,
yêu cầu trả hàng, và là **saga orchestrator** của checkout. Trường `OrderItem` snapshot đầy đủ để trang chi tiết đơn
không bao giờ cần gọi `catalog-service`. Phần vòng đời tranh chấp/hoàn tiền chi tiết nằm ở
[order-dispute.md](../order-dispute.md) — `ReturnRequest` ở đây chỉ là bản ghi trạng thái phía `order-service`,
`Dispute`/`DisputeEvent` đầy đủ nằm ở `chat-service`.

```prisma
enum OrderStatus {
    PENDING
    CONFIRMED
    PROCESSING
    PACKED
    SHIPPING
    DELIVERED
    COMPLETED
    CANCELLED
    RETURN_REQUESTED
    RETURNED
    REFUNDED
}

enum PaymentMethod {
    COD
    VNPAY
    WALLET
}

enum ShipperStatus {
    ONLINE
    BUSY
    OFFLINE
}

model Address {
    id           String   @id @default(uuid())
    userId       String
    label        String?
    fullName     String
    phone        String
    addressLine1 String
    addressLine2 String?
    provinceCode String
    districtCode String
    wardCode     String
    provinceName String
    districtName String
    wardName     String
    isDefault    Boolean  @default(false)
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
    orders       Order[]

    @@index([userId])
}

model Order {
    id                String        @id @default(uuid())
    buyerId           String
    sellerId          String
    status            OrderStatus   @default(PENDING)
    totalAmount       Decimal       @db.Decimal(14, 2)
    currency          String        @default("VND")
    voucherId         String?
    voucherDiscount   Decimal?      @db.Decimal(14, 2)
    shippingFee       Decimal       @default(0) @db.Decimal(14, 2)
    // trạng thái thanh toán là bản sao chỉ-đọc từ payment-service qua event, không phải nguồn sự thật
    paymentStatus     String        @default("PENDING")
    paymentMethod     PaymentMethod
    addressId         String
    shippingFullName  String
    shippingPhone     String
    shippingAddress   String
    shipperId         String?
    shipperStatus     ShipperStatus?
    customerNote      String?
    cancelReason       String?
    cancelledBy        String?
    autoCompleteAt     DateTime?
    idempotencyKey     String        @unique
    createdAt          DateTime      @default(now())
    updatedAt           DateTime     @updatedAt
    address             Address      @relation(fields: [addressId], references: [id])
    orderItems           OrderItem[]
    statusHistory         OrderStatusHistory[]
    returnRequests         ReturnRequest[]

    @@index([buyerId])
    @@index([sellerId])
    @@index([status])
    @@index([addressId])
}

model OrderItem {
    id          String   @id @default(uuid())
    orderId     String
    // tham chiếu để truy vết, KHÔNG dùng để hiển thị
    productId   String
    variantId   String
    // snapshot — bất biến, không bao giờ cập nhật lại (product-variant.md §4)
    productName  String
    variantLabel String
    sku          String
    imageUrl     String
    unitPrice    Decimal  @db.Decimal(14, 2)
    quantity     Int
    lineTotal    Decimal  @db.Decimal(14, 2)
    isReviewed   Boolean  @default(false)
    order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

    @@index([orderId])
}

/// [MỚI] Lịch sử chuyển trạng thái — FEAT-ORD-003
model OrderStatusHistory {
    id        String      @id @default(uuid())
    orderId   String
    fromStatus OrderStatus?
    toStatus   OrderStatus
    reason     String?
    actorId    String?
    actorRole  String?
    createdAt  DateTime    @default(now())
    order      Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

    @@index([orderId, createdAt])
}

/// [MỚI] Yêu cầu trả hàng/hoàn tiền — FEAT-ORD-011, xem order-dispute.md §3 cho các mã lý do và kết cục
model ReturnRequest {
    id             String   @id @default(uuid())
    orderId        String
    orderItemId    String?
    // NOT_RECEIVED | DAMAGED | WRONG_ITEM | MISSING_PART | NOT_AS_DESCRIBED | COUNTERFEIT | CHANGED_MIND
    reasonCode     String
    description    String?
    evidenceUrls   String[] @default([])
    // OPENED | SELLER_RESPONDED | ESCALATED | RESOLVED | CLOSED — đồng bộ dáng với Dispute state machine ở chat-service
    status         String   @default("OPENED")
    // FULL_REFUND | PARTIAL_REFUND | SELLER_WINS | REFUND_WITH_RETURN
    resolutionType String?
    refundAmount   Decimal? @db.Decimal(14, 2)
    disputeId      String?  @unique
    respondDeadline DateTime?
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    order          Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

    // mỗi OrderItem chỉ có một yêu cầu trả hàng đang mở (order-dispute.md §4)
    @@unique([orderItemId], map: "return_request_open_per_item")
    @@index([orderId])
}

// --- Outbox / idempotent consumer (ADR-0002) ---

model OutboxEvent {
    id            String    @id @default(uuid())
    aggregateType String
    aggregateId   String
    eventType     String
    payload       Json
    createdAt     DateTime  @default(now())
    publishedAt   DateTime?

    @@index([publishedAt])
    @@map("outbox_events")
}

model ProcessedEvent {
    eventId      String   @id
    consumerName String
    processedAt  DateTime @default(now())

    @@map("processed_events")
}
```

Ràng buộc bổ sung viết tay: unique partial index thật sự cho "mỗi `OrderItem` chỉ có một tranh chấp đang mở" phải là
`CREATE UNIQUE INDEX ... WHERE status NOT IN ('CLOSED')` (Prisma `@@unique` ở trên chỉ minh hoạ ý định, migration
tay theo đúng cú pháp ở order-dispute.md §4).

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `order.created`, `order.confirmed`, `order.packed`, `order.shipped`, `order.delivered`, `order.completed`, `order.cancelled`, `order.refund-requested` | `order.created` nhận `Idempotency-Key` từ client, lưu vào `idempotencyKey` |
| Nghe | `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.refunded`, `inventory.reserve-failed` | Idempotent qua `ProcessedEvent`; đây là saga orchestrator nên các handler này chuyển `Order.status` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Order.buyerId` | `identity-service.User.id` | — |
| `Order.sellerId` | `seller-service.SellerProfile.id` | — |
| `Order.shipperId` | `identity-service.User.id` | Role `SHIPPER` |
| `Order.voucherId` | `promotion-service.Voucher.id` | — |
| `Address.userId` | `identity-service.User.id` | — |
| `Address.provinceCode/districtCode/wardCode` | `master-data-service.Province/District/Ward.code` | — |
| `OrderItem.productId`, `.variantId` | `catalog-service.Product.id` / `ProductVariant.id` | Chỉ để truy vết, màn hình đơn không gọi `catalog-service` |
| `ReturnRequest.disputeId` | `chat-service.Dispute.id` | — |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Order.id` | `payment-service.Payment.orderId`, `engagement-service.Review.orderItemId` (qua `OrderItem.id`), `chat-service.Dispute.orderId` |
| `OrderItem.id` | `engagement-service.Review.orderItemId` |
