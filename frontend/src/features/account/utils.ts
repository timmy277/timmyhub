/**
 * Resolves a Zod validation error message key to a localised string.
 *
 * Zod messages are stored as i18n keys (e.g. "account.validation.firstNameRequired").
 * We strip the "account." prefix and pass the remainder to the `tAccount` translator.
 * If the key doesn't exist in the message catalogue the raw key is returned as a
 * fallback so the developer can spot missing translations quickly.
 *
 * Accepts the `tAccount` function typed as `(key: string) => string` to avoid
 * leaking `any` while staying compatible with next-intl's generic signature.
 */
export function getAccountErrorText(translator: (key: string) => string, key?: string): string | undefined {
    if (!key) return undefined
    const lookupKey = key.startsWith('account.') ? key.slice('account.'.length) : key
    try {
        return translator(lookupKey)
    } catch {
        return key
    }
}
