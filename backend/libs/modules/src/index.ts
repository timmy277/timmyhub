// Không export * từ từng domain ở đây: DTO tối giản (ping.dto.ts) trùng tên giữa các domain.
// Import domain qua subpath riêng (@timmyhub/modules/identity, /catalog, /platform), đây chỉ export phần dùng chung.
export { IdentityModule, IdentityService } from './identity/index'
export { CatalogModule, CatalogService } from './catalog/index'
export { MediaModule, MediaService } from './media/index'
export { SellerModule, SellerService } from './seller/index'
export { PlatformModule, PlatformService } from './platform/index'
export { CartModule, CartService, CartRepository } from './cart/index'
