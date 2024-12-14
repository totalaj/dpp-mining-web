import {
    evolution_stones,
    fossils,
    GridObject,
    items,
    large_spheres,
    plates,
    shards,
    small_speheres,
    weather_stones,
} from "./objects";

export class Collection {
    private static loaded_values: Map<string, number> = new Map();

    public static on_object_count_changed?: (
        object: GridObject,
        count: number,
    ) => void;

    public static get all_items(): GridObject[] {
        return [
            ...small_speheres,
            ...large_spheres,
            ...fossils,
            ...evolution_stones,
            ...shards,
            ...weather_stones,
            ...items,
            ...plates,
        ];
    }

    private static item_key(object: GridObject): string {
        return "Collection." + object.name;
    }

    private static set_item_count(object: GridObject, count: number) {
        window.localStorage.setItem(this.item_key(object), count.toString());
    }

    public static get_item_count(object: GridObject): number {
        if (this.loaded_values.has(object.name))
            return this.loaded_values.get(object.name)!;
        const loaded_value =
            window.localStorage.getItem(this.item_key(object)) ?? "0";
        const count = Number.parseInt(loaded_value);
        this.loaded_values.set(object.name, count);
        return count;
    }

    public static load_all_items(): [GridObject, number][] {
        const items = this.all_items;
        const entries: [GridObject, number][] = [];
        items.forEach((item) => {
            entries.push([item, this.get_item_count(item)]);
        });

        return entries;
    }

    public static add_item(object: GridObject): number {
        const new_count = this.get_item_count(object) + 1;
        this.set_item_count(object, new_count);
        return new_count;
    }
}
