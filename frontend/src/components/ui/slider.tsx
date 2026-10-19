'use client'

import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn } from '@/utils'

function Slider({
    className,
    defaultValue,
    value,
    min = 0,
    max = 100,
    ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
    return (
        <SliderPrimitive.Root
            data-slot="slider"
            defaultValue={defaultValue}
            value={value}
            min={min}
            max={max}
            className={cn('relative flex w-full touch-none select-none items-center', className)}
            {...props}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/20"
            >
                <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
                data-slot="slider-thumb"
                className="block size-3.5 rounded-full border border-primary bg-primary shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            />
        </SliderPrimitive.Root>
    )
}

export { Slider }
