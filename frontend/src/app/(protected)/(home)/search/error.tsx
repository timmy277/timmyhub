'use client'

import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components'

interface SearchErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function SearchError({ reset }: SearchErrorProps) {
    return (
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
            <div className="size-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertCircleIcon className="size-7" />
            </div>
            <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Không thể tải kết quả tìm kiếm</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Hệ thống tìm kiếm gặp trục trặc tạm thời. Vui lòng thử lại sau giây lát.
                </p>
            </div>
            <div className="pt-2">
                <Button
                    type="button"
                    onClick={() => reset()}
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold gap-1.5"
                >
                    <RotateCcwIcon className="size-3.5" />
                    <span>Thử lại</span>
                </Button>
            </div>
        </div>
    )
}
