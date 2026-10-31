import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OnEvent } from '@nestjs/event-emitter'
import * as nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export type SendMailOptions = {
    to: string
    subject: string
    html: string
    text?: string
}

@Injectable()
export class MailService {
    // ===== Dependencies =====
    private readonly logger = new Logger(MailService.name)
    private readonly transporter: Transporter | null = null

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST')
        const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587)
        const user = this.configService.get<string>('SMTP_USER')
        const pass = this.configService.get<string>('SMTP_PASSWORD')

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            })
            this.logger.log(`SMTP transport initialized for ${user} via ${host}:${port}`)
        } else {
            this.logger.warn('SMTP configuration is missing. MailService will operate in log-only mode.')
        }
    }

    // ===== Commands =====

    async sendMail(options: SendMailOptions): Promise<boolean> {
        const from =
            this.configService.get<string>('SMTP_FROM') ||
            this.configService.get<string>('SMTP_USER') ||
            'noreply@timmyhub.com'

        if (!this.transporter) {
            this.logger.warn(
                `[MOCK EMAIL] To: ${options.to} | Subject: ${options.subject} | Transporter not configured.`,
            )
            return false
        }

        try {
            await this.transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            })
            this.logger.log(`Email successfully sent to ${options.to} with subject "${options.subject}"`)
            return true
        } catch (error) {
            this.logger.error(`Failed to send email to ${options.to}: ${(error as Error).message}`)
            return false
        }
    }

    async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
        const subject = 'TimmyHub - Đặt lại mật khẩu tài khoản'
        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lại mật khẩu TimmyHub</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 32px 24px; }
        .content p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #475569; }
        .button-wrapper { text-align: center; margin: 28px 0; }
        .button { display: inline-block; background-color: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.25); }
        .divider { border-top: 1px solid #f1f5f9; margin: 24px 0; }
        .note { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TimmyHub</h1>
        </div>
        <div class="content">
            <p>Xin chào,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>${to}</strong> trên nền tảng TimmyHub.</p>
            <p>Vui lòng nhấn vào nút bên dưới để tiến hành tạo mật khẩu mới:</p>
            <div class="button-wrapper">
                <a href="${resetLink}" class="button" target="_blank" rel="noopener noreferrer">Đặt lại mật khẩu</a>
            </div>
            <div class="divider"></div>
            <p class="note">⚠️ Liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> vì lý do bảo mật.</p>
            <p class="note">Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Mật khẩu của bạn vẫn được giữ nguyên an toàn.</p>
        </div>
        <div class="footer">
            © 2026 TimmyHub Marketplace. All rights reserved.
        </div>
    </div>
</body>
</html>
`
        const text = `Xin chào,\n\nBạn đã yêu cầu đặt lại mật khẩu trên TimmyHub.\nVui lòng truy cập liên kết sau (có hiệu lực 15 phút) để tạo mật khẩu mới:\n${resetLink}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.\n\nTimmyHub Team`

        return this.sendMail({
            to,
            subject,
            html,
            text,
        })
    }

    // ===== Event Listeners =====

    @OnEvent('identity.user.password_reset_requested')
    async handlePasswordResetRequested(payload: { email: string; resetLink: string }): Promise<void> {
        this.logger.log(`Received password reset event for email: ${payload.email}`)
        await this.sendPasswordResetEmail(payload.email, payload.resetLink)
    }
}
