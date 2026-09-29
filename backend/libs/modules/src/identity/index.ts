// Barrel export — chỗ duy nhất module khác được import từ domain identity (ESLint boundaries chặn phần còn lại).
export * from './identity.module'
export * from './identity.service'
export * from './dto/index'
export * from './auth.service'
export { UsersService } from './users/index'
export type { UsersActor } from './users/index'
export { RbacService } from './rbac/index'
export type { RbacActor } from './rbac/index'
