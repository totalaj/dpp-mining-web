import { Vector2 } from "../math"
import { GridObject } from "./objects"
import { LootPool } from "./settings"

export class ActiveObject {
    public has_been_found: boolean = false
    constructor(public object_ref: GridObject, public position: Vector2) { }
}

export interface IMiningGrid {

    get_object_positions(object: GridObject, position: Vector2): Vector2[]

    test_object_placement(object: GridObject, position: Vector2): boolean

    get_all_valid_object_positions(object: GridObject): Vector2[]

    add_object_to_grid(object: GridObject, position: Vector2): void

    try_add_object_at_random_valid_position(object: GridObject): Vector2 | undefined

    place_items(item_count: number, elegible_items: GridObject[], loot_pool: LootPool): ActiveObject[]

    place_bedrock(): void
}