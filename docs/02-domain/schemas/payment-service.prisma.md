---
title: Schema dữ liệu — payment-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/02-domain/order-dispute.md, docs/03-specs/payment-vnpay, docs/03-specs/wallet-settlement]
---

# Schema dữ liệu — payment-service (`payment_db`)

Sở hữu thanh toán VNPay/COD, ví seller (bản cũ có model nhưng chưa từng có API — FEAT-WAL-001), sổ giao dịch ví và
yêu cầu rút tiền. Đây là service rủi ro cao nhất hệ thống: IPN phải xác minh chữ ký → khoá theo `vnpayTxnRef` →
kiểm `ProcessedEvent` → ghi + outbox trong một transaction. Hoàn tiền đi qua sổ cái kép (`WalletTransaction`),
không bao giờ `UPDATE balance` trực tiếp — theo luật cứng #4 và order-dispute.md §4.

```prisma
enum PaymentStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    REFUNDED
    PARTIALLY_REFUNDED
}

enum TransactionType {
    DEPOSIT
    WITHDRAWAL
    PAYMENT
    REFUND
    SALE_INCOME
    COMMISSION
    REWARD
    FEE
}

model Payment {
    id           String        @id @default(uuid())
    orderId      String        @unique
    method       String
    status       PaymentStatus @default(PENDING)
    amount       Decimal       @db.Decimal(14, 2)
    currency     String        @default("VND")
    vnpayTxnRef  String?       @unique
    vnpayTransNo String?
    paidAt       DateTime?
    expiresAt    DateTime?
    metadata     Json?
    createdAt    DateTime      @default(now())
    updatedAt    DateTime      @updatedAt
    attempts     PaymentAttempt[]

    @@index([orderId])
    @@index([vnpayTxnRef])
}

/// [MỚI] Mỗi lần thử thanh toán riêng khỏi Payment cuối cùng — FEAT-PAY-011 (thử lại), theo dõi IPN đến nhiều lần
model PaymentAttempt {
    id          String   @id @default(uuid())
    paymentId   String
    provider    String   // VNPAY | COD | WALLET
    // vnp_TxnRef của lần này — khoá idempotent cho IPN
    txnRef      String   @unique
    status      PaymentStatus @default(PENDING)
    ipnPayload  Json?
    ipnReceivedAt DateTime?
    createdAt   DateTime @default(now())
    payment     Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)

    @@index([paymentId])
}

model Wallet {
    id           String              @id @default(uuid())
    // sở hữu bởi seller HOẶC buyer — chỉ một trong hai khác null
    sellerId     String?             @unique
    buyerId      String?             @unique
    availableBalance Decimal         @default(0) @db.Decimal(14, 2)
    // tiền đang giữ (hold), chưa khả dụng — FEAT-WAL-004
    holdBalance      Decimal         @default(0) @db.Decimal(14, 2)
    currency     String              @default("VND")
    createdAt    DateTime            @default(now())
    updatedAt    DateTime            @updatedAt
    transactions WalletTransaction[]
    withdrawals  Withdrawal[]

    @@index([sellerId])
    @@index([buyerId])
}

model WalletTransaction {
    id            String          @id @default(uuid())
    walletId      String
    type          TransactionType
    amount        Decimal         @db.Decimal(14, 2)
    balanceAfter  Decimal         @db.Decimal(14, 2)
    description   String?
    // idempotency: orderId, disputeId:attempt, withdrawalId...
    referenceKey  String
    createdAt     DateTime        @default(now())
    wallet        Wallet          @relation(fields: [walletId], references: [id], onDelete: Cascade)

    @@unique([walletId, referenceKey, type])
    @@index([walletId])
    @@index([type])
    @@index([createdAt])
}

/// [MỚI] Yêu cầu rút tiền + luồng duyệt admin — FEAT-WAL-005
model Withdrawal {
    id          String   @id @default(uuid())
    walletId    String
    amount      Decimal  @db.Decimal(14, 2)
    bankName    String
    bankAccountNumber String
    bankAccountName   String
    // REQUESTED | APPROVED | REJECTED | PAID
    status      String   @default("REQUESTED")
    rejectReason String?
    approvedById String?
    approvedAt   DateTime?
    paidAt       DateTime?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
    wallet       Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)

    @@index([walletId])
    @@index([status])
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

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.refunded`, `wallet.credited`, `wallet.debited`, `withdrawal.requested`, `withdrawal.approved` | IPN handler ghi `Payment` + `PaymentAttempt` + `OutboxEvent` trong một transaction |
| Nghe | `order.created` (tạo `PaymentAttempt`), `order.cancelled` (huỷ thanh toán đang chờ), `order.completed` (ghi có ví seller, `WalletTransaction.type = SALE_INCOME`, trừ hoa hồng ghi `COMMISSION`) | Idempotent qua `ProcessedEvent`, khoá bổ sung theo `vnpayTxnRef`/`referenceKey` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Payment.orderId` | `order-service.Order.id` | 1-1 |
| `Wallet.sellerId` | `seller-service.SellerProfile.id` | — |
| `Wallet.buyerId` | `identity-service.User.id` | Ví người mua — FEAT-WAL-008 |
| `Withdrawal.approvedById` | `identity-service.User.id` | Admin |
| `WalletTransaction.referenceKey` (khi type=REFUND) | `order-service.ReturnRequest.disputeId` (dạng `disputeId:attempt`) | Hoàn tiền idempotent theo order-dispute.md §4 |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Payment.id`, `Payment.status` | `order-service.Order.paymentStatus` (bản sao chỉ-đọc, cập nhật qua event) |
