import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import { get_weighted_random, Weighted } from "../utils/weighted_randomness"
import { Collection } from "./collection"
import { ActiveObject, IMiningGrid } from "./iboard"
import { EVOLUTION_STONES, FOSSILS, get_item_by_name, GridObject, ItemName, ITEMS, LARGE_SPHERES, LootPoolWeightParameter, PLATES, SHARDS, SMALL_SPHERES, WEATHER_STONES } from "./objects"
import { GameVersion, LootPool, Settings } from "./settings"


enum GameStateAvailability {
    PREGAME,
    POSTGAME,
    BOTH
}

export type ModifierWeightParams = { postgame: boolean }

type ModifierCost = [ItemName, number][]
export class Modifier implements Weighted<ModifierWeightParams> {
    constructor(
        public cost: ModifierCost,
        public title: string,
        private _button_class: string,
        public postgame: GameStateAvailability = GameStateAvailability.BOTH,
        public repeatable: boolean = true,
        private _weight: number | (() => number) = 100,
        private _guaranteed_chance: number = 0.8,
        private _check_appearance_conditions?: () => boolean
    ) {

    }

    public generate_terrain(mining_grid: IMiningGrid): void {
        mining_grid.generate_terrain()
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public pre_object_placement(mining_grid: IMiningGrid): void {
    }

    public place_objects(mining_grid: IMiningGrid, item_count: number, elegible_items: GridObject[], loot_pool: LootPool): ActiveObject[] {
        return mining_grid.place_items(item_count, elegible_items, loot_pool)
    }

    public place_bedrock(mining_grid: IMiningGrid): void {
        mining_grid.place_bedrock()
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    public get_intro_messages(item_count: number): string[] | undefined {
        return undefined
    }

    public get_weight(params: ModifierWeightParams): number {
        // If the function exists, and returns false, return a weight of 0. Effectively hiding the modifier
        if (this._check_appearance_conditions && !this._check_appearance_conditions()) return 0

        let multiplier = 1
        switch (this.postgame) {
            case GameStateAvailability.BOTH:
                multiplier *= 1
                break
            case GameStateAvailability.PREGAME:
                multiplier *= (params.postgame ? 0 : 1)
                break
            case GameStateAvailability.POSTGAME:
                multiplier *= (params.postgame ? 1 : 0)
                break
            default:
                break
        }

        if (typeof this._weight === 'number') {
            return this._weight * multiplier
        }
        else {
            return this._weight() * multiplier
        }
    }

    public create_modifier_option(): { element: HTMLElement, on_click?: (applied_modifier: Modifier) => void } {
        const small_sprites = new SpriteSheet(16, './assets/object_sheet.png', new Vector2(1024, 1024), 1)
        const element = document.createElement('div')
        element.id = 'modifier-option'
        const return_value: { element: HTMLElement, on_click?: (applied_modifier: Modifier) => void } = { element: element }

        const item_list = element.appendChild(document.createElement('div'))
        item_list.id = 'modifier-cost'

        const can_afford = this.can_afford()

        this.cost.forEach((value) => {
            const sprite = new Sprite(item_list, small_sprites, get_item_by_name(value[0]).start_tile, get_item_by_name(value[0]).end_tile)
            if (!can_afford) {
                sprite.element.classList.add('disabled')
            }
            if (value[1] > 1) {
                const amt_text = item_list.appendChild(document.createElement('span'))
                amt_text.innerText = `x${value[1]}`
                amt_text.classList.add(can_afford ? 'inverted-text' : 'red-text')
            }
        })

        const button = element.appendChild(document.createElement('button'))
        button.innerText = this.title
        button.id = 'modifier-button'
        button.classList.add(this._button_class)
        button.disabled = !can_afford
        button.onclick = (): void => return_value.on_click?.(this)

        return return_value
    }

    public can_afford(): boolean {
        let can_afford_modifier = true
        this.cost.forEach((value) => {
            if (Collection.get_item_count(value[0]) < value[1]) {
                can_afford_modifier = false
            }
        })

        return can_afford_modifier
    }

    public purchase(): void {
        this.cost.forEach((value) => Collection.remove_item(value[0], value[1]))
    }

    public modify_loot_pool(loot_pool: LootPool): LootPool {
        return loot_pool
    }

    public modify_rate(object: GridObject, rate: number): number {
        return rate
    }

    public modify_item_amount(item_amount: number): number {
        return item_amount
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public modify_terrain_noise(noise_value: number, x_index: number, y_index: number): number {
        return noise_value
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public modify_terrain_level(cell_level: number, x_index: number, y_index: number): number {
        return cell_level
    }

    public get_guaranteed_chance(): number {
        return this._guaranteed_chance
    }
}

class DropRateModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        private _increases: Map<ItemName, number>,
        title: string,
        button_class: string,
        postgame: GameStateAvailability = GameStateAvailability.BOTH,
        repeatable: boolean = true
    ) {
        super(modifier_cost, title, button_class, postgame, repeatable)
    }

    public override modify_rate(object: GridObject, rate: number): number {
        if (this._increases.has(object.name) && rate > 0) {
            return rate + this._increases.get(object.name)!
        }
        else {
            return rate
        }
    }

    public override modify_item_amount(item_amount: number): number {
        return Math.max(3, item_amount)
    }
}

class VersionChangeModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        private _loot_pool_map: Map<LootPool, LootPool>,
        title: string,
        button_class: string,
        postgame: GameStateAvailability = GameStateAvailability.BOTH,
        repeatable: boolean = true
    ) {
        super(modifier_cost, title, button_class, postgame, repeatable)
    }

    public override modify_rate(object: GridObject, rate: number): number {
        const original_loot_pool = Settings.get_lootpool()
        const target_loot_pool = this._loot_pool_map.get(original_loot_pool)
        if (!target_loot_pool) {
            console.warn("Version change loot pool map is missing an entry for", LootPool[original_loot_pool])
            return rate
        }

        const target_pool_rate = object.get_weight(target_loot_pool)
        let adjusted_rate = ((target_pool_rate - rate) > 0) ? target_pool_rate : 0
        const basic_spheres = SMALL_SPHERES.slice(0, 2).concat(LARGE_SPHERES.slice(0, 2))
        if (basic_spheres.includes(object)) adjusted_rate *= 0.3
        return adjusted_rate
    }
}

export class PlateModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        check_appearance_conditions?: () => boolean
    ) {
        super(modifier_cost, 'Assemble pieces', 'platinum', GameStateAvailability.POSTGAME, false, undefined, undefined, check_appearance_conditions)
    }

    public override can_afford(): boolean {
        if (PLATES.every((plate) => Collection.get_item_count(plate) > 0)) {
            return false
        }

        return super.can_afford()
    }

    public override modify_item_amount(): number {
        return 1
    }

    public override get_intro_messages(): string[] {
        return [ "Something pinged in the wall!\nPlate confirmed!" ]
    }
}

class FillSphereModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        private _fill_objects: GridObject[],
        title: string,
        button_class: string,
        postgame: GameStateAvailability = GameStateAvailability.BOTH,
        repeatable: boolean = true,
        check_appearance_conditions?: () => boolean
    ) {
        super(modifier_cost, title, button_class, postgame, repeatable, undefined, undefined, check_appearance_conditions)
    }

    public override get_weight(params: ModifierWeightParams): number {
        return params.postgame ? 100 : 50
    }

    public override place_objects(mining_grid: IMiningGrid, item_count: number, elegible_items: GridObject[], loot_pool: LootPool): ActiveObject[] {
        const added_items: ActiveObject[] = []
        while (true) {
            const object = get_weighted_random<LootPoolWeightParameter, GridObject>(this._fill_objects, { loot_pool: loot_pool })
            if (this._fill_objects.includes(object)) {
                const placement_result = mining_grid.try_add_object_at_random_valid_position(object)
                if (!placement_result) break
                else added_items.push(new ActiveObject(object, placement_result))
            }
        }
        return added_items
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    public override get_intro_messages(item_count: number): string[] | undefined {
        return [ "Something pinged in the wall!\n??? confirmed?" ]
    }
}

class TerrainScaleModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        private _scale_modifier: number,
        private _item_amount_modifier: number,
        title: string,
        button_class: string,
        postgame: GameStateAvailability = GameStateAvailability.BOTH,
        repeatable: boolean = true
    ) {
        super(modifier_cost, title, button_class, postgame, repeatable)
    }

    public override modify_terrain_level(cell_level: number): number {
        return cell_level + this._scale_modifier
    }

    public override modify_item_amount(item_amount: number): number {
        return item_amount + this._item_amount_modifier
    }

    public override modify_rate(object: GridObject, rate: number): number {
        const rate_scaling = 200
        let rate_alpha = rate / rate_scaling

        if (this._scale_modifier > 0) {
            // Bump up the rate of rare items
            rate_alpha = Math.pow(rate_alpha, 0.5)
        }
        else if (this._scale_modifier < 0) {
            // Bump up the rate of common items
            rate_alpha = Math.pow(rate_alpha, 1.5)
        }

        return rate_alpha * rate_scaling
    }
}

export function create_active_modifier_element(modifier: Modifier): HTMLElement {
    const element = document.createElement('div')
    element.id = 'active-modifier'
    const small_sprites = new SpriteSheet(16, './assets/object_sheet.png', new Vector2(1024, 1024), 1)
    const first_cost = modifier.cost.values().next().value

    if (first_cost) {
        new Sprite(element, small_sprites, get_item_by_name(first_cost[0]).start_tile, get_item_by_name(first_cost[0]).end_tile)
    }

    const title = element.appendChild(document.createElement('p'))
    title.innerText = modifier.title
    title.classList.add('inverted-text')

    return element
}
export class Modifiers {
    public static get_guaranteed_modifiers(): Modifier[] {
        return []
    }

    public static get_optional_modifiers(): Modifier[] {
        const item_modifier_increases
        = new Map<ItemName, number>(ITEMS.map((item) => [ item.name, item.get_weight(Settings.get_lootpool()) > 0 ? 50 : 0 ]))
        // Costs red spheres
        const item_modifier_small = new DropRateModifier([ [ "Small Red Sphere", 3 ] ], item_modifier_increases, 'Increase Items', 'pearl')
        const item_modifier_large = new DropRateModifier([ [ "Large Red Sphere", 1 ] ], item_modifier_increases, 'Increase Items', 'pearl')

        // Costs blue spheres
        const stone_modifier_increases
        // Only increase if normal rate isn't 0
        = new Map<ItemName, number>([ ...EVOLUTION_STONES, ...WEATHER_STONES ].map((item) => [ item.name, item.get_weight(Settings.get_lootpool()) > 0 ? 50 : 0 ]))
        const stone_modifier_small = new DropRateModifier([ [ "Small Blue Sphere", 3 ] ], stone_modifier_increases, 'Increase stones', 'diamond')
        const stone_modifier_large = new DropRateModifier([ [ "Large Blue Sphere", 1 ] ], stone_modifier_increases, 'Increase stones', 'diamond')

        // Costs green spheres
        const fossil_modifier_increases
        // Only increase if normal rate isn't 0
        = new Map<ItemName, number>(FOSSILS.map((item) => [ item.name, item.get_weight(Settings.get_lootpool()) > 0 ? 50 : 0 ]))
        const fossil_modifier_small = new DropRateModifier([ [ "Small Green Sphere", 3 ] ], fossil_modifier_increases, 'Increase fossils', 'platinum')
        const fossil_modifier_large = new DropRateModifier([ [ "Large Green Sphere", 1 ] ], fossil_modifier_increases, 'Increase fossils', 'platinum')

        const plate_modifier = new PlateModifier(SHARDS.map((shard) => [ shard.name, 1 ]))

        const loot_pool_mapping = new Map<LootPool, LootPool>([
            [ LootPool.POST_DEX_DIAMOND, LootPool.POST_DEX_PEARL ],
            [ LootPool.POST_DEX_PEARL, LootPool.POST_DEX_DIAMOND ],
            [ LootPool.PRE_DEX_DIAMOND, LootPool.PRE_DEX_PEARL ],
            [ LootPool.PRE_DEX_PEARL, LootPool.PRE_DEX_DIAMOND ]
        ])

        const version = Settings.get_squashed_version()
        const opposing_button_class = version === GameVersion.DIAMOND ? 'pearl' : 'diamond'
        const small_opposing_sphere: ItemName = version === GameVersion.DIAMOND ? "Small Pale Sphere" : "Small Prism Sphere"
        const large_opposing_sphere: ItemName = version === GameVersion.DIAMOND ? "Large Pale Sphere" : "Large Prism Sphere"
        const version_modifier_small = new VersionChangeModifier([ [ small_opposing_sphere, 3 ] ], loot_pool_mapping, 'Space-time rift?', opposing_button_class)
        const version_modifier_large = new VersionChangeModifier([ [ large_opposing_sphere, 1 ] ], loot_pool_mapping, 'Space-time rift?', opposing_button_class)

        const fill_sphere_modifier = new FillSphereModifier([ [ "Light Clay", 1 ] ], [ ...SMALL_SPHERES, ...LARGE_SPHERES ], 'Sphere burst', 'platinum')

        const mild_terrain_modifier = new TerrainScaleModifier([ [ "Everstone", 2 ], [ "Skull Fossil", 1 ], [ "Heart Scale", 1 ] ], -1, -1, 'Mild terrain', 'diamond')
        const harsh_terrain_modifier = new TerrainScaleModifier([ [ "Hard Stone", 2 ], [ "Armor Fossil", 1 ], [ "Heart Scale", 1 ] ], 1, 3, 'Harsh terrain', 'pearl')

        const sphere_increase_modifier = new DropRateModifier(
            [ [ "Heart Scale", 1 ], [ version === GameVersion.DIAMOND ? "Sun Stone" : "Moon stone", 1 ] ],
            new Map<ItemName, number>([ ...SMALL_SPHERES, ...LARGE_SPHERES ].map((item) => [ item.name, 50 ])),
            'Increase spheres', 'platinum'
        )

        return [
            plate_modifier,
            version_modifier_small,
            version_modifier_large,
            item_modifier_small,
            item_modifier_large,
            stone_modifier_small,
            stone_modifier_large,
            fossil_modifier_small,
            fossil_modifier_large,
            fill_sphere_modifier,
            mild_terrain_modifier,
            harsh_terrain_modifier,
            sphere_increase_modifier
        ]
    }
}
