// Không export * từ từng domain ở đây: DTO tối giản (ping.dto.ts) trùng tên giữa các domain.
// Import domain qua subpath riêng (@timmyhub/modules/identity, /catalog, /platform), đây chỉ export phần dùng chung.
export { IdentityModule, IdentityService } from './identity'
export { CatalogModule, CatalogService } from './catalog'
export { PlatformModule, PlatformService } from './platform'
