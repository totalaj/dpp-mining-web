import { ActiveObject, MiningGrid } from "../simulator/board"
import { Modifier } from "../simulator/modifier"
import { GridObject, PLATES, LootPoolWeightParameter } from "../simulator/objects"
import { LootPool } from "../simulator/settings"
import { get_weighted_random } from "./weighted_randomness"


export function place_items_default(board: MiningGrid, item_count: number, elegible_items: GridObject[], loot_pool: LootPool, active_modifier: Modifier, added_items_ref: ActiveObject[]): void {
    for (let index = 0; index < item_count; index++) {
        // Filter out plates that have already been added
        const disallowed_items: GridObject[] = [
            ...added_items_ref.filter((item) => PLATES.includes(item.object_ref)).map((item) => item.object_ref) // No duplicate of plates
        ]

        let found_item: GridObject

        do {
            found_item = get_weighted_random<LootPoolWeightParameter, GridObject>(elegible_items, { loot_pool: loot_pool, modifier: active_modifier })
        } while (disallowed_items.some((item) => found_item === item))

        const result = board.try_add_object_at_random_valid_position(found_item)
        if (result) {
            added_items_ref.push(new ActiveObject(found_item, result))
        }
    }
}