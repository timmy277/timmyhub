import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateUserInput,
    LockUserInput,
    UpdateUserInput,
    UserDetail,
    UserListQuery,
    UserListResult,
} from '@timmyhub/contracts'
import { CreateUserSchema, LockUserSchema, UpdateUserSchema, UserListQuerySchema } from '@timmyhub/contracts'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { USERS_ROUTE, USERS_ROUTE_PARAM } from '../identity.constants'
import { UsersService } from './users.service'

// Quản trị người dùng (FEAT-USR-004/005) — docs/03-specs/user-profile/design.md §2.
//
// Ai vào được do **permission** quyết định, không phải role: mỗi endpoint khai báo một `identity:users:*` và
// PermissionsGuard (lớp 2) kiểm với permission hiệu lực đọc từ DB. Nhờ vậy một vai trò tự tạo có đúng quyền
// `identity:users:list` vẫn dùng được màn hình này mà không cần mang role ADMIN (yêu cầu của chủ dự án).
// Controller chỉ nhận/validate input; mọi luật nghiệp vụ nằm ở UsersService.
@Controller(USERS_ROUTE.ROOT)
export class UsersController {
    // ===== Dependencies =====
    constructor(private readonly usersService: UsersService) {}

    // ===== Queries =====
    @Permissions('identity:users:list')
    @Get()
    list(@Query(new ZodValidationPipe(UserListQuerySchema)) query: UserListQuery): Promise<UserListResult> {
        return this.usersService.listUsers(query)
    }

    @Permissions('identity:users:read')
    @Get(USERS_ROUTE.USER)
    detail(@Param(USERS_ROUTE_PARAM.USER_ID) userId: string): Promise<UserDetail> {
        return this.usersService.getUser(userId)
    }

    // ===== Commands =====
    @Permissions('identity:users:create')
    @Post()
    create(
        @Body(new ZodValidationPipe(CreateUserSchema)) body: CreateUserInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<UserDetail> {
        return this.usersService.createUser(body, actor)
    }

    @Permissions('identity:users:update')
    @Patch(USERS_ROUTE.USER)
    update(
        @Param(USERS_ROUTE_PARAM.USER_ID) userId: string,
        @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<UserDetail> {
        return this.usersService.updateUser(userId, body, actor)
    }

    // REQ-USR-012: lý do bắt buộc khi khoá — có lý do mới giải thích được cho người bị khoá và cho audit.
    // `@HttpCode(200)`: đây là hành động trên tài nguyên đã có (trả về chính tài khoản sau khi đổi trạng thái),
    // không tạo tài nguyên mới nên không dùng 201 của Nest mặc định (api-conventions §4).
    @Permissions('identity:users:lock')
    @HttpCode(HttpStatus.OK)
    @Post(USERS_ROUTE.LOCK)
    lock(
        @Param(USERS_ROUTE_PARAM.USER_ID) userId: string,
        @Body(new ZodValidationPipe(LockUserSchema)) body: LockUserInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<UserDetail> {
        return this.usersService.setUserLocked(userId, true, actor, body)
    }

    @Permissions('identity:users:lock')
    @HttpCode(HttpStatus.OK)
    @Post(USERS_ROUTE.UNLOCK)
    unlock(@Param(USERS_ROUTE_PARAM.USER_ID) userId: string, @CurrentUser() actor: AuthUser): Promise<UserDetail> {
        return this.usersService.setUserLocked(userId, false, actor)
    }

    // `DELETE` là xoá mềm (api-conventions §2) — giữ bản ghi cho audit, thu hồi mọi phiên đang hoạt động.
    @Permissions('identity:users:delete')
    @Delete(USERS_ROUTE.USER)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param(USERS_ROUTE_PARAM.USER_ID) userId: string, @CurrentUser() actor: AuthUser): Promise<void> {
        return this.usersService.deleteUser(userId, actor)
    }
}
