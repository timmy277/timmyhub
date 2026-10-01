// Barrel nhẹ — chỉ decorator/type/hằng số thuần, không kéo theo platform.module.ts.
// Lý do tách riêng: platform.module.ts import IdentityModule, còn controller của identity/catalog
// cần các decorator này → import qua '../platform/index' (barrel đầy đủ) sẽ tạo circular require
// (platform.module -> IdentityModule -> identity controllers -> platform/index -> platform.module).
// Dùng '@timmyhub/modules/platform/auth' (package self-reference) để phá vòng lặp này.
export * from './auth.constants'
export * from './interfaces/index'
export * from './decorators/index'
export * from './interceptors/index'
