// "Nguyễn Văn An" -> "NA": chữ cái đầu của từ đầu và từ cuối, dùng cho AvatarFallback.
export function getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean)
    const first = words[0]?.[0] ?? ''
    const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : ''
    return (first + last).toUpperCase()
}
