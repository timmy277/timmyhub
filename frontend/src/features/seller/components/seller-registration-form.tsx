'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText, Send, Store } from 'lucide-react'
import { toast } from 'sonner'

import type { CreateSellerApplicationInput, SellerApplicationDetail } from '@timmyhub/contracts'
import { CreateSellerApplicationSchema, ResourceStatus } from '@timmyhub/contracts'

import { ROUTE } from '@/constants'
import {
    Alert,
    AlertDescription,
    AlertTitle,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FloatInput,
    FloatTextarea,
} from '@/components'

import { submitSellerApplicationAction } from '../actions'

interface SellerRegistrationFormProps {
    initialApplications?: SellerApplicationDetail[]
    isAlreadySeller?: boolean
}

export function SellerRegistrationForm({
    initialApplications = [],
    isAlreadySeller = false,
}: SellerRegistrationFormProps) {
    // ===== State =====
    const [applications, setApplications] = useState<SellerApplicationDetail[]>(initialApplications)
    const [submitting, setSubmitting] = useState(false)

    // ===== Hooks =====
    const form = useForm<CreateSellerApplicationInput>({
        resolver: zodResolver(CreateSellerApplicationSchema),
        defaultValues: {
            shopName: '',
            shopDescription: '',
            idDocumentUrl: '',
            taxCode: '',
            warehouseAddressLine: '',
        },
    })

    // ===== Derived =====
    const pendingApp = applications.find((app) => app.status === ResourceStatus.PENDING)
    const latestApp = applications[0]

    // ===== Handlers =====
    const onSubmit = async (values: CreateSellerApplicationInput) => {
        setSubmitting(true)
        try {
            const res = await submitSellerApplicationAction(values)
            if (res.ok) {
                toast.success('Đã gửi đơn đăng ký bán hàng thành công! Vui lòng chờ quản trị viên phê duyệt.')
                setApplications((prev) => [res.data, ...prev])
                form.reset()
            } else {
                toast.error(res.message || 'Không thể gửi đơn đăng ký. Vui lòng kiểm tra lại thông tin.')
            }
        } catch {
            toast.error('Đã xảy ra lỗi khi gửi đơn đăng ký. Vui lòng thử lại sau.')
        } finally {
            setSubmitting(false)
        }
    }

    if (isAlreadySeller) {
        return (
            <Card className="max-w-2xl mx-auto border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="size-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-foreground">
                                Bạn đã là Người Bán trên TimmyHub
                            </CardTitle>
                            <CardDescription>
                                Hồ sơ shop của bạn đã được phê duyệt. Bạn có thể bắt đầu đăng bán sản phẩm và quản lý
                                doanh số.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <Button asChild>
                        <Link href={ROUTE.SELLER_PORTAL} className="gap-2">
                            Truy cập Kênh Người Bán
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Status alerts */}
            {pendingApp && (
                <Alert className="border-amber-500/40 bg-amber-500/10">
                    <Clock className="size-4 text-amber-500" />
                    <AlertTitle className="text-amber-500 font-semibold">Đơn đăng ký đang được xét duyệt</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm mt-1">
                        Shop <strong className="text-foreground">{pendingApp.shopName}</strong> đã được nộp vào lúc{' '}
                        {new Date(pendingApp.createdAt).toLocaleDateString('vi-VN')}. Quản trị viên sẽ phản hồi sớm nhất
                        có thể.
                    </AlertDescription>
                </Alert>
            )}

            {latestApp && latestApp.status === ResourceStatus.REJECTED && !pendingApp && (
                <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/10">
                    <AlertCircle className="size-4 text-rose-500" />
                    <AlertTitle className="text-rose-500 font-semibold">Đơn đăng ký trước đó bị từ chối</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm mt-1">
                        Lý do từ chối:{' '}
                        <strong className="text-foreground">{latestApp.reviewNote || 'Chưa cung cấp lý do'}</strong>.
                        Bạn có thể cập nhật lại thông tin và nộp lại đơn.
                    </AlertDescription>
                </Alert>
            )}

            {/* Registration Form Card */}
            {!pendingApp && (
                <Card className="border border-border/60 shadow-xl bg-card/80 backdrop-blur-md">
                    <CardHeader className="space-y-2">
                        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
                            <Store className="size-4" />
                            <span>Đăng ký trở thành người bán (FEAT-SEL-001)</span>
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">Thông tin đăng ký mở Shop</CardTitle>
                        <CardDescription>
                            Điền đầy đủ thông tin định danh và địa chỉ kho để ban quản trị sàn kiểm duyệt hồ sơ bán hàng
                            của bạn.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Shop Name */}
                            <FloatInput
                                label="Tên cửa hàng (Shop Name) *"
                                error={form.formState.errors.shopName?.message}
                                {...form.register('shopName')}
                            />

                            {/* Shop Description */}
                            <FloatTextarea
                                label="Mô tả giới thiệu cửa hàng"
                                rows={3}
                                error={form.formState.errors.shopDescription?.message}
                                {...form.register('shopDescription')}
                            />

                            {/* ID Document URL */}
                            <div className="space-y-1.5">
                                <FloatInput
                                    label="Đường dẫn ảnh CCCD / Giấy phép kinh doanh (URL) *"
                                    error={form.formState.errors.idDocumentUrl?.message}
                                    {...form.register('idDocumentUrl')}
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    Dán đường dẫn ảnh giấy tờ tùy thân hoặc giấy phép kinh doanh để xác minh danh tính.
                                </span>
                            </div>

                            {/* Tax Code */}
                            <FloatInput
                                label="Mã số thuế (nếu có - 10 hoặc 13 chữ số)"
                                error={form.formState.errors.taxCode?.message}
                                {...form.register('taxCode')}
                            />

                            {/* Warehouse Address */}
                            <FloatInput
                                label="Địa chỉ kho hàng / lấy hàng"
                                error={form.formState.errors.warehouseAddressLine?.message}
                                {...form.register('warehouseAddressLine')}
                            />

                            {/* Submit Button */}
                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={submitting} className="rounded-xl px-6 gap-2">
                                    <Send className="size-4" />
                                    <span>{submitting ? 'Đang gửi đơn…' : 'Gửi đơn đăng ký'}</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Application History */}
            {applications.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <FileText className="size-4" />
                        <span>Lịch sử nộp đơn của bạn</span>
                    </h3>

                    <div className="space-y-3">
                        {applications.map((app) => (
                            <div
                                key={app.id}
                                className="flex items-center justify-between p-4 rounded-xl border bg-card/50 text-sm"
                            >
                                <div className="space-y-1">
                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                        <span>{app.shopName}</span>
                                        <Badge
                                            variant={
                                                app.status === ResourceStatus.APPROVED
                                                    ? 'default'
                                                    : app.status === ResourceStatus.REJECTED
                                                      ? 'destructive'
                                                      : 'secondary'
                                            }
                                            className="text-xs"
                                        >
                                            {app.status === ResourceStatus.APPROVED
                                                ? 'Đã duyệt'
                                                : app.status === ResourceStatus.REJECTED
                                                  ? 'Bị từ chối'
                                                  : 'Đang chờ'}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Nộp ngày: {new Date(app.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>

                                {app.reviewNote && (
                                    <div className="text-xs text-right max-w-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Ghi chú:</span> {app.reviewNote}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
