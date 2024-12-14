import {
    EVOLUTION_STONES,
    FOSSILS,
    GridObject,
    ITEMS,
    LARGE_SPHERES,
    PLATES,
    SHARDS,
    SMALL_SPHERES,
    WEATHER_STONES
} from "./objects"

export class Collection {
    private static _loaded_values: Map<string, number> = new Map()

    public static on_object_count_changed?: (
        object: GridObject,
        count: number,
    ) => void

    public static get_all_items(): GridObject[] {
        return [
            ...SMALL_SPHERES,
            ...LARGE_SPHERES,
            ...FOSSILS,
            ...EVOLUTION_STONES,
            ...SHARDS,
            ...WEATHER_STONES,
            ...ITEMS,
            ...PLATES
        ]
    }

    private static item_key(object: GridObject): string {
        return "Collection." + object.name
    }

    private static set_item_count(object: GridObject, count: number): void {
        window.localStorage.setItem(this.item_key(object), count.toString())
    }

    public static get_item_count(object: GridObject): number {
        if (this._loaded_values.has(object.name)) return this._loaded_values.get(object.name)!
        const loaded_value
            = window.localStorage.getItem(this.item_key(object)) ?? "0"
        const count = Number.parseInt(loaded_value)
        this._loaded_values.set(object.name, count)
        return count
    }

    public static load_all_items(): [GridObject, number][] {
        const all_items = this.get_all_items()
        const entries: [GridObject, number][] = []
        all_items.forEach((item) => {
            entries.push([ item, this.get_item_count(item) ])
        })

        return entries
    }

    public static add_item(object: GridObject): number {
        const new_count = this.get_item_count(object) + 1
        this.set_item_count(object, new_count)
        return new_count
    }
}
