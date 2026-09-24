import Image from 'next/image'

import { useTranslations } from 'next-intl'

import {
    Button,
    FloatCombobox,
    FloatDatePicker,
    FloatDateRangePicker,
    FloatInput,
    FloatMultiSelect,
    type FloatOption,
} from '@/components'

export function HomePage() {
    const t = useTranslations('home')
    const categories: FloatOption[] = [
        { value: 'fashion', label: t('categoryFashion') },
        { value: 'electronics', label: t('categoryElectronics') },
        { value: 'home', label: t('categoryHome') },
        { value: 'beauty', label: t('categoryBeauty') },
    ]

    return (
        <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between gap-12 px-4 py-16 sm:px-16 bg-white dark:bg-black sm:items-start">
                <Image
                    className="dark:invert h-5 w-[100px]"
                    src="/next.svg"
                    alt="Next.js logo"
                    width={100}
                    height={20}
                    priority
                />
                <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
                    <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                        To get started, edit the{' '}
                        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
                            page.tsx
                        </code>{' '}
                        file.
                    </h1>
                    <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        Looking for a starting point or more instructions? Head over to{' '}
                        <a
                            href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                            className="font-medium text-zinc-950 dark:text-zinc-50"
                        >
                            Templates
                        </a>{' '}
                        or the{' '}
                        <a
                            href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                            className="font-medium text-zinc-950 dark:text-zinc-50"
                        >
                            Learning
                        </a>{' '}
                        center.
                    </p>
                </div>
                <div className="flex w-full max-w-md flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <FloatInput label={t('demoInput')} autoComplete="name" />
                        </div>
                        <Button size="lg">Hello</Button>
                    </div>
                    <FloatCombobox label={t('demoCombobox')} options={categories} />
                    <FloatMultiSelect label={t('demoMultiSelect')} options={categories} />
                    <FloatDatePicker label={t('demoDate')} name="subscriptionDate" />
                    <FloatDateRangePicker label={t('demoDateRange')} name="promotion" />
                </div>
            </main>
        </div>
    )
}
