'use client'

import Link from 'next/link'
import { ShoppingCartIcon } from 'lucide-react'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useCart } from '@/hooks'

export function CartButton() {
    const { data: cart } = useCart()
    const totalItems = cart?.totalItems ?? 0

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="relative size-9 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-transform active:scale-95"
                    aria-label={`Giỏ hàng (${totalItems} sản phẩm)`}
                >
                    <Link href={ROUTE.CART}>
                        <ShoppingCartIcon className="size-4.5" />
                        {totalItems > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-75 duration-200">
                                {totalItems > 99 ? '99+' : totalItems}
                            </span>
                        )}
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="text-xs">
                {totalItems > 0 ? `Giỏ hàng (${totalItems} món)` : 'Giỏ hàng (trống)'}
            </TooltipContent>
        </Tooltip>
    )
}
