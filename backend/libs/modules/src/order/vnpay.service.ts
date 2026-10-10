import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ReturnQueryFromVNPay } from 'vnpay'
import {
    HashAlgorithm,
    IpnFailChecksum,
    IpnInvalidAmount,
    InpOrderAlreadyConfirmed,
    IpnOrderNotFound,
    IpnSuccess,
    VNPay,
    VnpLocale,
    dateFormat,
} from 'vnpay'
import type { Prisma } from '@timmyhub/prisma'
import { OrderStatus, PaymentStatus, PrismaService } from '@timmyhub/prisma'
import type { Request } from 'express'

export interface VnpayReturnParams {
    vnp_Amount?: string
    vnp_BankCode?: string
    vnp_BankTranNo?: string
    vnp_CardType?: string
    vnp_OrderInfo?: string
    vnp_PayDate?: string
    vnp_ResponseCode?: string
    vnp_TmnCode?: string
    vnp_TransactionNo?: string
    vnp_TransactionStatus?: string
    vnp_TxnRef?: string
    vnp_SecureHash?: string
    vnp_SecureHashType?: string
    [key: string]: string | undefined
}

@Injectable()
export class VnpayService {
    private readonly logger = new Logger(VnpayService.name)
    private readonly vnpay: VNPay
    private readonly returnUrl: string
    private readonly ipnUrl: string

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const tmnCode = this.config.get<string>('VNPAY_TMN_CODE') || 'CGXZLS0Z'
        const secureSecret = this.config.get<string>('VNPAY_HASH_SECRET') || 'XNBCJFAKAZQSGZSSTUSAODNKGTCQLTST'
        const fullUrl = this.config.get<string>('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
        const vnpayHost = fullUrl.startsWith('http') ? new URL(fullUrl).origin : fullUrl

        this.vnpay = new VNPay({
            tmnCode,
            secureSecret,
            vnpayHost,
            testMode: true,
            hashAlgorithm: HashAlgorithm.SHA512,
        })

        this.returnUrl = this.config.get<string>('VNPAY_RETURN_URL') || 'http://localhost:3001/v1/orders/vnpay/return'
        this.ipnUrl = this.config.get<string>('VNPAY_IPN_URL') || 'http://localhost:3001/v1/orders/vnpay/ipn'
    }

    getClientIp(req?: Request): string {
        const forwarded = req?.headers?.['x-forwarded-for']
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0]!.trim()
        }
        if (Array.isArray(forwarded) && forwarded[0]) {
            return String(forwarded[0]).trim()
        }
        return typeof req?.ip === 'string' ? req.ip : '127.0.0.1'
    }

    async createPaymentUrl(
        orders: { id: string; totalAmount: number | string | Prisma.Decimal }[],
        clientIp = '127.0.0.1',
    ): Promise<{ url: string; paymentId: string; txnRef: string }> {
        if (!orders.length) {
            throw new Error('Không có đơn hàng để tạo thanh toán')
        }

        const primaryOrderId = orders[0]!.id
        const orderIds = orders.map((o) => o.id)
        const totalAmountVnd = Math.round(orders.reduce((sum, o) => sum + Number(o.totalAmount), 0))

        const txnRef = `TH${primaryOrderId.slice(-6)}${Date.now().toString(36).toUpperCase()}`
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

        const payment = await this.prisma.payment.upsert({
            where: { orderId: primaryOrderId },
            create: {
                orderId: primaryOrderId,
                method: 'VNPAY',
                status: PaymentStatus.PENDING,
                amount: totalAmountVnd,
                currency: 'VND',
                vnpayTxnRef: txnRef,
                expiresAt,
                metadata: { orderIds },
            },
            update: {
                method: 'VNPAY',
                status: PaymentStatus.PENDING,
                amount: totalAmountVnd,
                vnpayTxnRef: txnRef,
                expiresAt,
                metadata: { orderIds },
            },
        })

        await this.prisma.paymentAttempt.create({
            data: {
                paymentId: payment.id,
                provider: 'VNPAY',
                txnRef,
                status: PaymentStatus.PENDING,
            },
        })

        const createDate = new Date()
        const orderInfo = `Thanh toan don hang TimmyHub ${primaryOrderId.slice(-8).toUpperCase()}`

        const url = this.vnpay.buildPaymentUrl({
            vnp_Amount: totalAmountVnd,
            vnp_IpAddr: clientIp,
            vnp_ReturnUrl: this.returnUrl,
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: orderInfo,
            vnp_Locale: VnpLocale.VN,
            vnp_CreateDate: dateFormat(createDate),
            vnp_ExpireDate: dateFormat(expiresAt),
        })

        this.logger.log(`VNPay URL generated for orders [${orderIds.join(', ')}] with txnRef ${txnRef}`)
        return { url, paymentId: payment.id, txnRef }
    }

    async processReturn(query: Record<string, string>): Promise<{
        success: boolean
        orderId?: string
        message: string
        code?: string
    }> {
        const verifyResult = this.vnpay.verifyReturnUrl(query as unknown as ReturnQueryFromVNPay)
        if (!verifyResult.isVerified) {
            this.logger.warn(`VNPay return signature mismatch: ${JSON.stringify(query)}`)
            return { success: false, message: 'Chữ ký không hợp lệ (Invalid signature)' }
        }

        const txnRef = query.vnp_TxnRef
        if (!txnRef) {
            return { success: false, message: 'Thiếu mã tham chiếu giao dịch (vnp_TxnRef)' }
        }

        const responseCode = query.vnp_ResponseCode

        const payment = await this.prisma.payment.findUnique({
            where: { vnpayTxnRef: txnRef },
        })

        if (!payment) {
            this.logger.warn(`VNPay return payment not found: txnRef=${txnRef}`)
            return { success: false, message: 'Không tìm thấy thông tin thanh toán' }
        }

        const metadata = (payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}) as Record<
            string,
            unknown
        >
        const orderIds = Array.isArray(metadata.orderIds) ? (metadata.orderIds as string[]) : [payment.orderId]

        if (responseCode !== '00') {
            this.logger.warn(`VNPay return failed: code=${responseCode}, txnRef=${txnRef}`)
            await this.prisma.$transaction(
                async (tx) => {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: PaymentStatus.FAILED,
                            metadata: { ...metadata, returnPayload: query },
                        },
                    })
                    await tx.paymentAttempt.updateMany({
                        where: { txnRef },
                        data: { status: PaymentStatus.FAILED },
                    })
                },
                { maxWait: 10000, timeout: 20000 },
            )
            const res: { success: boolean; orderId: string; message: string; code?: string } = {
                success: false,
                orderId: payment.orderId,
                message: 'Giao dịch thanh toán không thành công hoặc đã bị huỷ',
            }
            if (responseCode) {
                res.code = responseCode
            }
            return res
        }

        if (payment.status === PaymentStatus.COMPLETED) {
            const res: { success: boolean; orderId: string; message: string; code?: string } = {
                success: true,
                orderId: payment.orderId,
                message: 'Đơn hàng đã được thanh toán thành công trước đó',
            }
            if (responseCode) {
                res.code = responseCode
            }
            return res
        }

        await this.completePayment(payment.id, orderIds, query.vnp_TransactionNo, query)
        this.logger.log(`VNPay payment completed for orderId=${payment.orderId}, txnRef=${txnRef}`)

        const res: { success: boolean; orderId: string; message: string; code?: string } = {
            success: true,
            orderId: payment.orderId,
            message: 'Thanh toán đơn hàng thành công',
        }
        if (responseCode) {
            res.code = responseCode
        }
        return res
    }

    async processIpn(query: Record<string, string>): Promise<{ RspCode: string; Message: string }> {
        const verifyResult = this.vnpay.verifyIpnCall(query as unknown as ReturnQueryFromVNPay)
        if (!verifyResult.isVerified) {
            this.logger.warn(`VNPay IPN signature mismatch: ${JSON.stringify(query)}`)
            return IpnFailChecksum
        }

        const txnRef = query.vnp_TxnRef
        if (!txnRef) {
            return IpnOrderNotFound
        }

        const responseCode = query.vnp_ResponseCode

        const payment = await this.prisma.payment.findUnique({
            where: { vnpayTxnRef: txnRef },
        })

        if (!payment) {
            return IpnOrderNotFound
        }

        // Kiểm tra số tiền: vnp_Amount = amount * 100
        const expectedVnpAmount = Math.round(Number(payment.amount)) * 100
        if (Number(query.vnp_Amount) !== expectedVnpAmount) {
            this.logger.warn(`VNPay IPN invalid amount: expected ${expectedVnpAmount}, got ${query.vnp_Amount}`)
            return IpnInvalidAmount
        }

        if (payment.status === PaymentStatus.COMPLETED) {
            return InpOrderAlreadyConfirmed
        }

        const metadata = (payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}) as Record<
            string,
            unknown
        >
        const orderIds = Array.isArray(metadata.orderIds) ? (metadata.orderIds as string[]) : [payment.orderId]

        if (responseCode !== '00') {
            await this.prisma.$transaction(
                async (tx) => {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: PaymentStatus.FAILED,
                            metadata: { ...metadata, ipnPayload: query },
                        },
                    })
                    await tx.paymentAttempt.updateMany({
                        where: { txnRef },
                        data: {
                            status: PaymentStatus.FAILED,
                            ipnPayload: query,
                            ipnReceivedAt: new Date(),
                        },
                    })
                },
                { maxWait: 10000, timeout: 20000 },
            )
            return IpnSuccess
        }

        await this.completePayment(payment.id, orderIds, query.vnp_TransactionNo, query)
        this.logger.log(`VNPay IPN completed for orderId=${payment.orderId}, txnRef=${txnRef}`)

        return IpnSuccess
    }

    private async completePayment(
        paymentId: string,
        orderIds: string[],
        transactionNo: string | undefined,
        payload: Record<string, string>,
    ): Promise<void> {
        await this.prisma.$transaction(
            async (tx) => {
                const payment = await tx.payment.findUnique({ where: { id: paymentId } })
                const currentMeta = (
                    payment?.metadata && typeof payment?.metadata === 'object' ? payment.metadata : {}
                ) as Record<string, unknown>

                await tx.payment.update({
                    where: { id: paymentId },
                    data: {
                        status: PaymentStatus.COMPLETED,
                        vnpayTransNo: transactionNo ?? null,
                        paidAt: new Date(),
                        metadata: {
                            ...currentMeta,
                            completedPayload: payload,
                        },
                    },
                })

                if (payment?.vnpayTxnRef) {
                    await tx.paymentAttempt.updateMany({
                        where: { txnRef: payment.vnpayTxnRef },
                        data: {
                            status: PaymentStatus.COMPLETED,
                            ipnPayload: payload,
                            ipnReceivedAt: new Date(),
                        },
                    })
                }

                await tx.order.updateMany({
                    where: { id: { in: orderIds } },
                    data: {
                        paymentStatus: 'COMPLETED',
                        status: OrderStatus.CONFIRMED,
                    },
                })

                for (const orderId of orderIds) {
                    await tx.orderStatusHistory.create({
                        data: {
                            orderId,
                            toStatus: OrderStatus.CONFIRMED,
                            reason: 'VNPay xác nhận thanh toán thành công',
                            actorRole: 'SYSTEM',
                        },
                    })
                }
            },
            { maxWait: 10000, timeout: 20000 },
        )
    }
}
