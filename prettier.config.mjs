/** @type {import('prettier').Config} */
export default {
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    printWidth: 120,
    trailingComma: 'all',
    endOfLine: 'lf',
    overrides: [
        { files: '*.{json,yml,yaml}', options: { tabWidth: 2 } },
        { files: '*.md', options: { proseWrap: 'preserve', tabWidth: 2 } },
    ],
}
