import type { Request } from 'express'
import { Body, Controller, Post, Req } from '@nestjs/common'
import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from '@timmyhub/contracts'
import { LoginSchema, LogoutSchema, RefreshSchema, RegisterSchema } from '@timmyhub/contracts'
import { ZodValidationPipe } from '@timmyhub/common'

import { Public } from '@timmyhub/modules/platform/auth'
import { AuthService } from './auth.service'

// Toàn bộ endpoint ở đây xảy ra TRƯỚC khi có access token hợp lệ — phải @Public(), nếu không JwtAuthGuard chặn hết.
@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    register(@Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput) {
        return this.authService.register(body)
    }

    @Public()
    @Post('login')
    login(@Body(new ZodValidationPipe(LoginSchema)) body: LoginInput, @Req() req: Request) {
        return this.authService.login(body, {
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        })
    }

    @Public()
    @Post('refresh')
    refresh(@Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput) {
        return this.authService.refresh(body.refreshToken)
    }

    @Public()
    @Post('logout')
    logout(@Body(new ZodValidationPipe(LogoutSchema)) body: LogoutInput) {
        return this.authService.logout(body.refreshToken)
    }

    @Public()
    @Post('logout-all')
    logoutAll(@Body(new ZodValidationPipe(LogoutSchema)) body: LogoutInput) {
        return this.authService.logoutAll(body.refreshToken)
    }
}
