import { Body, Controller, Post, Req } from '@nestjs/common'
import type { Request } from 'express'

import { ZodValidationPipe } from '@timmyhub/common'
import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from '@timmyhub/contracts'
import { LoginSchema, LogoutSchema, RefreshSchema, RegisterSchema } from '@timmyhub/contracts'
import { Public } from '@timmyhub/modules/platform/auth'

import { AuthService } from './auth.service'
import { AUTH_ROUTE } from './identity.constants'

// Toàn bộ endpoint ở đây xảy ra TRƯỚC khi có access token hợp lệ — phải @Public(), nếu không JwtAuthGuard chặn hết.
@Controller(AUTH_ROUTE.ROOT)
export class AuthController {
    // ===== Dependencies =====
    constructor(private readonly authService: AuthService) {}

    // ===== Commands =====
    @Public()
    @Post(AUTH_ROUTE.REGISTER)
    register(@Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput) {
        return this.authService.register(body)
    }

    @Public()
    @Post(AUTH_ROUTE.LOGIN)
    login(@Body(new ZodValidationPipe(LoginSchema)) body: LoginInput, @Req() req: Request) {
        return this.authService.login(body, {
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        })
    }

    @Public()
    @Post(AUTH_ROUTE.REFRESH)
    refresh(@Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput) {
        return this.authService.refresh(body.refreshToken)
    }

    @Public()
    @Post(AUTH_ROUTE.LOGOUT)
    logout(@Body(new ZodValidationPipe(LogoutSchema)) body: LogoutInput) {
        return this.authService.logout(body.refreshToken)
    }

    @Public()
    @Post(AUTH_ROUTE.LOGOUT_ALL)
    logoutAll(@Body(new ZodValidationPipe(LogoutSchema)) body: LogoutInput) {
        return this.authService.logoutAll(body.refreshToken)
    }
}
