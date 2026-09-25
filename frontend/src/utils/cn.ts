import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Ghép class Tailwind: `clsx` xử lý điều kiện, `twMerge` gộp class xung đột (class sau thắng).
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}
