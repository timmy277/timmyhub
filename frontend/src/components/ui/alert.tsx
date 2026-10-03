import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const alertVariants = cva(
    'relative w-full rounded-lg border p-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
    {
        variants: {
            variant: {
                default: 'bg-background text-foreground',
                destructive:
                    'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10',
                warning:
                    'border-amber-500/50 text-amber-900 dark:text-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 [&>svg]:text-amber-600',
                success:
                    'border-emerald-500/50 text-emerald-900 dark:text-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 [&>svg]:text-emerald-600',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
    return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'h5'>) {
    return (
        <h5
            data-slot="alert-title"
            className={cn('mb-1 font-medium leading-none tracking-tight', className)}
            {...props}
        />
    )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="alert-description" className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
