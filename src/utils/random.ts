export function random_in_range(from: number, to: number, inclusive: boolean = false): number {
    return from + Math.floor(Math.random() * ((to - from) + (inclusive ? 1 : 0)))
}