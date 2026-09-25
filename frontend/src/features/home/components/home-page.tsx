import Link from 'next/link'
import { LayoutGridIcon, UsersIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    Button,
    FloatCombobox,
    FloatDatePicker,
    FloatDateRangePicker,
    FloatInput,
    FloatMultiSelect,
    PageContainer,
    type FloatOption,
} from '@/components'
import { ROUTE } from '@/constants'
import { DEMO_CATEGORIES } from '@/mocks'

// Trang chủ khu quản trị bản demo: lối tắt tới các màn đã dựng + khu thử các field label nổi. Server Component —
// chỉ các field là client.
export function HomePage() {
    // ===== Hooks =====
    const t = useTranslations('home')

    // ===== Derived =====
    const categories: FloatOption[] = DEMO_CATEGORIES.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))

    return (
        <PageContainer
            title={t('title')}
            description={t('description')}
            actions={
                <>
                    <Button asChild variant="outline">
                        <Link href={ROUTE.DASHBOARD}>
                            <LayoutGridIcon data-icon="inline-start" />
                            {t('goToDashboard')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={ROUTE.USERS}>
                            <UsersIcon data-icon="inline-start" />
                            {t('goToUsers')}
                        </Link>
                    </Button>
                </>
            }
        >
            <section
                aria-labelledby="home-demo-fields"
                className="flex max-w-xl flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
            >
                <div className="flex flex-col gap-1">
                    <h2 id="home-demo-fields" className="font-heading text-base font-semibold">
                        {t('demoTitle')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t('demoDescription')}</p>
                </div>
                <FloatInput label={t('demoInput')} autoComplete="name" labelClassName="bg-card peer-focus:bg-card" />
                <FloatCombobox label={t('demoCombobox')} options={categories} labelClassName="bg-card" />
                <FloatMultiSelect label={t('demoMultiSelect')} options={categories} labelClassName="bg-card" />
                <FloatDatePicker label={t('demoDate')} name="subscriptionDate" labelClassName="bg-card" />
                <FloatDateRangePicker label={t('demoDateRange')} name="promotion" labelClassName="bg-card" />
            </section>
        </PageContainer>
    )
}
