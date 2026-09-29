const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const messageFiles = ['vi.json', 'en.json'].map((file) => path.join(root, 'messages', file))
const sourceRoot = path.join(root, 'src')

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function flatten(value, prefix = '', result = new Map()) {
    for (const [key, child] of Object.entries(value)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, fullKey, result)
        else if (typeof child === 'string') result.set(fullKey, child)
    }
    return result
}

function sourceFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name)
        if (entry.isDirectory()) return sourceFiles(file)
        return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [file] : []
    })
}

const [viFile, enFile] = messageFiles
const locales = [flatten(readJson(viFile)), flatten(readJson(enFile))]
const [vi, en] = locales
let errors = 0

for (const key of new Set([...vi.keys(), ...en.keys()])) {
    if (!vi.has(key) || !en.has(key)) {
        console.error(`Locale key missing: ${key} (${vi.has(key) ? 'en' : 'vi'})`)
        errors++
        continue
    }
    const placeholders = (value) => [...value.matchAll(/\{([\w.-]+)(?:,[^}]*)?\}/g)].map((match) => match[1]).sort()
    if (JSON.stringify(placeholders(vi.get(key))) !== JSON.stringify(placeholders(en.get(key)))) {
        console.error(`Placeholder mismatch: ${key}`)
        errors++
    }
}

const sources = sourceFiles(sourceRoot)
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n')
for (const messages of locales) {
    for (const key of messages.keys()) {
        const leaf = key.split('.').at(-1)
        const escaped = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (!new RegExp(`(['"\`])${escaped}\\1`).test(sources)) {
            console.error(`Unused locale key: ${key}`)
            errors++
        }
    }
}

if (errors > 0) process.exitCode = 1
else console.log(`i18n check passed (${vi.size} locale keys)`)
