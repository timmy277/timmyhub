import { useId, type ReactNode, type SVGProps } from 'react'

interface IconDefinition {
    viewBox: string
    width: number
    height: number
    render: (uid: string) => ReactNode
}

const ICONS = {
    'flag-vn': {
        viewBox: '0 0 30 20',
        width: 24,
        height: 16,
        render: () => (
            <>
                <rect width="30" height="20" fill="#da251d" />
                <polygon
                    fill="#ffff00"
                    points="15,4 16.18,7.64 20,7.64 16.91,9.88 18.09,13.52 15,11.27 11.91,13.52 13.09,9.88 10,7.64 13.82,7.64"
                />
            </>
        ),
    },
    'flag-uk': {
        viewBox: '0 0 60 30',
        width: 24,
        height: 12,
        render: (uid) => (
            <>
                <clipPath id={uid}>
                    <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
                </clipPath>
                <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${uid})`} stroke="#c8102e" strokeWidth="4" />
                <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
            </>
        ),
    },
    google: {
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        render: () => (
            <>
                <path
                    fill="#4285F4"
                    d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
                />
                <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.27a12 12 0 0 0 0 10.76l4.01-3.1Z"
                />
                <path
                    fill="#EA4335"
                    d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
                />
            </>
        ),
    },
    facebook: {
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        render: () => (
            <path
                fill="#1877F2"
                d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
            />
        ),
    },
    apple: {
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        render: () => (
            <path
                fill="currentColor"
                d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.07.64-2.72 1.39-.58.65-1.06 1.71-.93 2.74 1.05.08 2.05-.55 2.64-1.26"
            />
        ),
    },
    'gemini-star': {
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        render: () => (
            <path
                fill="currentColor"
                d="M12 1C12 7.075 16.925 12 23 12C16.925 12 12 16.925 12 23C12 16.925 7.075 12 1 12C7.075 12 12 7.075 12 1Z"
            />
        ),
    },
    'google-play': {
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        render: () => (
            <path
                fill="currentColor"
                d="m3.609 1.814 11.275 11.275-11.275 11.275c-.38-.38-.609-.909-.609-1.492V3.306c0-.583.229-1.112.609-1.492zm12.336 12.336 2.378-2.378-13.65-7.88 11.272 10.258zm0-2.122-11.272 10.258 13.65-7.88-2.378-2.378zm3.439-.816-2.079-1.2-2.079 1.2 2.079 1.2 2.079-1.2z"
            />
        ),
    },
} satisfies Record<string, IconDefinition>

export type IconName = keyof typeof ICONS

export interface IconPathProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'viewBox'> {
    name: IconName
    size?: number
    label?: string
}

export function IconPath({ name, size, label, ...rest }: IconPathProps) {
    const uid = useId()
    const icon: IconDefinition = ICONS[name]
    const width = size ?? icon.width
    const height = (width * icon.height) / icon.width

    const a11yProps = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const }

    return (
        <svg viewBox={icon.viewBox} width={width} height={height} focusable={false} {...a11yProps} {...rest}>
            {icon.render(uid)}
        </svg>
    )
}
