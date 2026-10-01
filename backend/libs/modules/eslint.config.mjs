// @ts-check
// Kế thừa cấu hình chung ở backend/eslint.config.mjs, thêm rule chặn import chéo giữa các module domain:
// module domain khác không được import thẳng file nội bộ (controller/service/repository/dto/events)
// của một domain khác, chỉ được import qua index.ts (barrel) của domain đó — theo coding-standards.md §3
// và ADR-0015 §"Ranh giới module".
//
// Ghi chú: đã thử eslint-plugin-boundaries (rule "entry-point"), nhưng rule đó đã deprecated và không
// bắt được vi phạm thử nghiệm (đã kiểm chứng bằng cách cố tình import sai rồi chạy eslint). Dùng thẳng
// "no-restricted-imports" của ESLint lõi cho chắc chắn, đơn giản và dễ kiểm chứng hơn.
import base from '../../eslint.config.mjs'

export default [
    ...base,
    {
        files: ['src/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            // `!../events/outbox-writer`: barrel `events/index` kéo theo `IdentityEventsListener`, mà
                            // `@nestjs/event-emitter` là ESM thuần nên Jest/CJS không `require` được — repository phải
                            // import thẳng writer. Đây là import **trong cùng domain**, không phải vi phạm ranh giới;
                            // ngoại lệ khai một lần ở đây thay vì rải `eslint-disable` khắp các repository.
                            group: ['../*/*', '!../*/index', '!../events/outbox-writer'],
                            message:
                                'Chỉ được import module domain khác qua index.ts (barrel), không import thẳng file nội bộ (controller/service/repository/dto/events).',
                        },
                    ],
                },
            ],
        },
    },
    {
        // Test phải chạy được guard/controller **thật** của domain khác để bắt lỗi cấu hình (thiếu `@Permissions`,
        // sai thứ tự guard…), mà barrel cố ý không export controller/guard vì chúng là file nội bộ. Rule ranh giới
        // chỉ có nghĩa với mã chạy production, nên tắt riêng cho file test.
        files: ['src/**/*.spec.ts'],
        rules: {
            'no-restricted-imports': 'off',
        },
    },
    {
        // Ngoại lệ ranh giới cho ngữ cảnh audit. `audit-context.ts` là primitive chỉ phụ thuộc `node:async_hooks`,
        // cố ý KHÔNG nằm trong `identity/index` — vì barrel kéo theo `IdentityEventsListener` →
        // `@nestjs/event-emitter` (ESM thuần), mà Jest chạy CJS nên `require` file đó sẽ nổ
        // `createRequireEsmError` và làm sập cả suite (đã tái hiện). `platform` cần *ghi* ngữ cảnh, `writeAuditLog`
        // cần *đọc*, nên buộc phải import thẳng file nội bộ. Khai ngoại lệ theo **đúng file** thay vì nới glob:
        // phạm vi hẹp, không mở đường cho import chéo tuỳ tiện ở chỗ khác.
        files: ['src/platform/auth/interceptors/audit-context.interceptor.ts'],
        rules: {
            'no-restricted-imports': 'off',
        },
    },
]
