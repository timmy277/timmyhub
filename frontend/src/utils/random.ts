export function pickRandom<T extends string>(ids: readonly T[]): T {
    return ids[Math.floor(Math.random() * ids.length)] as T
}
