'use client'

import { useRouter } from 'next/navigation'
import { LockKeyhole, LogIn, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useAuthModalStore } from '@/stores'

export function RequireLoginModal() {
    // ===== Hooks =====
    const t = useTranslations('authModal')
    const router = useRouter()
    const { isOpen, title, message, callbackUrl, confirmText, closeModal } = useAuthModalStore()

    // ===== Handlers =====
    const handleLogin = () => {
        closeModal()
        const targetCallback = callbackUrl || (typeof window !== 'undefined' ? window.location.pathname : ROUTE.HOME)
        router.push(`${ROUTE.LOGIN}?callbackUrl=${encodeURIComponent(targetCallback)}`)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="sm:max-w-md p-6 overflow-hidden rounded-2xl border border-primary/20 shadow-2xl bg-card">
                <div className="flex flex-col items-center text-center space-y-4">
                    {/* Icon với hiệu ứng vòng sáng cao cấp */}
                    <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/30 shadow-inner">
                        <LockKeyhole className="size-8 text-primary" />
                        <Sparkles className="size-4 text-amber-500 absolute -top-1.5 -right-1.5 animate-bounce" />
                    </div>

                    <DialogHeader className="space-y-1.5 text-center">
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                            {title || t('defaultTitle')}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            {message || t('defaultMessage')}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Danh sách lợi ích khi đăng nhập */}
                    <div className="w-full rounded-xl bg-muted/50 p-3.5 border border-border/60 text-xs text-muted-foreground space-y-1.5 text-left">
                        <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>{t('benefit1')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-primary" />
                            <span>{t('benefit2')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            <span>{t('benefit3')}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4 flex-col sm:flex-row gap-2 sm:gap-2">
                    <Button variant="outline" onClick={closeModal} className="w-full sm:w-1/2 rounded-xl">
                        {t('later')}
                    </Button>
                    <Button
                        onClick={handleLogin}
                        className="w-full sm:w-1/2 rounded-xl font-bold gap-1.5 shadow-md shadow-primary/20"
                    >
                        <LogIn className="size-4" />
                        <span>{confirmText || t('loginNow')}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
