import { SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import { Weighted } from "../utils/weighted_randomness"
import { Modifier } from "./modifier"
import { LootPool } from "./settings"

export enum ContentType {
    NOTHING = 0,
    ITEM = 1,
    BEDROCK = 2
}

class Rarity {
    constructor(
        public pre_dex_diamond: number,
        public pre_dex_pearl: number,
        public post_dex_diamond: number,
        public post_dex_pearl: number
    ) {

    }

    public get_rate(loot_pool: LootPool): number {
        switch (loot_pool) {
            case LootPool.PRE_DEX_DIAMOND:
                return this.pre_dex_diamond
            case LootPool.PRE_DEX_PEARL:
                return this.pre_dex_pearl
            case LootPool.POST_DEX_DIAMOND:
                return this.post_dex_diamond
            case LootPool.POST_DEX_PEARL:
                return this.post_dex_pearl
            default: // Fallback and ALL
                return this.pre_dex_diamond + this.pre_dex_pearl + this.post_dex_diamond + this.post_dex_pearl
        }
    }
}

export type LootPoolWeightParameter = { loot_pool: LootPool, modifier?: Modifier } | LootPool

export type ItemName =
    "Small Green Sphere" | "Small Red Sphere" | "Small Blue Sphere" | "Small Prism Sphere" | "Small Pale Sphere" |
    "Large Green Sphere" | "Large Red Sphere" | "Large Blue Sphere" | "Large Prism Sphere" | "Large Pale Sphere" |
    "Skull Fossil" | "Armor Fossil" | "Dome Fossil" | "Helix Fossil" | "Old Amber" | "Root Fossil" | "Claw Fossil" |
    "Leaf Stone" | "Fire Stone" | "Water Stone" | "Thunder Stone" | "Moon stone" | "Sun Stone" |
    "Green Shard" | "Red Shard" | "Blue Shard" | "Yellow Shard" |
    "Heat Rock" | "Damp Rock" | "Icy Rock" | "Smooth Rock" |
    "Revive" | "Max Revive" | "Star Piece" | "Heart Scale" | "Hard Stone" | "Everstone" | "Light Clay" | "Iron Ball" | "Oval Stone" | "Rare Bone" | "Odd Keystone" |
    "Insect Plate" | "Dread Plate" | "Draco Plate" | "Zap Plate" | "Fist Plate" | "Flame Plate" | "Sky Plate" | "Spooky Plate" | "Meadow Plate" | "Earth Plate" | "Icicle Plate" | "Toxic Plate" | "Mind Plate" | "Stone Plate" | "Iron Plate" | "Splash Plate" |
    "4-tall I" | "4-tall 2-wide I" | "4-wide line" | "3x3 block" | "2x4 block" | "2x2 block" |
    "Vertical S" | "Vertical Z" | "Horizontal Z" | "Horizontal S" |
    "Vertical T left" | "Vertical T right" | "Horizontal T invert" | "Horizontal T"

export type Genus = 'a' | 'an'
export class GridObject implements Weighted<LootPoolWeightParameter> {
    public static object_sheet = new SpriteSheet(16, './assets/object_sheet.png', new Vector2(1024, 1024), 3)
    public extents: Vector2


    public get_weight(param: LootPoolWeightParameter): number {
        if (typeof param === 'object') {
            const rate = this.rarity.get_rate(param.loot_pool)
            return param.modifier ? param.modifier.modify_rate(this, rate) : rate
        }
        else {
            return this.rarity.get_rate(param)
        }
    }

    // Use reverse indexing, (ie y,x rather than x,y) because of how data is inputed
    public collision: Array<Array<boolean>>

    constructor(public start_tile: Vector2, public end_tile: Vector2, public content_type: ContentType, public rarity: Rarity, public name: ItemName, collision: Array<Array<boolean>>, public genus: Genus = 'a') {
        this.extents = end_tile.subtract(start_tile).add(new Vector2(1, 1))
        this.collision = collision
    }
}

// Remove duplicates by name
export function trim_duplicates(objects: GridObject[]): GridObject[] {
    const existing_names = new Set<string>()
    return objects.filter((object) => {
        if (existing_names.has(object.name)) return false
        existing_names.add(object.name)
        return true
    })
}

export function get_all_objects(): GridObject[] {
    return [ ...SMALL_SPHERES, ...LARGE_SPHERES, ...FOSSILS, ...EVOLUTION_STONES, ...SHARDS, ...WEATHER_STONES, ...ITEMS, ...PLATES ]
}

export function get_item_by_name(name: ItemName): GridObject {
    const result = get_all_objects().concat(BEDROCK_OBJECTS).find((object) => object.name === name)
    if (result) return result
    else {
        console.error(`Could not find object with name ${name}`)
        return BEDROCK_OBJECTS[0]
    }
}

export const BEDROCK_OBJECTS = [
    // 0
    new GridObject(
        new Vector2(1, 0), new Vector2(1, 3), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "4-tall I",
        [
            [ true ],
            [ true ],
            [ true ],
            [ true ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(2, 0), new Vector2(3, 3), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "4-tall 2-wide I",
        [
            [ true, true ],
            [ true, true ],
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(4, 0), new Vector2(7, 0), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "4-wide line",
        [
            [ true, true, true, true ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(4, 1), new Vector2(6, 3), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "3x3 block",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(7, 1), new Vector2(10, 2), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "2x4 block",
        [
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 5
    new GridObject(
        new Vector2(11, 0), new Vector2(12, 1), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "2x2 block",
        [
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 6
    new GridObject(
        new Vector2(1, 4), new Vector2(2, 6), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Vertical S",
        [
            [ true, false ],
            [ true, true ],
            [ false, true ]
        ]
    ),
    // 7
    new GridObject(
        new Vector2(3, 4), new Vector2(4, 6), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Vertical Z",
        [
            [ false, true ],
            [ true, true ],
            [ true, false ]
        ]
    ),
    // 8
    new GridObject(
        new Vector2(5, 5), new Vector2(7, 6), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Horizontal Z",
        [
            [ true, true, false ],
            [ false, true, true ]
        ]
    ),
    // 9
    new GridObject(
        new Vector2(8, 5), new Vector2(10, 6), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Horizontal S",
        [
            [ false, true, true ],
            [ true, true, false ]
        ]
    ),
    // 10
    new GridObject(
        new Vector2(1, 7), new Vector2(2, 9), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Vertical T left",
        [
            [ true, false ],
            [ true, true ],
            [ true, false ]
        ]
    ),
    // 11
    new GridObject(
        new Vector2(3, 7), new Vector2(4, 9), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Vertical T right",
        [
            [ false, true ],
            [ true, true ],
            [ false, true ]
        ]
    ),
    // 12
    new GridObject(
        new Vector2(5, 8), new Vector2(7, 9), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Horizontal T invert",
        [
            [ false, true, false ],
            [ true, true, true ]
        ]
    ),
    // 13
    new GridObject(
        new Vector2(8, 8), new Vector2(10, 9), ContentType.BEDROCK,
        new Rarity(0, 0, 0, 0), "Horizontal T",
        [
            [ true, true, true ],
            [ false, true, false ]
        ]
    )
]

export const SMALL_SPHERES = [
    // 0
    new GridObject(
        new Vector2(13, 0), new Vector2(14, 1), ContentType.ITEM,
        new Rarity(150, 150, 107, 107), "Small Green Sphere",
        [
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(15, 0), new Vector2(16, 1), ContentType.ITEM,
        new Rarity(167, 194, 110, 164), "Small Red Sphere",
        [
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(17, 0), new Vector2(18, 1), ContentType.ITEM,
        new Rarity(194, 167, 150, 124), "Small Blue Sphere",
        [
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(19, 0), new Vector2(20, 1), ContentType.ITEM,
        new Rarity(30, 22, 27, 20), "Small Prism Sphere",
        [
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(21, 0), new Vector2(22, 1), ContentType.ITEM,
        new Rarity(22, 30, 20, 27), "Small Pale Sphere",
        [
            [ true, true ],
            [ true, true ]
        ]
    )
]

export const LARGE_SPHERES = [
    // 0
    new GridObject(
        new Vector2(13, 2), new Vector2(15, 4), ContentType.ITEM,
        new Rarity(75, 75, 53, 53), "Large Green Sphere",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(16, 2), new Vector2(18, 4), ContentType.ITEM,
        new Rarity(83, 96, 61, 75), "Large Red Sphere",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(19, 2), new Vector2(21, 4), ContentType.ITEM,
        new Rarity(96, 82, 75, 61), "Large Blue Sphere",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(22, 2), new Vector2(24, 4), ContentType.ITEM,
        new Rarity(15, 13, 13, 10), "Large Prism Sphere",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(25, 2), new Vector2(27, 4), ContentType.ITEM,
        new Rarity(13, 15, 10, 13), "Large Pale Sphere",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    )
]

export const FOSSILS = [
    // 0
    new GridObject(
        new Vector2(13, 5), new Vector2(16, 8), ContentType.ITEM,
        new Rarity(25, 0, 12, 0), "Skull Fossil",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ false, true, true, false ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(17, 5), new Vector2(21, 8), ContentType.ITEM,
        new Rarity(0, 25, 0, 12), "Armor Fossil",
        [
            [ false, true, true, true, false ],
            [ false, true, true, true, false ],
            [ true, true, true, true, true ],
            [ false, true, true, true, false ]
        ], 'an'
    ),
    // 2
    new GridObject(
        new Vector2(22, 5), new Vector2(26, 8), ContentType.ITEM,
        new Rarity(0, 0, 1, 13), "Dome Fossil",
        [
            [ true, true, true, true, true ],
            [ true, true, true, true, true ],
            [ true, true, true, true, true ],
            [ false, true, true, true, false ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(27, 5), new Vector2(30, 8), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Helix Fossil", // 0deg
        [ // Divide rarity by 4 since there are 4 instances
            [ false, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, false ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(31, 5), new Vector2(34, 8), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Helix Fossil", // 90deg
        [
            [ true, true, true, false ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ false, true, true, true ]
        ]
    ),
    // 5
    new GridObject(
        new Vector2(35, 5), new Vector2(38, 8), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Helix Fossil", // 180deg
        [
            [ false, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, false ]
        ]
    ),
    // 6
    new GridObject(
        new Vector2(39, 5), new Vector2(42, 8), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Helix Fossil", // 270deg
        [
            [ true, true, true, false ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ false, true, true, true ]
        ]
    ),
    // 7
    new GridObject(
        new Vector2(43, 5), new Vector2(46, 8), ContentType.ITEM,
        new Rarity(0, 0, 5 / 2, 5 / 2), "Old Amber", // 0deg
        [ // Divide rarity by 2 since there are 2 instances
            [ false, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, false ]
        ], 'an'
    ),
    // 8
    new GridObject(
        new Vector2(47, 5), new Vector2(50, 8), ContentType.ITEM,
        new Rarity(0, 0, 5 / 2, 5 / 2), "Old Amber", // 90deg
        [
            [ true, true, true, false ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ false, true, true, true ]
        ], 'an'
    ),
    // 9
    new GridObject(
        new Vector2(13, 9), new Vector2(17, 13), ContentType.ITEM,
        new Rarity(0, 0, 4 / 4, 12 / 4), "Root Fossil", // 0deg
        [ // Divide rarity by 4 since there are 4 instances
            [ true, true, true, true, false ],
            [ true, true, true, true, true ],
            [ true, true, false, true, true ],
            [ false, false, false, true, true ],
            [ false, false, true, true, false ]
        ]
    ),
    // 10
    new GridObject(
        new Vector2(18, 9), new Vector2(22, 13), ContentType.ITEM,
        new Rarity(0, 0, 4 / 4, 12 / 4), "Root Fossil", // 90deg
        [
            [ false, false, true, true, true ],
            [ false, false, true, true, true ],
            [ true, false, false, true, true ],
            [ true, true, true, true, true ],
            [ false, true, true, true, false ]
        ]
    ),
    // 11
    new GridObject(
        new Vector2(23, 9), new Vector2(27, 13), ContentType.ITEM,
        new Rarity(0, 0, 4 / 4, 12 / 4), "Root Fossil", // 180deg
        [
            [ false, true, true, false, false ],
            [ true, true, false, false, false ],
            [ true, true, false, true, true ],
            [ true, true, true, true, true ],
            [ false, true, true, true, true ]
        ]
    ),
    // 12
    new GridObject(
        new Vector2(28, 9), new Vector2(32, 13), ContentType.ITEM,
        new Rarity(0, 0, 4 / 4, 12 / 4), "Root Fossil", // 270deg
        [
            [ false, true, true, true, false ],
            [ true, true, true, true, true ],
            [ true, true, false, false, true ],
            [ true, true, true, false, false ],
            [ true, true, true, false, false ]
        ]
    ),
    // 13
    new GridObject(
        new Vector2(33, 9), new Vector2(36, 13), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Claw Fossil", // 0deg
        [ // Divide rarity by 4 since there are 4 instances
            [ false, false, true, true ],
            [ false, true, true, true ],
            [ false, true, true, true ],
            [ true, true, true, false ],
            [ true, true, false, false ]
        ]
    ),
    // 14
    new GridObject(
        new Vector2(37, 10), new Vector2(41, 13), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Claw Fossil", // 90deg
        [
            [ true, true, false, false, false ],
            [ true, true, true, true, false ],
            [ false, true, true, true, true ],
            [ false, false, true, true, true ]
        ]
    ),
    // 15
    new GridObject(
        new Vector2(42, 9), new Vector2(45, 13), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Claw Fossil", // 180deg
        [
            [ false, false, true, true ],
            [ false, true, true, true ],
            [ true, true, true, false ],
            [ true, true, true, false ],
            [ true, true, false, false ]
        ]
    ),
    // 16
    new GridObject(
        new Vector2(46, 10), new Vector2(50, 13), ContentType.ITEM,
        new Rarity(0, 0, 12 / 4, 4 / 4), "Claw Fossil", // 270deg
        [
            [ true, true, true, false, false ],
            [ true, true, true, true, false ],
            [ false, true, true, true, true ],
            [ false, false, false, true, true ]
        ]
    )
]

export const EVOLUTION_STONES = [
    // 0
    new GridObject(
        new Vector2(13, 14), new Vector2(15, 17), ContentType.ITEM,
        new Rarity(2 / 2, 4 / 2, 5 / 2, 30 / 2), "Leaf Stone", // 0deg
        [ // Divide rarity by 2 since there are 2 instances
            [ false, true, false ],
            [ true, true, true ],
            [ true, true, true ],
            [ false, true, false ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(16, 15), new Vector2(19, 17), ContentType.ITEM,
        new Rarity(2 / 2, 4 / 2, 5 / 2, 30 / 2), "Leaf Stone", // 0deg
        [
            [ false, true, true, false ],
            [ true, true, true, true ],
            [ false, true, true, false ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(20, 15), new Vector2(22, 17), ContentType.ITEM,
        new Rarity(4, 1, 30, 5), "Fire Stone",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(23, 15), new Vector2(25, 17), ContentType.ITEM,
        new Rarity(1, 4, 5, 30), "Water Stone",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, false ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(26, 15), new Vector2(28, 17), ContentType.ITEM,
        new Rarity(4, 1, 30, 5), "Thunder Stone",
        [
            [ false, true, true ],
            [ true, true, true ],
            [ true, true, false ]
        ]
    ),
    // 5
    new GridObject(
        new Vector2(29, 16), new Vector2(32, 17), ContentType.ITEM,
        new Rarity(2 / 2, 4 / 2, 3 / 2, 15 / 2), "Moon stone", // 0deg
        [ // Divide rarity by 2 since there are 2 instances
            [ false, true, true, true ],
            [ true, true, true, false ]
        ]
    ),
    // 6
    new GridObject(
        new Vector2(33, 14), new Vector2(34, 17), ContentType.ITEM,
        new Rarity(2 / 2, 4 / 2, 3 / 2, 15 / 2), "Moon stone", // 90deg
        [
            [ true, false ],
            [ true, true ],
            [ true, true ],
            [ false, true ]
        ]
    ),
    // 7
    new GridObject(
        new Vector2(35, 15), new Vector2(37, 17), ContentType.ITEM,
        new Rarity(4, 1, 15, 3), "Sun Stone",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    )
]

export const SHARDS = [
    // 0
    new GridObject(
        new Vector2(13, 18), new Vector2(16, 20), ContentType.ITEM,
        new Rarity(13, 13, 17, 17), "Green Shard",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, false, true ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(17, 18), new Vector2(19, 20), ContentType.ITEM,
        new Rarity(13, 13, 17, 17), "Red Shard",
        [
            [ true, true, true ],
            [ true, true, false ],
            [ true, true, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(20, 18), new Vector2(22, 20), ContentType.ITEM,
        new Rarity(13, 13, 17, 17), "Blue Shard",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, false ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(23, 18), new Vector2(26, 20), ContentType.ITEM,
        new Rarity(13, 13, 17, 17), "Yellow Shard",
        [
            [ true, false, true, false ],
            [ true, true, true, false ],
            [ true, true, true, true ]
        ]
    )
]

export const WEATHER_STONES = [
    // 0
    new GridObject(
        new Vector2(13, 21), new Vector2(16, 23), ContentType.ITEM,
        new Rarity(2, 1, 11, 5), "Heat Rock",
        [
            [ true, false, true, false ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(17, 21), new Vector2(19, 23), ContentType.ITEM,
        new Rarity(1, 2, 5, 11), "Damp Rock",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, false, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(20, 21), new Vector2(23, 24), ContentType.ITEM,
        new Rarity(2, 1, 11, 5), "Icy Rock",
        [
            [ false, true, true, false ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, false, false, true ]
        ], 'an'
    ),
    // 3
    new GridObject(
        new Vector2(24, 21), new Vector2(27, 24), ContentType.ITEM,
        new Rarity(1, 2, 5, 11), "Smooth Rock",
        [
            [ false, false, true, false ],
            [ true, true, true, false ],
            [ false, true, true, true ],
            [ false, true, false, false ]
        ]
    )
]

export const ITEMS = [
    // 0
    new GridObject(
        new Vector2(13, 25), new Vector2(15, 27), ContentType.ITEM,
        new Rarity(8, 8, 10, 10), "Revive",
        [
            [ false, true, false ],
            [ true, true, true ],
            [ false, true, false ]
        ]
    ),
    // 1
    new GridObject(
        new Vector2(16, 25), new Vector2(18, 27), ContentType.ITEM,
        new Rarity(1, 1, 2, 2), "Max Revive",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(19, 25), new Vector2(21, 27), ContentType.ITEM,
        new Rarity(2, 2, 10, 10), "Star Piece",
        [
            [ false, true, false ],
            [ true, true, true ],
            [ false, true, false ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(22, 26), new Vector2(23, 27), ContentType.ITEM,
        new Rarity(33, 33, 30, 30), "Heart Scale",
        [
            [ true, false ],
            [ true, true ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(14, 28), new Vector2(15, 29), ContentType.ITEM,
        new Rarity(4, 4, 20, 20), "Hard Stone",
        [
            [ true, true ],
            [ true, true ]
        ]
    ),
    // 5
    new GridObject(
        new Vector2(16, 28), new Vector2(19, 29), ContentType.ITEM,
        new Rarity(4, 4, 20, 20), "Everstone",
        [
            [ true, true, true, true ],
            [ true, true, true, true ]
        ], 'an'
    ),
    // 6
    new GridObject(
        new Vector2(20, 28), new Vector2(23, 31), ContentType.ITEM,
        new Rarity(1, 1, 5, 2), "Light Clay",
        [
            [ true, false, true, false ],
            [ true, true, true, false ],
            [ true, true, true, true ],
            [ false, true, false, true ]
        ]
    ),
    // 7
    new GridObject(
        new Vector2(24, 28), new Vector2(26, 30), ContentType.ITEM,
        new Rarity(1, 1, 2, 5), "Iron Ball",
        [
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ], 'an'
    ),
    // 8
    new GridObject(
        new Vector2(27, 28), new Vector2(29, 30), ContentType.ITEM,
        new Rarity(0.1, 0.1, 0.3, 0.3), "Oval Stone",
        [ // Normally unobtainable, but I'm gonna put it at low chance
            [ true, true, true ],
            [ true, true, true ],
            [ true, true, true ]
        ], 'an'
    ),
    // 9
    new GridObject(
        new Vector2(29, 18), new Vector2(31, 23), ContentType.ITEM,
        new Rarity(2 / 2, 2 / 2, 10 / 2, 10 / 2), "Rare Bone", // 0deg
        [ // Divide rarity by 2 since there are 2 instances
            [ true, true, true ],
            [ false, true, false ],
            [ false, true, false ],
            [ false, true, false ],
            [ false, true, false ],
            [ true, true, true ]
        ]
    ),
    // 10
    new GridObject(
        new Vector2(32, 21), new Vector2(37, 23), ContentType.ITEM,
        new Rarity(2 / 2, 2 / 2, 10 / 2, 10 / 2), "Rare Bone", // 90deg
        [
            [ true, false, false, false, false, true ],
            [ true, true, true, true, true, true ],
            [ true, false, false, false, false, true ]
        ]
    ),
    // 11
    new GridObject(
        new Vector2(38, 20), new Vector2(41, 23), ContentType.ITEM,
        new Rarity(0, 0, 2, 2), "Odd Keystone",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ], 'an'
    )
]
export const PLATES = [
    // 0
    new GridObject(
        new Vector2(14, 32), new Vector2(17, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Insect Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ], 'an'
    ),
    // 1
    new GridObject(
        new Vector2(18, 32), new Vector2(21, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Dread Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 2
    new GridObject(
        new Vector2(22, 32), new Vector2(25, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Draco Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 3
    new GridObject(
        new Vector2(26, 32), new Vector2(29, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Zap Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 4
    new GridObject(
        new Vector2(30, 32), new Vector2(33, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Fist Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 5
    new GridObject(
        new Vector2(34, 32), new Vector2(37, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Flame Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 6
    new GridObject(
        new Vector2(38, 32), new Vector2(41, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Sky Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 7
    new GridObject(
        new Vector2(42, 32), new Vector2(45, 34), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Spooky Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 8
    new GridObject(
        new Vector2(14, 35), new Vector2(17, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Meadow Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 9
    new GridObject(
        new Vector2(18, 35), new Vector2(21, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Earth Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ], 'an'
    ),
    // 10
    new GridObject(
        new Vector2(22, 35), new Vector2(25, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Icicle Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ], 'an'
    ),
    // 11
    new GridObject(
        new Vector2(26, 35), new Vector2(29, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Toxic Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 12
    new GridObject(
        new Vector2(30, 35), new Vector2(33, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Mind Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 13
    new GridObject(
        new Vector2(34, 35), new Vector2(37, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Stone Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    ),
    // 14
    new GridObject(
        new Vector2(38, 35), new Vector2(41, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Iron Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ], 'an'
    ),
    // 15
    new GridObject(
        new Vector2(42, 35), new Vector2(45, 37), ContentType.ITEM,
        new Rarity(1, 1, 1, 1), "Splash Plate",
        [
            [ true, true, true, true ],
            [ true, true, true, true ],
            [ true, true, true, true ]
        ]
    )
]