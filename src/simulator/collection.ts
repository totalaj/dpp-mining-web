import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import {
    EVOLUTION_STONES,
    FOSSILS,
    get_item_by_name,
    GridObject,
    ItemName,
    ITEMS,
    LARGE_SPHERES,
    PLATES,
    SHARDS,
    SMALL_SPHERES,
    trim_duplicates,
    WEATHER_STONES
} from "./objects"
import { Progress } from "./settings"

type CollectionEntry = [GridObject, number]

class CollectionSection {
    private _title: HTMLElement
    private _section: HTMLElement

    constructor(
        private _objects: GridObject[], private _section_title: string, sprite_sheet: SpriteSheet, parent_element: HTMLElement,
        register_collection_element: (name: string, element: CollectionElement) => void
    ) {
        this._title = parent_element.appendChild(document.createElement('h3'))
        this._title.className = "collection-title inverted-text"

        this._section = parent_element.appendChild(document.createElement('div'))
        this._section.id = 'collection-section'

        const loaded_items = Collection.load_items(this._objects)
        loaded_items.forEach((item): void => {
            const collection_element = new CollectionElement(item[0], sprite_sheet, this._section)
            register_collection_element(item[0].name, collection_element)
            collection_element.update_style(item)
        })

        this.update_style(loaded_items.some((entry) => Collection.get_item_ever_found(entry[0])))
    }

    public update_style(visible: boolean): void {
        let count = 0
        this._objects.forEach((object) => {
            if (Collection.get_item_ever_found(object)) {
                count++
            }
        })

        this._title.innerText = `${this._section_title}`
        if (Progress.postgame) {
            this._title.innerText += ` (${count}/${this._objects.length})`
        }
        if (count === this._objects.length) this._title.className = "collection-title highlight"
        this._title.style.display = visible ? "" : "none"
        this._section.style.display = visible ? "" : "none"
    }
}

class CollectionElement {
    public element: HTMLElement
    private _name_element: HTMLElement
    private _number_element: HTMLElement
    private _sprite: Sprite
    constructor(item: GridObject, sprite_sheet: SpriteSheet, parent_element: HTMLElement) {
        this.element = parent_element.appendChild(document.createElement('div'))
        this.element.id = "collection-item"

        this._sprite = new Sprite(this.element, sprite_sheet, item.start_tile, item.end_tile)
        this._sprite.element.id = "collection-sprite"

        this._name_element = this.element.appendChild(document.createElement('p'))
        this._name_element.id = "collection-text"

        this._number_element = this.element.appendChild(document.createElement('p'))
        this._number_element.id = "collection-text"
    }

    public update_style(entry: CollectionEntry): void {
        this._name_element.innerText = entry[0].name
        this._number_element.innerHTML = "×" + entry[1].toString()
        this._number_element.style.fontSize = "1.2em"
        this._name_element.className = entry[1] === 0 ? 'inverted-text-dark' : 'inverted-text'
        this._number_element.className = entry[1] === 0 ? 'inverted-text-dark' : 'inverted-text'

        this.element.style.display = Collection.get_item_ever_found(entry[0]) ? "" : "none"
    }
}

export class Collection {
    private static _loaded_values: Map<string, number> = new Map()
    private static _object_element_map: Map<string, CollectionElement> = new Map()
    private static _object_section_map: [GridObject[], CollectionSection][] = []
    private static _item_sheet: SpriteSheet = new SpriteSheet(16, "./assets/object_sheet.png", new Vector2(1024, 1024), 1)
    private static _title: HTMLHeadingElement

    private static on_object_count_changed(object: GridObject, count: number): void {
        const element = this._object_element_map.get(object.name)
        if (!element) {
            console.log(this._object_element_map)
            console.error("Element not found for object", object.name, object)
            return
        }
        element.update_style([ object, count ])
        this._object_section_map.filter((objects) => objects[0].includes(object)).forEach((section) => {
            section[1].update_style(true)
        })
        this._title.style.display = ''
    }

    public static refresh_all_style(): void {
        this.on_object_count_changed(SMALL_SPHERES[0], this.get_item_count(SMALL_SPHERES[0]))
        this.on_object_count_changed(LARGE_SPHERES[0], this.get_item_count(LARGE_SPHERES[0]))
        this.on_object_count_changed(FOSSILS[0], this.get_item_count(FOSSILS[0]))
        this.on_object_count_changed(EVOLUTION_STONES[0], this.get_item_count(EVOLUTION_STONES[0]))
        this.on_object_count_changed(SHARDS[0], this.get_item_count(SHARDS[0]))
        this.on_object_count_changed(WEATHER_STONES[0], this.get_item_count(WEATHER_STONES[0]))
        this.on_object_count_changed(ITEMS[0], this.get_item_count(ITEMS[0]))
        this.on_object_count_changed(PLATES[0], this.get_item_count(PLATES[0]))
    }

    public static get_all_items(): GridObject[] {
        return trim_duplicates([
            ...SMALL_SPHERES,
            ...LARGE_SPHERES,
            ...FOSSILS,
            ...EVOLUTION_STONES,
            ...SHARDS,
            ...WEATHER_STONES,
            ...ITEMS,
            ...PLATES
        ])
    }

    private static item_key(object: GridObject): string {
        return "Collection." + object.name
    }

    private static set_item_count(object: GridObject | ItemName, count: number): void {
        if (typeof object === 'string') object = get_item_by_name(object)
        this._loaded_values.set(this.item_key(object), count)
        window.localStorage.setItem(this.item_key(object), count.toString())
        this.on_object_count_changed(object, count)
    }

    public static get_item_ever_found(object: GridObject | ItemName): boolean {
        if (typeof object === 'string') object = get_item_by_name(object)
        return window.localStorage.getItem(this.item_key(object)) !== null
    }

    public static get_item_count(object: GridObject | ItemName): number {
        if (typeof object === 'string') object = get_item_by_name(object)
        if (this._loaded_values.has(this.item_key(object))) return this._loaded_values.get(this.item_key(object))!
        const loaded_value = window.localStorage.getItem(this.item_key(object)) ?? "0"
        const count = Number.parseInt(loaded_value)
        this._loaded_values.set(this.item_key(object), count)
        return count
    }

    public static load_all_items(): CollectionEntry[] {
        return this.load_items(this.get_all_items())
    }

    public static load_items(items: GridObject[]): CollectionEntry[] {
        const entries: CollectionEntry[] = []
        items.forEach((item) => {
            entries.push([ item, this.get_item_count(item) ])
        })

        return entries
    }

    public static add_item(object: GridObject | ItemName, count: number = 1): number {
        if (typeof object === 'string') object = get_item_by_name(object)
        const new_count = this.get_item_count(object) + count
        this.set_item_count(object, new_count)
        return new_count
    }

    public static remove_item(object: GridObject | ItemName, count: number = 1): number {
        if (typeof object === 'string') object = get_item_by_name(object)
        const new_count = this.get_item_count(object) - count
        console.log("Reducing item", object.name, "by", count, "to", new_count)
        this.set_item_count(object, new_count)
        return new_count
    }

    public static create_collection_element(): HTMLElement {
        const element = document.createElement('div')
        element.id = 'collection'

        this._title = element.appendChild(document.createElement('h2'))
        this._title.innerText = "Collection"
        this._title.style.display = this.get_all_items().some((item) => Collection.get_item_count(item) > 0) ? '' : 'none'

        // Style background
        const colors = [
            "#D6C6BD",
            "#D6C6BD",
            "#C6B5AD",
            "#8C7B73",
            "#847363",
            "#635A4A",
            "#5A4A42",
            "#5A4A42",
            "#634A39",
            "#634A39",
            "#4A3929",
            "#4A3929",
            "#4A3929",
            "#392918",
            "#392918",
            "#392918",
            "#392918"
        ]

        let background_style = 'linear-gradient(to bottom'
        for (let index = 0; index < colors.length; index++) {
            const color = colors[index]
            const prev_alpha = (index) / colors.length
            const alpha = (index + 1) / colors.length
            background_style += `, ${color} ${Math.floor(prev_alpha * 100)}% ${Math.floor(alpha * 100)}%`
        }

        element.style.background = background_style
        element.style.backgroundSize = "100% 4000px"

        const create_section = (objects: GridObject[], section_title: string): void => {
            const section = new CollectionSection(
                trim_duplicates(objects), section_title, this._item_sheet, element,
                (new_name, new_element) => this._object_element_map.set(new_name, new_element)
            )
            this._object_section_map.push([ objects, section ])
        }

        create_section([ ...SMALL_SPHERES, ...LARGE_SPHERES ], "Spheres")
        create_section(ITEMS, "Items")
        create_section(EVOLUTION_STONES, "Evolution Stones")
        create_section(WEATHER_STONES, "Weather stones")
        create_section(FOSSILS, "Fossils")
        create_section(SHARDS, "Shards")
        create_section(PLATES, "Plates")

        return element
    }
}
