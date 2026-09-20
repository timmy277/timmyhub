import type { Request } from 'express'
import { Body, Controller, Post, Req } from '@nestjs/common'
import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from '@timmyhub/contracts'
import { LoginSchema, LogoutSchema, RefreshSchema, RegisterSchema } from '@timmyhub/contracts'
import { ZodValidationPipe } from '@timmyhub/common'

import { AuthService } from './auth.service'

@Controller('v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput) {
        return this.authService.register(body)
    }

    @Post('login')
    login(@Body(new ZodValidationPipe(LoginSchema)) body: LoginInput, @Req() req: Request) {
        return this.authService.login(body, {
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
        })
    }

    @Post('refresh')
    refresh(@Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput) {
        return this.authService.refresh(body.refreshToken)
    }

    @Post('logout')
    logout(@Body(new ZodValidationPipe(LogoutSchema)) body: LogoutInput) {
        return this.authService.logout(body.refreshToken)
    }

    @Post('logout-all')
    logoutAll(@Body(new ZodValidationPipe(LogoutSchema)) body: LogoutInput) {
        return this.authService.logoutAll(body.refreshToken)
    }
}
