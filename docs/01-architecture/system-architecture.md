---
title: Kiến trúc hệ thống
status: approved
owner: Tech Lead
updated: 2026-09-15
related: [docs/01-architecture/service-catalog.md, docs/01-architecture/communication-patterns.md, docs/01-architecture/data-architecture.md, docs/01-architecture/adr/ADR-0001-microservices.md]
---

# Kiến trúc hệ thống

## 1. Bối cảnh (C4 — Level 1)

```mermaid
flowchart TB
    subgraph Người dùng
        U[User / Guest]
        S[Seller]
        A[Admin]
    end

    TH["TimmyHub<br/>(Web + API)"]

    subgraph Hệ thống ngoài
        VNP[VNPay<br/>thanh toán]
        SUP[Supabase Storage<br/>media]
        SMTP[SMTP<br/>email giao dịch]
        GG[Google OAuth]
        FB[Facebook OAuth]
        SEN[Sentry<br/>giám sát lỗi]
        UPS[Upstash Redis]
    end

    U --> TH
    S --> TH
    A --> TH

    TH -->|tạo URL thanh toán| VNP
    VNP -->|IPN| TH
    TH -->|upload / signed URL| SUP
    TH -->|gửi mail| SMTP
    TH <-->|OAuth2| GG
    TH <-->|OAuth2| FB
    TH -->|lỗi & hiệu năng| SEN
    TH <-->|cache, queue, pub/sub| UPS
```

## 2. Container (C4 — Level 2)

```mermaid
flowchart TB
    BROWSER["Trình duyệt"]

    subgraph FE["Frontend — Next.js 16"]
        WEB["Web App<br/>App Router · RSC · NextAuth"]
    end

    subgraph EDGE["Lớp biên"]
        GW["api-gateway<br/>NestJS · REST + WS<br/>helmet · throttle · CORS · Swagger"]
    end

    subgraph BUS["Hạ tầng giao tiếp"]
        RMQ[("RabbitMQ<br/>exchange: timmyhub.events")]
        REDIS[("Upstash Redis<br/>cache · BullMQ · socket adapter")]
    end

    subgraph CORE["Service lõi thương mại"]
        IDN["identity-service"]
        SEL["seller-service"]
        CAT["catalog-service"]
        CRT["cart-service"]
        ORD["order-service"]
        PAY["payment-service"]
        PRM["promotion-service"]
    end

    subgraph ENGAGE["Service nội dung & tương tác"]
        CNT["content-service"]
        ENG["engagement-service"]
        CHT["chat-service"]
        NTF["notification-service"]
    end

    subgraph PLAT["Service nền tảng"]
        SRC["search-service"]
        MED["media-service"]
        ANA["analytics-service"]
        AUD["audit-service"]
        MDT["master-data-service"]
    end

    subgraph DATA["Lưu trữ"]
        PG[("PostgreSQL 16<br/>database-per-service")]
        ES[("Elasticsearch 8")]
        OBJ[("Supabase Storage")]
    end

    BROWSER --> WEB
    WEB -->|HTTPS REST| GW
    WEB -->|WebSocket| GW

    GW -->|RPC| CORE
    GW -->|RPC| ENGAGE
    GW -->|RPC| PLAT

    CORE <--> RMQ
    ENGAGE <--> RMQ
    PLAT <--> RMQ

    CORE --> PG
    ENGAGE --> PG
    PLAT --> PG
    SRC --> ES
    MED --> OBJ

    CORE --> REDIS
    ENGAGE --> REDIS
    PLAT --> REDIS
    GW --> REDIS
```

## 3. Nguyên tắc kiến trúc

| # | Nguyên tắc | Hệ quả bắt buộc |
|---|---|---|
| 1 | **Một điểm vào duy nhất** | Chỉ `api-gateway` mở ra Internet; service khác không có Ingress |
| 2 | **Database-per-service** | Không service nào có chuỗi kết nối tới DB của service khác; không `JOIN` xuyên service |
| 3 | **Event là hợp đồng công khai** | Đổi payload event là thay đổi phá vỡ (breaking); phải lên phiên bản — xem [event-catalog.md](event-catalog.md) |
| 4 | **Bất đồng bộ là mặc định** | Chỉ dùng RPC đồng bộ khi người dùng đang chờ kết quả ngay |
| 5 | **Nguồn sự thật nằm ở service sở hữu** | Bản sao ở service khác là read model, chấp nhận nhất quán cuối cùng |
| 6 | **Idempotent ở mọi ranh giới** | Mọi consumer và mọi webhook ngoài phải chịu được gọi lặp |
| 7 | **Ghi trước, phát sau** | Domain event luôn qua outbox trong cùng transaction nghiệp vụ |
| 8 | **Không tin dữ liệu vào** | Validate bằng zod tại gateway **và** tại service |
| 9 | **Mọi thay đổi dữ liệu đều có dấu vết** | Audit log tự động, `traceId` xuyên suốt |
| 10 | **Hỏng một phần, không hỏng toàn bộ** | Timeout, circuit breaker, suy giảm có kiểm soát (xem §7) |

## 4. Tầng và trách nhiệm

| Tầng | Thành phần | Trách nhiệm | **Không** làm |
|---|---|---|---|
| Trình bày | Next.js | Render, điều hướng, trạng thái UI, phiên NextAuth | Logic nghiệp vụ, truy cập DB |
| Biên | `api-gateway` | Xác thực, RBAC lớp 1–2, rate limit, helmet, CORS, tổng hợp Swagger, chuyển WS | Logic nghiệp vụ, giữ dữ liệu bền vững |
| Nghiệp vụ | 16 service | Quy tắc nghiệp vụ, sở hữu dữ liệu, phát/nhận event, job nền | Gọi trực tiếp service khác qua HTTP |
| Dữ liệu | PostgreSQL, Elasticsearch, Supabase Storage | Lưu trữ | — |
| Hạ tầng giao tiếp | RabbitMQ, Redis | Truyền event, cache, hàng đợi job, pub/sub socket | — |

## 5. Bản đồ triển khai

```mermaid
flowchart LR
    subgraph INTERNET[Internet]
        CLIENT[Client]
    end

    subgraph VERCEL["Vercel"]
        NEXT["Next.js<br/>timmyhub.vn"]
    end

    subgraph K8S["Kubernetes — namespace: timmyhub-prod"]
        ING["Ingress NGINX<br/>api.timmyhub.vn"]
        GWP["api-gateway<br/>2–6 pod (HPA)"]
        SVC["16 service<br/>1–4 pod mỗi service"]
        RMQP["RabbitMQ<br/>StatefulSet 3 node"]
        ESP["Elasticsearch<br/>StatefulSet 3 node"]
    end

    subgraph MANAGED["Dịch vụ quản lý"]
        PGM[("PostgreSQL<br/>16 database")]
        UPSM[("Upstash Redis")]
        SUPM[("Supabase Storage")]
    end

    CLIENT --> NEXT
    NEXT --> ING
    ING --> GWP
    GWP --> SVC
    SVC <--> RMQP
    SVC --> PGM
    SVC --> UPSM
    SVC --> ESP
    SVC --> SUPM
```

Chi tiết manifest, probe, HPA, secret: [kubernetes.md](../05-infra/kubernetes.md).

## 6. Luồng xuyên suốt tiêu biểu — checkout

```mermaid
sequenceDiagram
    autonumber
    participant FE as Next.js
    participant GW as api-gateway
    participant ORD as order-service
    participant CRT as cart-service
    participant CAT as catalog-service
    participant PRM as promotion-service
    participant PAY as payment-service
    participant MQ as RabbitMQ
    participant NTF as notification-service
    participant SRC as search-service
    participant ANA as analytics-service

    FE->>GW: POST /v1/orders/from-cart
    GW->>ORD: RPC order.createFromCart
    ORD->>CRT: RPC cart.validate (đồng bộ, người dùng đang chờ)
    ORD->>CAT: RPC inventory.reserve
    ORD->>PRM: RPC voucher.reserve
    ORD->>ORD: Ghi Order + outbox (1 transaction)
    ORD-->>GW: 201 order PENDING_PAYMENT
    ORD->>MQ: EVT-order.created

    FE->>GW: POST /v1/payments/vnpay/create-url
    GW->>PAY: RPC payment.createUrl
    PAY-->>FE: URL VNPay

    Note over PAY: VNPay gọi IPN (idempotent)
    PAY->>PAY: Ghi Payment SUCCEEDED + outbox
    PAY->>MQ: EVT-payment.succeeded

    MQ-->>ORD: payment.succeeded
    ORD->>CAT: RPC inventory.commit
    ORD->>MQ: EVT-order.confirmed

    MQ-->>NTF: order.confirmed → email + in-app
    MQ-->>SRC: order.confirmed → cập nhật soldCount
    MQ-->>ANA: order.confirmed → cập nhật GMV
```

Chi tiết saga và các hành động bù trừ: [communication-patterns.md §5](communication-patterns.md#5-saga-checkout).

## 7. Chiến lược suy giảm có kiểm soát

Khi một thành phần hỏng, hệ thống **không được sập toàn bộ**. Bảng dưới là hợp đồng: mỗi hàng phải có test tương ứng
trong bộ test khả chịu lỗi.

| Thành phần hỏng | Hành vi bắt buộc | Chức năng mất |
|---|---|---|
| `search-service` / Elasticsearch | Quay về truy vấn `catalog-service` bằng Postgres `ILIKE` | Facet, gợi ý, chịu lỗi chính tả |
| `content-service` | Trang sản phẩm vẫn render, khối nội dung hiển thị trạng thái rỗng | Feed, quảng cáo |
| `analytics-service` | Dashboard hiện dữ liệu tổng hợp gần nhất + cảnh báo "dữ liệu tạm cũ" | Số liệu thời gian thực |
| `notification-service` | Event nằm lại hàng đợi, gửi bù khi service sống lại | Thông báo tức thời |
| `chat-service` | FE hiện "mất kết nối", tự kết nối lại có backoff | Chat realtime |
| `media-service` | Upload báo lỗi rõ ràng; ảnh đã có vẫn phục vụ từ Supabase | Tải tệp mới |
| Redis | Cache miss xuống DB; rate limit chuyển sang bộ đếm cục bộ | Hiệu năng, giới hạn chính xác toàn cục |
| RabbitMQ | Ghi nghiệp vụ **vẫn thành công** (outbox giữ event), phát lại khi phục hồi | Cập nhật xuyên service tức thời |
| `payment-service` | Không cho tạo đơn mới cần thanh toán online; COD vẫn chạy | Thanh toán VNPay |
| `identity-service` | **Không suy giảm** — toàn hệ thống từ chối yêu cầu cần xác thực | Mọi thứ cần đăng nhập |

`identity-service` và `order-service` là hai service **không có phương án suy giảm**; chúng phải chạy tối thiểu 2 replica
và có PodDisruptionBudget.

## 8. Chỉ tiêu phi chức năng

| ID | Chỉ tiêu | Mục tiêu | Đo bằng |
|---|---|---|---|
| NFR-001 | p95 API đọc | ≤ 300 ms | Prometheus histogram tại gateway |
| NFR-002 | p95 API ghi | ≤ 800 ms | như trên |
| NFR-003 | p99 tìm kiếm | ≤ 500 ms | `search-service` |
| NFR-004 | Uptime gateway | ≥ 99,5%/tháng | Probe ngoài |
| NFR-005 | Độ trễ phát tán event (p95) | ≤ 5 giây từ commit tới consumer | Metric outbox |
| NFR-006 | RPO | ≤ 15 phút | Backup Postgres (PITR) |
| NFR-007 | RTO | ≤ 60 phút | Diễn tập khôi phục hằng quý |
| NFR-008 | Đồng thời WebSocket | ≥ 5.000 kết nối | Test tải |
| NFR-009 | Thông lượng đơn | ≥ 50 đơn/phút ở giờ cao điểm | Test tải |
| NFR-010 | Sai lệch đối soát thanh toán | 0 giao dịch | Job đối soát hằng ngày |
| NFR-011 | Thời gian khởi động một service | ≤ 30 giây tới trạng thái ready | Readiness probe |
| NFR-012 | Độ phủ test service lõi | ≥ 70% dòng | CI |
| NFR-013 | Kích thước bundle FE (route chính, gzip) | ≤ 250 KB | `next build` |
| NFR-014 | Lighthouse Performance (trang sản phẩm, mobile) | ≥ 85 | CI |
| NFR-015 | Khả năng truy cập | WCAG 2.2 AA | axe + kiểm thủ công |

## 9. Chi phí phải trả của kiến trúc này

Trung thực về đánh đổi (chi tiết trong [ADR-0001](adr/ADR-0001-microservices.md)):

| Cái được | Cái mất |
|---|---|
| Mở rộng và triển khai độc lập từng miền | Không còn transaction ACID xuyên miền → phải dùng saga |
| Ranh giới sở hữu dữ liệu rõ ràng | Truy vấn xuyên miền phải dựng read model, dữ liệu trùng lặp |
| Hỏng cục bộ không lan | Vận hành phức tạp hơn nhiều: 17 pipeline, 16 DB, 1 message broker phải trông |
| Đội có thể làm song song | Dev local nặng hơn, cần compose nhiều container |
| Công nghệ theo miền | Gỡ lỗi xuyên service cần tracing, không thể đọc một stack trace là xong |

**Điều kiện dừng:** nếu sau 6 tháng số service hoạt động thực sự độc lập < 5, xem xét gộp lại thành modular monolith.
Tiêu chí đánh giá ghi trong [risks.md](../07-plan/risks.md).
