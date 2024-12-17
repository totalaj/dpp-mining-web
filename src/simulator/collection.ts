import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import {
    EVOLUTION_STONES,
    FOSSILS,
    GridObject,
    ITEMS,
    LARGE_SPHERES,
    PLATES,
    SHARDS,
    SMALL_SPHERES,
    trim_duplicates,
    WEATHER_STONES
} from "./objects"

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

        this.update_style(loaded_items.some((entry) => entry[1] > 0))
    }

    public update_style(visible: boolean): void {
        let count = 0
        this._objects.forEach((object) => {
            if (Collection.get_item_count(object) > 0) {
                count++
            }
        })

        this._title.innerText = `${this._section_title} (${count}/${this._objects.length})`
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
        this._name_element.className = "inverted-text"

        this._number_element = this.element.appendChild(document.createElement('p'))
        this._number_element.id = "collection-text"
        this._number_element.className = "inverted-text"
    }

    public update_style(entry: CollectionEntry): void {
        this._name_element.innerText = entry[0].name
        this._number_element.innerHTML = "×" + entry[1].toString()
        this._number_element.style.fontSize = "1.2em"
        this.element.style.display = entry[1] > 0 ? "" : "none"
    }
}

export class Collection {
    private static _loaded_values: Map<string, number> = new Map()
    private static _object_element_map: Map<string, CollectionElement> = new Map()
    private static _object_section_map: [GridObject[], CollectionSection][] = []
    private static _item_sheet: SpriteSheet = new SpriteSheet(16, "./assets/object_sheet.png", new Vector2(1024, 1024), 1)

    private static on_object_count_changed(object: GridObject, count: number): void {
        const element = this._object_element_map.get(object.name)!
        element.update_style([ object, count ])
        this._object_section_map.filter((objects) => objects[0].includes(object)).forEach((section) => {
            section[1].update_style(true)
        })
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

    private static set_item_count(object: GridObject, count: number): void {
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

    public static add_item(object: GridObject): number {
        const new_count = this.get_item_count(object) + 1
        this.set_item_count(object, new_count)
        return new_count
    }

    public static create_collection_element(): HTMLElement {
        const element = document.createElement('div')
        element.id = 'collection'

        const title = element.appendChild(document.createElement('h2'))
        title.innerText = "Collection"

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
