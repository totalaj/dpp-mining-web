export interface Weighted<P = void> { get_weight(param?: P): number }

export class WeightedString implements Weighted<void> {
    constructor(public value: string, private _weight: number) {
    }

    public get_weight(): number {
        return this._weight
    }
}

export function get_weighted_random<P, T extends Weighted<P>>(values: Array<T>, param?: P): T {
    let total_chance = 0
    values.forEach((item) => {
        total_chance += item.get_weight(param)
    })

    const roll = Math.floor(Math.random() * total_chance)
    let accumulation = 0

    for (let index = 0; index < values.length; index++) {
        const item = values[index]
        accumulation += item.get_weight(param)
        if (accumulation > roll) {
            return item
        }
    }

    return values[0] // We should NEVER get here, in theory
}