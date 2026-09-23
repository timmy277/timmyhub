import { HomePage } from '@/features/home'
import { ThemeCustomizerTrigger } from '@/features/theme-customizer'

export default function Page() {
    return (
        <>
            <ThemeCustomizerTrigger />
            <HomePage />
        </>
    )
}
