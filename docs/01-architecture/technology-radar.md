---
title: Technology radar — nên thêm công nghệ gì vào TimmyHub
status: review
owner: Tech Lead
updated: 2026-09-19
related: [docs/00-overview/project-plan.md, docs/01-architecture/system-architecture.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/01-architecture/observability.md, docs/01-architecture/security.md, docs/05-infra/cicd.md]
---

# Technology radar — nên thêm gì vào stack

> Sau [ADR-0015](adr/ADR-0015-modular-monolith.md) (2026-09-19), backend là một app NestJS module hoá, không phải
> 17 service qua RabbitMQ. Các mục dưới đây viết ở thời điểm còn kiến trúc microservices; những chỗ không còn đúng
> đã được cập nhật trực tiếp (đánh dấu vòng lại nếu đổi), phần còn lại (frontend, hạ tầng chung, tuân thủ) không phụ
> thuộc vào lựa chọn microservices hay monolith nên giữ nguyên.
>
> Tài liệu này **không** thay §7 của [project-plan.md](../00-overview/project-plan.md). §7 là stack đã chốt.
> Đây là kết quả rà soát stack đó theo mặt bằng công nghệ web quý 3/2026, chỉ ra **lỗ hổng** và **đề xuất bổ sung**,
> mỗi mục kèm lý do, chi phí phải trả và mốc quyết định. Mục nào được duyệt thì mới chuyển thành ADR + feature `FEAT-*`.

Quy ước vòng radar:

| Vòng | Nghĩa |
|---|---|
| **ADOPT** | Nên đưa vào ngay, rủi ro thấp, bù đúng một lỗ hổng đang có |
| **TRIAL** | Dùng thử có kiểm soát trong một phạm vi hẹp, đo rồi mới mở rộng |
| **ASSESS** | Theo dõi, chưa làm; ghi rõ điều kiện kích hoạt |
| **HOLD** | Cố ý không dùng, kèm lý do để sau này khỏi tranh luận lại |

---

## 1. Mười lỗ hổng lớn nhất của stack hiện tại

Xếp theo mức độ chặn nghiệp vụ, không theo độ thú vị kỹ thuật.

| # | Lỗ hổng | Hệ quả nếu để nguyên | Đề xuất | Vòng |
|---|---|---|---|---|
| 1 | **Không có tích hợp đơn vị vận chuyển** | Đơn có `SHIPPING`/`DELIVERED` nhưng không ai biết hàng ở đâu; phải cập nhật tay | Domain mới `shipping-logistics` + GHN / GHTK / Viettel Post qua một `CarrierAdapter` | ADOPT |
| 2 | **Ví seller không có sổ cái kép** | Số dư lệch là không truy được nguyên nhân, không đối soát được với sao kê ngân hàng | Double-entry ledger append-only trong `payment-service` | ADOPT |
| 3 | **Không có đường transcode video** | `video-ads` và post video không chạy được: file 50 MB phát thẳng, không HLS, không thumbnail | ffmpeg worker (BullMQ) → HLS, hoặc Cloudflare Stream/Mux nếu chấp nhận dịch vụ ngoài | ADOPT |
| 4 | **Impression/click quảng cáo đổ thẳng vào Postgres** | Bảng vài trăm triệu dòng/tháng, analytics và OLTP tranh nhau I/O | ClickHouse cho event lượng lớn; Postgres chỉ giữ số liệu đã tổng hợp | TRIAL |
| 5 | **Không có sinh client từ API** | Hàng trăm endpoint của `backend/apps/api`, FE gõ tay type → lệch hợp đồng lúc chạy mới biết | `openapi-typescript` + `orval` sinh axios client từ Swagger; AsyncAPI cho event | ADOPT |
| 6 | **Không có contract test cho tích hợp bên ngoài** | Đổi payload/response của VNPay, GHN/GHTK, Elasticsearch làm gãy luồng mà CI vẫn xanh (module-tới-module trong process thì TypeScript đã bắt lỗi biên dịch, không cần Pact) | Pact chỉ cho **ranh giới thật ra ngoài process** (cổng thanh toán, vận chuyển) | TRIAL |
| 7 | **CI không quét bí mật / lỗ hổng** | Chính repo cũ đã lộ 4 bộ credential — không có gì ngăn tái diễn | `gitleaks` + Trivy (fs + image) + Renovate + SBOM | ADOPT |
| 8 | **Không có kiểm thử tải** | NFR "5.000 kết nối WS, p95 < 300 ms" chỉ là câu chữ, không ai chứng minh | k6 chạy theo lịch trên staging, gắn ngưỡng vào CI | ADOPT |
| 9 | **Không có chống bot ở điểm nhạy cảm** | Đăng ký ảo, cày voucher, review rác, click tặc quảng cáo | Cloudflare Turnstile + rate limit theo thiết bị + luật phát hiện click gian lận | ADOPT |
| 10 | **Không có lớp pooling kết nối DB** | N pod của app duy nhất × pool mặc định vượt `max_connections` của Postgres khi scale ngang | PgBouncer (hoặc Supabase pooler) ở chế độ transaction | ADOPT |

---

## 2. Frontend

### 2.1 ADOPT

| Bổ sung | Vì sao | Chi phí phải trả |
|---|---|---|
| **React Compiler** (ổn định 1.0 từ 10/2025, Next.js bật mặc định cho app mới) | Bỏ gần hết `useMemo`/`useCallback` thủ công; Meta báo tải trang nhanh hơn ~12%, một số tương tác nhanh ~2,5× | Build chậm hơn do bước Babel; phải giữ code tuân thủ Rules of React |
| **MSW (Mock Service Worker)** | Hiện không có cách test FE khi BE chưa xong; MSW dùng chung cho Vitest, Playwright và Storybook | Phải giữ mock đồng bộ với Swagger — giải bằng sinh mock từ `orval` |
| **`orval` + `openapi-typescript`** | Sinh hook TanStack Query + type + mock MSW trực tiếp từ Swagger của gateway | Bắt buộc Swagger phải chuẩn; thêm một bước sinh code trong CI |
| **TipTap** ✅ đã chốt | `content-post` cần soạn thảo giàu định dạng có gắn thẻ sản phẩm | Phải sanitize phía server — quy định ở [editor-and-uploader.md](../04-frontend/editor-and-uploader.md) |
| **`hls.js` + `media-chrome`** ✅ đã chốt | Feed video dọc và video quảng cáo cần phát HLS, đo thời lượng xem để tính phí | Thêm ~40 KB; phải xử lý autoplay policy của trình duyệt |
| **Uppy + tus (upload nối lại được)** ✅ đã chốt | Video trên 4G đứt giữa chừng là mất trắng; Supabase Storage hỗ trợ tus sẵn tới 50 GB | `chunkSize` bắt buộc 6 MB; `media-service` cấp token upload có hạn |
| **`@axe-core/playwright` + `eslint-plugin-jsx-a11y` + Storybook a11y addon** ✅ đã chốt | Cam kết WCAG 2.2 AA hiện không có gì kiểm chứng tự động | Đợt đầu sẽ ra nhiều lỗi; cần thời gian dọn |
| **Lighthouse CI + `size-limit`** ✅ đã chốt | Ngân sách hiệu năng phải là điều kiện merge, không phải lời hứa | Phải chốt ngưỡng thật, không đặt cho có |
| **`dinero.js` (hoặc lớp `Money` tự viết)** ✅ đã chốt | Tiền truyền qua API dạng **chuỗi decimal**; FE tính bằng `number` sẽ sai số ở đơn nhiều dòng | Lập trình viên phải bỏ thói quen `price * qty` |
| **Turborepo** (trên pnpm workspace) ✅ đã chốt | `backend/apps/api` + FE + các gói chia sẻ trong monorepo: cache tác vụ theo nội dung, CI chỉ build phần đổi | Thêm một lớp cấu hình; cần remote cache để có lợi thật |
| **Storybook 9** thay vì 8 ✅ đã chốt | Bản đang chốt trong §7 đã cũ một thế hệ; 9 nhẹ hơn và test runner tốt hơn | Nâng addon |

### 2.2 TRIAL

| Bổ sung | Phạm vi thử | Điều kiện mở rộng |
|---|---|---|
| **Biome** cho format + phần lớn lint | Thư mục `frontend/` trước | Thời gian pre-commit giảm ≥ 5×; vẫn giữ ESLint tối thiểu cho `import/no-cycle` và `jsx-a11y` mà Biome chưa có |
| **Serwist** (service worker) cho web push + offline nhẹ | Trang đơn hàng và thông báo | Tỷ lệ nhận push ≥ 80% trên Android |
| **PostHog self-host** cho product analytics & funnel | Luồng xem sản phẩm → giỏ → đặt hàng | Dữ liệu khớp ±5% với `analytics-service` |
| **Visual regression** (Storybook test-runner + ảnh chụp Playwright) | Bộ component design system | Ít hơn 1 ảnh sai lệch giả/tuần |

### 2.3 ASSESS / HOLD

| Mục | Vòng | Ghi chú |
|---|---|---|
| Server Actions làm kênh ghi chính | **HOLD** | Backend là NestJS qua gateway; dùng Server Action sẽ tạo đường ghi thứ hai không qua RBAC tập trung. Chỉ dùng cho form không chạm dữ liệu nghiệp vụ |
| tRPC | **HOLD** | Chỉ hợp khi BE cũng là TypeScript trong cùng repo triển khai; ở đây REST + OpenAPI là hợp đồng trung lập hơn |
| TanStack Start / bỏ Next.js | **HOLD** | Cần SEO và ISR cho trang sản phẩm |
| Partial Prerendering cho trang chi tiết sản phẩm | **ASSESS** | Bật khi Next.js 16 đánh dấu ổn định trên bản đang dùng |
| Vercel AI SDK + Claude cho bot hỗ trợ, tóm tắt review | **ASSESS** | Kích hoạt khi `chat-support` đạt > 500 ticket/ngày |

---

## 3. Backend

### 3.1 ADOPT

| Bổ sung | Vì sao | Chi phí phải trả |
|---|---|---|
| **`@nestjs/terminus`** | Chưa chốt cách làm `/health/live` và `/health/ready`; k8s cần cả hai khác nhau | Phải định nghĩa "ready" đúng: Postgres + Redis (BullMQ), **không** kiểm tra dịch vụ ngoài (VNPay, Elasticsearch) — tránh coi web process không sẵn sàng chỉ vì một tích hợp ngoài đang chậm |
| **Xác thực config lúc khởi động bằng zod** | Thiếu một biến môi trường hiện chỉ lộ ra khi gọi tới chức năng đó | Không được phép có giá trị mặc định ngầm cho biến bí mật |
| **`cockatiel`** (retry + circuit breaker + bulkhead) | Module-tới-module trong process không cần circuit breaker (lỗi là exception TypeScript bắt được lúc build); cần cho lời gọi ra hệ thống **thật sự ngoài process**: VNPay, GHN/GHTK, Elasticsearch, Supabase Storage | Phải chỉnh ngưỡng theo từng tích hợp ngoài |
| **Idempotency-Key middleware** cho mọi POST public | Người dùng bấm đúp "Đặt hàng" tạo hai đơn; hiện chỉ IPN thanh toán là idempotent | Cần bảng/Redis lưu key 24 giờ |
| **Double-entry ledger** cho ví và đối soát | Sổ cái append-only, mỗi bút toán cân bằng về 0, có tài khoản treo cho tiền đang giữ; đối soát chạy định kỳ chứng minh sổ khớp | Mô hình phức tạp hơn `balance += x`; phải đào tạo đội |
| **`gitleaks` + Trivy + Renovate + SBOM (Syft)** trong CI | Repo cũ đã lộ Sentry token, Supabase connection string, Vercel token, Google API key | PR sẽ bị chặn nhiều hơn ở giai đoạn đầu |
| **k6** kiểm thử tải theo lịch | Không đo thì NFR chỉ là nguyện vọng | Cần môi trường staging giống prod về cấu hình |
| **Cloudflare Turnstile** + WAF/rate limit ở biên | Đăng ký ảo, cày voucher, click tặc quảng cáo | Thêm một phụ thuộc bên ngoài ở đường đăng nhập |
| **ClamAV** quét file tải lên | `media-service` mới kiểm magic byte, chưa quét mã độc | Thêm một sidecar, làm job upload chậm hơn |
| **PgBouncer / Supabase pooler** (transaction mode) | Một app duy nhất nhưng scale ngang nhiều pod (mỗi pod một `PrismaClient` pool `max: 20`) vẫn có thể vượt `max_connections` khi HPA scale mạnh | Prisma phải dùng `pgbouncer=true`, mất prepared statement |
| **AsyncAPI** cho domain event | Event hiện chỉ được mô tả bằng văn xuôi; dù transport giờ là `EventEmitter2` trong process, AsyncAPI vẫn cho phép sinh type và kiểm tra payload nhất quán ở `@timmyhub/contracts` | Phải giữ file spec đồng bộ với `@timmyhub/contracts` |
| **Bộ phân tích tiếng Việt cho Elasticsearch** | Tìm "áo thun nam" mà không tách từ tiếng Việt thì kết quả rất kém | Cần ảnh ES tự dựng có plugin, không dùng được bản managed trần |
| **`react-email` + nhà cung cấp gửi mail chuyên dụng (Resend / Amazon SES) + SPF/DKIM/DMARC** | SMTP trần của Nodemailer rơi vào spam; email xác thực và hoá đơn là đường sống | Chi phí theo lượng gửi; phải cấu hình DNS |

### 3.2 TRIAL

| Bổ sung | Phạm vi thử | Điều kiện mở rộng |
|---|---|---|
| **Pact + Pact Broker** | Tích hợp VNPay (IPN/return) và GHN/GHTK/Viettel Post — ranh giới thật sự ngoài process | Bắt được ≥ 1 breaking change thật trước khi lên staging |
| **ClickHouse** cho `ad_impression`, `ad_click`, `page_view` | Domain `video-ads` | > 5 triệu bản ghi/ngày hoặc truy vấn báo cáo > 3 giây trên Postgres |
| **OpenFeature** (giao diện chuẩn) + **GO Feature Flag** (một binary, không cần DB) | Cờ tính năng của `master-data` | Sau khi rollout dần được 2 tính năng thật. Lưu ý: bản mã nguồn mở của Unleash Edge ngừng hỗ trợ 31/12/2026 |
| **Grafana Alloy** (bản phân phối OpenTelemetry Collector) + **Tempo** + **Loki** | Gom trace/log của 3 service lõi | Truy được một sự cố thật từ log → trace → metric. LGTM đầy đủ tốn người vận hành; nếu đội < 8 người thì dùng Grafana Cloud |
| **Lint migration** (`squawk` / `atlas`) | Mọi migration của `catalog_db` và `order_db` | Chặn được khoá bảng nguy hiểm trên bảng lớn |
| **`pgvector`** cho "sản phẩm tương tự" và chống review trùng lặp | `catalog-service` | CTR gợi ý tăng so với gợi ý theo danh mục |

### 3.3 ASSESS

| Mục | Điều kiện kích hoạt |
|---|---|
| **Temporal** (durable execution) | Từ [ADR-0015](adr/ADR-0015-modular-monolith.md), checkout không còn là saga — reserve tồn kho/voucher và tạo đơn nằm trong một `$transaction`. Chỉ đáng cân nhắc nếu xuất hiện luồng thật sự chạy dài nhiều ngày và cần retry/tạm dừng bền (khiếu nại, hoàn tiền qua ngân hàng, workflow duyệt seller nhiều bước) |
| **Debezium CDC** thay outbox tự viết | Khi outbox publisher trở thành nút thắt hoặc lệch dữ liệu nhiều lần |
| **Cổng thanh toán thứ hai** (MoMo, ZaloPay, VietQR) | Ngay từ đầu phải trừu tượng hoá `PaymentProvider` để không phải sửa lõi sau này |
| **Hoá đơn điện tử** (Nghị định 123/2020) | Khi có seller là doanh nghiệp xuất hoá đơn |
| **Argo CD + Argo Rollouts** (GitOps, canary) | Khi số lần deploy > 5 lần/tuần |
| **Novu** làm hạ tầng thông báo | Chỉ nếu `notification-service` tự viết tỏ ra tốn công bảo trì |

### 3.4 HOLD — cố ý không dùng

| Mục | Lý do |
|---|---|
| **Kafka / RabbitMQ (message broker)** | Không cần message broker: event trong process qua `EventEmitter2`, việc cần bền qua crash đi qua outbox + BullMQ trên Postgres/Redis đã có sẵn ([ADR-0015](adr/ADR-0015-modular-monolith.md), thay cho lựa chọn RabbitMQ cũ ở [ADR-0003](adr/ADR-0003-rabbitmq-event-bus.md), nay đã superseded). Xem lại nếu một module thật sự cần tách thành service riêng và cần replay lịch sử event |
| **Service mesh (Istio/Linkerd)** | Một app duy nhất (2 process: web, worker) không có lưu lượng giữa-service để mesh quản lý; mTLS/network policy chỉ còn cần ở biên (Postgres, Redis, hệ thống ngoài) |
| **gRPC giữa các module** | Gọi giữa module là lời gọi hàm trong process (DI), không phải giao thức mạng — gRPC chỉ đáng cân nhắc lại nếu một module được tách thành service riêng theo điều kiện ở ADR-0015 |
| **Typesense / Meilisearch thay Elasticsearch** | Nhanh và dễ vận hành hơn, nhưng sàn cần facet phức tạp, nhiều điều kiện xếp hạng và tổng hợp — đúng chỗ mạnh của ES. Ghi lại để nếu ES thành gánh nặng vận hành thì có đường lùi |
| **GraphQL** | Client là web nội bộ của chính ta, OpenAPI + sinh client đã đủ; GraphQL thêm bài toán N+1 và phân quyền theo field |
| **Drizzle thay Prisma** | Prisma 7 đã có driver adapter và client extension — chính là thứ chiến lược audit log dựa vào |

---

## 4. Hạ tầng, bảo mật, tuân thủ

| Bổ sung | Vòng | Ghi chú |
|---|---|---|
| **Diễn tập khôi phục dữ liệu** (PITR + khôi phục thật mỗi quý) | ADOPT | Có backup mà chưa từng khôi phục thì coi như chưa có backup |
| **External Secrets Operator + Sealed Secrets** | ADOPT | Đã nêu trong §7.3, cần nâng lên thành việc cụ thể ở sprint hạ tầng |
| **Network policy mặc định deny** giữa các namespace | ADOPT | Một database dùng chung cho toàn app; ranh giới giữa module là quy ước code + ESLint boundary rule (xem `security.md §13`), network policy chỉ còn chặn truy cập Postgres/Redis từ ngoài namespace, không chặn được module-tới-module vì chúng ở cùng process |
| **SLO + error budget** (Sloth hoặc Grafana SLO) | TRIAL | Gắn với NFR-001…NFR-012 để cảnh báo có ý nghĩa thay vì cảnh báo CPU |
| **Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân** | ADOPT | Cần: bản ghi đồng ý, xuất dữ liệu cá nhân theo yêu cầu, xoá/ẩn danh khi đóng tài khoản, nhật ký truy cập dữ liệu cá nhân. Hiện `docs/` mới có phần redaction, chưa có quyền của chủ thể dữ liệu |
| **Cookie consent + phân loại cookie** | ADOPT | Kéo theo việc nạp PostHog/analytics có điều kiện |
| **Sổ tay xử lý sự cố + phiên diễn tập** | ADOPT | `runbook.md` đã có chỗ; cần một buổi diễn tập trước khi mở bán |
| **Chaos engineering** | ASSESS | Sau khi SLO chạy ổn định 1 quý |

---

## 5. Ảnh hưởng tới kế hoạch nếu duyệt

Bốn đề xuất dưới đây **không phải là thêm thư viện** mà làm thay đổi phạm vi; cần người quyết định rõ ràng:

| Đề xuất | Thay đổi phạm vi | Ước lượng thêm |
|---|---|---|
| Domain mới **`shipping-logistics`** (module thứ 17 trong `backend/apps/api`, không phải service/database riêng) | +1 module, +1 file schema Prisma, +3 file spec, ~14 `FEAT-*`, 4 event mới | ~3 sprint |
| **Double-entry ledger** trong module `payment` (ví) | Viết lại mô hình dữ liệu ví, +6 `FEAT-*` | ~1 sprint |
| ✅ **Đường xử lý video** — **đã duyệt 16/09/2026**, chọn ffmpeg tự host ([ADR-0014](adr/ADR-0014-video-pipeline.md)) | +1 hàng đợi BullMQ chạy trên worker process, +6 `FEAT-MED-*`, dùng lại 4 event `media.*` đã có | ~1,5 sprint |
| **ClickHouse** cho event quảng cáo | +1 kho dữ liệu phải vận hành, đổi đường ghi của module `video-ads` | ~1 sprint |

**Đã chốt:** đường xử lý video — tự transcode bằng ffmpeg worker, lưu HLS trên object storage tương thích S3, phát qua
CDN egress bằng 0; chi tiết ở [media-video-pipeline.md](media-video-pipeline.md), lý do và phương án bị loại ở
[ADR-0014](adr/ADR-0014-video-pipeline.md). Ba mục còn lại vẫn chờ quyết định.

Ba mục đầu tôi cho là **nên làm**: thiếu vận chuyển thì đơn hàng không khép được vòng, thiếu sổ cái kép thì tiền không
đối soát được, thiếu transcode thì cả domain quảng cáo video không chạy. ClickHouse thì có thể hoãn tới khi số liệu
thực tế chứng minh Postgres không chịu nổi.

---

## 6. Việc cần làm tiếp theo

1. Chốt 4 mục ở §5 — đây là quyết định phạm vi, thuộc về PO và Tech Lead.
2. Mục nào được duyệt thì viết ADR tương ứng: `ADR-0013` tìm kiếm, `ADR-0014` đường xử lý video, `ADR-0015` modular monolith (đã duyệt), `ADR-0016` sổ cái kép, `ADR-0017` tích hợp vận chuyển.
3. Cập nhật [feature-inventory.md](../00-overview/feature-inventory.md) với các `FEAT-*` mới và cập nhật lại tổng số.
4. Bổ sung công cụ đã ADOPT ở §2–§4 vào [cicd.md](../05-infra/cicd.md) và [testing-strategy.md](../06-quality/testing-strategy.md).

## Nguồn tham khảo

- [Next.js 16 App Router — hướng dẫn 2026](https://getcraftly.dev/blog/nextjs-16-app-router-guide)
- [React Compiler sau một năm: đánh giá dùng thật](https://www.refontelearning.com/blog/react-compiler-production-assessment)
- [Biome vs ESLint vs Oxlint 2026](https://www.pkgpulse.com/guides/biome-vs-eslint-vs-oxlint-2026)
- [Biome vs ESLint trong monorepo — đo pre-commit](https://fireup.pro/news/pre-commit-hooks-15x-faster-biome-vs-eslint-case-study)
- [LGTM stack với OpenTelemetry](https://oneuptime.com/blog/post/2026-02-06-lgtm-stack-opentelemetry/view)
- [OpenTelemetry trong NestJS](https://last9.io/blog/opentelemetry-in-nestjs/)
- [So sánh công cụ feature flag mã nguồn mở 2026](https://flagshark.com/blog/open-source-feature-flag-tools-compared-2026/)
- [Unleash vs OpenFeature](https://www.macrostack.net/compare/openfeature-vs-unleash)
- [Saga orchestration vs choreography — Temporal](https://temporal.io/blog/to-choreograph-or-orchestrate-your-saga-that-is-the-question)
- [Saga orchestration cho nền tảng thương mại 2026](https://appscale.blog/en/blog/microservices-pattern-saga-orchestration-2026)
- [Contract testing với Pact — hướng dẫn 2026](https://qaskills.sh/blog/contract-testing-pact-complete-guide)
- [Double-entry ledger API cho marketplace](https://nordlet.com/en/blog/double-entry-ledger-api-marketplaces/)
- [Thiết kế ví điện tử với sổ cái kép](https://dev.to/roni_das_b1b76c5ee6583027/designing-a-digital-wallet-with-a-double-entry-ledger-dik)
- [Elasticsearch vs Typesense vs Meilisearch 2026](https://ossalt.com/blog/meilisearch-vs-typesense-vs-elasticsearch-search-2026)
- [Hạ tầng tìm kiếm cho SaaS 2026](https://spiderhunts.com/blog/search-infrastructure-algolia-typesense-meilisearch-elasticsearch-2026)
