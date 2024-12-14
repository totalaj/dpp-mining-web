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

type CollectionEntry = number

export class Collection {
    private static _loaded_values: Map<string, number> = new Map()
    private static _object_element_map: Map<string, HTMLElement> = new Map()

    public static on_object_count_changed(object: GridObject, count: number): void {
        console.log("Object change hook", object, count)
        const element = this._object_element_map.get(object.name)!
        this.style_element([ object, count ], element)
    }

    public static get_all_items(): GridObject[] {
        const existing_names = new Set<string>()
        return [
            ...SMALL_SPHERES,
            ...LARGE_SPHERES,
            ...FOSSILS,
            ...EVOLUTION_STONES,
            ...SHARDS,
            ...WEATHER_STONES,
            ...ITEMS,
            ...PLATES
        ].filter((object) => {
            if (existing_names.has(object.name)) return false
            existing_names.add(object.name)
            return true
        })
    }

    private static item_key(object: GridObject): string {
        return "Collection." + object.name
    }

    private static set_item_count(object: GridObject, count: number): void {
        console.log("Object count changed", object, count)
        this._loaded_values.set(this.item_key(object), count)
        window.localStorage.setItem(this.item_key(object), count.toString())
        this.on_object_count_changed(object, count)
    }

    public static get_item_count(object: GridObject): number {
        if (this._loaded_values.has(this.item_key(object))) return this._loaded_values.get(this.item_key(object))!
        const loaded_value = window.localStorage.getItem(this.item_key(object)) ?? "0"
        const count = Number.parseInt(loaded_value)
        this._loaded_values.set(this.item_key(object), count)
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
        console.log("Adding 1 to", object.name, new_count)
        this.set_item_count(object, new_count)
        return new_count
    }

    private static style_element(entry: [GridObject, CollectionEntry], element: HTMLElement): void {
        element.id = 'collection-item'
        element.innerText = entry[0].name + ": " + entry[1]
        element.style.display = entry[1] > 0 ? "unset" : "none"
    }

    public static create_collection_element(): HTMLElement {
        const element = document.createElement('div')
        element.id = 'collection'
        const all_items = this.load_all_items()
        all_items.forEach((item): void => {
            const item_element = element.appendChild(document.createElement('p'))
            this._object_element_map.set(item[0].name, item_element)
            this.style_element(item, item_element)
        })
        return element
    }
}
