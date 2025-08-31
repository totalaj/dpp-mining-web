import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import { get_weighted_random, Weighted } from "../utils/weighted_randomness"
import { HammerType } from "./animations"
import { Collection } from "./collection"
import { GameState } from "./game_state"
import { ALTERNATE_HEAVY_HAMMER, ALTERNATE_LIGHT_HAMMER, Hammer } from "./hammer"
import { ActiveObject, GRID_HEIGHT, GRID_WIDTH, IMiningGrid } from "./iboard"
import { BEDROCK_OBJECTS, EVOLUTION_STONES, FOSSILS, get_item_by_name, GridObject, ItemName, ITEMS, LARGE_SPHERES, LootPoolWeightParameter, PLATES, SHARDS, SMALL_SPHERES, WEATHER_STONES } from "./objects"
import { GameVersion, LootPool, Progress, Settings } from "./settings"


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
        public availability: GameStateAvailability = GameStateAvailability.BOTH,
        public repeatable: boolean = true,
        public weight: number | (() => number) = 100,
        public guaranteed_chance: number = 0.8,
        public check_appearance_conditions?: () => boolean
    ) {

    }

    public generate_terrain(mining_grid: IMiningGrid): void {
        mining_grid.generate_terrain()
    }

    public pre_object_placement(mining_grid: IMiningGrid): void {
    }

    public place_objects(mining_grid: IMiningGrid, item_count: number, elegible_items: GridObject[], loot_pool: LootPool): ActiveObject[] {
        return mining_grid.place_items(item_count, elegible_items, loot_pool)
    }

    public place_bedrock(mining_grid: IMiningGrid): void {
        mining_grid.place_bedrock()
    }

    public get_intro_messages(item_count: number): string[] | undefined {
        return undefined
    }

    public get_weight(params: ModifierWeightParams): number {
        // If the function exists, and returns false, return a weight of 0. Effectively hiding the modifier
        if (this.check_appearance_conditions && !this.check_appearance_conditions()) return 0

        let multiplier = 1
        switch (this.availability) {
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

        if (typeof this.weight === 'number') {
            return this.weight * multiplier
        }
        else {
            return this.weight() * multiplier
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

    public on_game_over(game_state: GameState): { gain_items?: boolean, message?: string[] } {
        return { gain_items: true }
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

    public modify_terrain_noise(noise_value: number, x_index: number, y_index: number): number {
        return noise_value
    }

    public modify_terrain_level(cell_level: number, x_index: number, y_index: number): number {
        return cell_level
    }

    public get_guaranteed_chance(): number {
        return this.guaranteed_chance
    }

    public modify_hammer_damage(damage: number): number {
        return damage
    }

    public modify_hammer(hammer: Hammer): Hammer {
        return hammer
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

class HammerDamageModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        private _damage_modifier: number,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, title, button_class, GameStateAvailability.BOTH, true)
    }

    public override modify_hammer_damage(damage: number): number {
        return damage * this._damage_modifier
    }
}

class AlternateHammerModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, title, button_class, GameStateAvailability.BOTH, true)
    }

    public override modify_hammer(hammer: Hammer): Hammer {
        return hammer.get_hammer_type() === HammerType.LIGHT ? ALTERNATE_LIGHT_HAMMER : ALTERNATE_HEAVY_HAMMER
    }
}

class StrongHammersModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, title, button_class, GameStateAvailability.BOTH, true)
    }

    public override modify_hammer(hammer: Hammer): Hammer {
        const hammer_area = hammer.get_mining_area()
        const new_hammer = new Hammer()
        new_hammer.get_damage = hammer.get_damage.bind(hammer)
        new_hammer.get_hammer_type = hammer.get_hammer_type.bind(hammer)
        new_hammer.get_mining_area = (): Array<[Vector2, number]> => hammer_area.map((value) => [ value[0], value[1] + 1 ])
        return new_hammer
    }
}

class NarrowSearchModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, title, button_class, GameStateAvailability.BOTH, true)
    }

    public override pre_object_placement(mining_grid: IMiningGrid): void {
        mining_grid.add_object_to_grid(get_item_by_name("4-tall I"), new Vector2(0, 1))
        mining_grid.add_object_to_grid(get_item_by_name("4-tall I"), new Vector2(0, 5))
        mining_grid.add_object_to_grid(get_item_by_name("4-tall I"), new Vector2(12, 1))
        mining_grid.add_object_to_grid(get_item_by_name("4-tall I"), new Vector2(12, 5))
        mining_grid.add_object_to_grid(get_item_by_name("4-wide line"), new Vector2(0, 0))
        mining_grid.add_object_to_grid(get_item_by_name("4-wide line"), new Vector2(4, 0))
        mining_grid.add_object_to_grid(get_item_by_name("4-wide line"), new Vector2(8, 0))
        mining_grid.add_object_to_grid(get_item_by_name("4-wide line"), new Vector2(0, 9))
        mining_grid.add_object_to_grid(get_item_by_name("4-wide line"), new Vector2(4, 9))
        mining_grid.add_object_to_grid(get_item_by_name("4-wide line"), new Vector2(8, 9))
    }

    public override modify_terrain_level(cell_level: number, x_index: number, y_index: number): number {
        if (x_index === 0 || x_index === GRID_WIDTH - 1 || y_index === 0 || y_index === GRID_HEIGHT - 1) return 1
        return cell_level
    }
}

export class BadgeModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string,
        private _badge_number: number
    ) {
        const is_retry = Progress.badges_attempted === _badge_number
        super(
            is_retry ? retry_cost : modifier_cost,
            title + (is_retry ? " (retry)" : ""),
            button_class,
            _badge_number > 4 ? GameStateAvailability.POSTGAME : GameStateAvailability.BOTH,
            false,
            is_retry ? 1000 : 100,
            undefined,
            () => Progress.badge_count === (this._badge_number - 1) // Only show if the badge hasn't been collected yet
        )
    }

    public override purchase(): void {
        super.purchase()
        Progress.badges_attempted = this._badge_number
    }

    public override on_game_over(game_state: GameState): { gain_items?: boolean; message?: string[] } {
        if (!game_state.failed) {
            Progress.badge_count = this._badge_number
        }

        return {
            gain_items: !game_state.failed,
            message: game_state.failed
                ? [
                    "Bad luck!\nYou failed the badge challenge!",
                    "Better luck next time!"
                ]
                : [
                    `Congratulations!\nYou have earned badge #${this._badge_number}!`
                ]
        }
    }
}

export class BadgeOneModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 1)
    }

    public override modify_rate(object: GridObject, rate: number): number {
        return object.name === "Heart Scale" ? 1 : 0
    }

    public override modify_item_amount(item_amount: number): number {
        return 3
    }

    public override modify_terrain_level(cell_level: number, x_index: number, y_index: number): number {
        return 2
    }

    public override get_intro_messages(item_count: number): string[] | undefined {
        return [ "Welcome to your first badge challenge!",
            "Your goal:\nDig up 3 items, getting a perfect clear",
            "If you fail, you can try again.\nAnd the cost will decrease",
            "Good luck!" ]
    }
}

export class BadgeTwoModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 2)
    }

    public override modify_item_amount(item_amount: number): number {
        return 1
    }

    public override modify_rate(object: GridObject, rate: number): number {
        return object.name === "Heart Scale" ? 1 : 0
    }

    public override place_bedrock(mining_grid: IMiningGrid): void {
        const bedrock = BEDROCK_OBJECTS

        // Keep tryna add until we can't
        let some_added = false
        do {
            some_added = false

            for (const rock of bedrock) {
                const result = mining_grid.try_add_object_at_random_valid_position(rock)

                if (result) {
                    some_added = true
                }
            }
        } while (some_added)
    }

    public override get_intro_messages(item_count: number): string[] | undefined {
        return [ "Welcome to your second badge challenge!",
            "Your goal:\nFind the heart scale.",
            "But beware of all the bedrock!",
            "Good luck!" ]
    }
}

export class BadgeThreeModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 3)
    }
}

export class BadgeFourModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 4)
    }
}

export class BadgeFiveModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 5)
    }
}

export class BadgeSixModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 6)
    }
}

export class BadgeSevenModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 7)
    }
}

export class BadgeEightModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 8)
    }
}

class EliteFourModifier extends BadgeModifier {
    constructor(
        modifier_cost: ModifierCost,
        retry_cost: ModifierCost,
        title: string,
        button_class: string
    ) {
        super(modifier_cost, retry_cost, title, button_class, 9)
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
        if (get_item_by_name("Everstone").get_weight(Settings.get_lootpool()) > 0) stone_modifier_increases.set("Everstone", 50)
        if (get_item_by_name("Hard Stone").get_weight(Settings.get_lootpool()) > 0) stone_modifier_increases.set("Hard Stone", 50)
        if (get_item_by_name("Odd Keystone").get_weight(Settings.get_lootpool()) > 0) stone_modifier_increases.set("Odd Keystone", 1)
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
        const same_button_class = version === GameVersion.DIAMOND ? 'diamond' : 'pearl'
        const small_opposing_sphere: ItemName = version === GameVersion.DIAMOND ? "Small Pale Sphere" : "Small Prism Sphere"
        const large_opposing_sphere: ItemName = version === GameVersion.DIAMOND ? "Large Pale Sphere" : "Large Prism Sphere"
        const version_modifier_small = new VersionChangeModifier([ [ small_opposing_sphere, 3 ] ], loot_pool_mapping, 'Space-time rift?', opposing_button_class)
        const version_modifier_large = new VersionChangeModifier([ [ large_opposing_sphere, 1 ] ], loot_pool_mapping, 'Space-time rift?', opposing_button_class)

        const fill_sphere_modifier = new FillSphereModifier([ [ "Light Clay", 2 ] ], [ ...SMALL_SPHERES, ...LARGE_SPHERES ], 'Sphere burst', 'platinum')

        const mild_terrain_modifier = new TerrainScaleModifier([ [ "Everstone", 2 ], [ "Skull Fossil", 1 ], [ "Heart Scale", 1 ] ], -1, -1, 'Mild terrain', 'diamond')
        const harsh_terrain_modifier = new TerrainScaleModifier([ [ "Hard Stone", 2 ], [ "Armor Fossil", 1 ], [ "Heart Scale", 1 ] ], 1, 3, 'Harsh terrain', 'pearl')

        const sphere_increase_modifier = new DropRateModifier(
            [ [ "Heart Scale", 1 ], [ version === GameVersion.DIAMOND ? "Sun Stone" : "Moon stone", 1 ] ],
            new Map<ItemName, number>([ ...SMALL_SPHERES, ...LARGE_SPHERES ].map((item) => [ item.name, 50 ])),
            'Increase spheres', 'platinum'
        )
        // Decrease the weight of the modifier if many spheres are collected
        sphere_increase_modifier.weight = [ ...SMALL_SPHERES, ...LARGE_SPHERES ].every((sphere) => Collection.get_item_count(sphere) > 10) ? 10 : 100

        const shard_increase_modifier = new DropRateModifier(
            [ [ "Revive", 1 ], [ "Hard Stone", 1 ], [ "Star Piece", 1 ] ],
            new Map<ItemName, number>([ ...SHARDS ].map((item) => [ item.name, 100 ])),
            'Increase shards', 'platinum'
        )
        // Decrease the weight of the modifier if all plates are collected
        shard_increase_modifier.weight = PLATES.every((plate) => Collection.get_item_count(plate) > 0) ? 30 : 100
        shard_increase_modifier.availability = GameStateAvailability.POSTGAME

        const odd_keystone_modifier = new DropRateModifier(
            FOSSILS.map((fossil) => [ fossil.name, 1 ])
            , new Map<ItemName, number>([ [ "Odd Keystone", 1 ] ]),
            'Summon spirit', 'platinum'
        )
        // Always spawns keystone, if not already collected
        // Only one item, only postgame
        odd_keystone_modifier.availability = GameStateAvailability.POSTGAME
        odd_keystone_modifier.guaranteed_chance = 1
        odd_keystone_modifier.repeatable = false
        odd_keystone_modifier.modify_item_amount = (): number => 1
        odd_keystone_modifier.check_appearance_conditions = ((): boolean => Collection.get_item_count("Odd Keystone") === 0)
        odd_keystone_modifier.get_intro_messages = (): string[] => [ "Something pinged in the wall!\nA strange stone confirmed...?" ]

        const rare_bone_modifier = new DropRateModifier(
            [ [ "Everstone", 1 ], [ "Helix Fossil", 1 ], [ "Thunder Stone", 1 ], [ "Green Shard", 1 ] ],
            new Map<ItemName, number>([ [ "Rare Bone", 100 ] ]),
            'Increase rare bone', 'platinum'
        )

        rare_bone_modifier.availability = GameStateAvailability.POSTGAME

        const minerals: ItemName[] = [ "Icy Rock", "Smooth Rock", "Heat Rock", "Damp Rock" ]
        const mineral_increase_modifier = new DropRateModifier(
            [ [ "Root Fossil", 1 ], [ "Star Piece", 1 ], [ "Red Shard", 1 ] ],
            new Map<ItemName, number>(minerals.map((item: ItemName) => [ item, 100 ])),
            'Increase minerals', 'platinum'
        )
        mineral_increase_modifier.availability = GameStateAvailability.POSTGAME

        const medicine: ItemName[] = [ "Revive", "Max Revive" ]
        const medicine_increase_modifier = new DropRateModifier(
            [ [ "Root Fossil", 1 ], [ "Leaf Stone", 1 ], [ "Blue Shard", 1 ] ],
            new Map<ItemName, number>(medicine.map((item: ItemName) => [ item, 100 ])),
            'Increase medicine', 'platinum'
        )
        medicine_increase_modifier.availability = GameStateAvailability.POSTGAME

        const increase_everything_modifier = new DropRateModifier(
            [ [ "Dome Fossil", 1 ], [ "Heat Rock", 1 ], [ "Damp Rock", 1 ], [ "Yellow Shard", 1 ] ],
            new Map<ItemName, number>(),
            'Increase everything', 'platinum'
        )
        increase_everything_modifier.availability = GameStateAvailability.POSTGAME
        increase_everything_modifier.modify_item_amount = (amount: number): number => amount * 2

        const increase_heart_scale_modifier = new DropRateModifier(
            [ [ "Old Amber", 1 ], [ "Max Revive", 2 ] ],
            new Map<ItemName, number>([ [ "Heart Scale", 100 ] ]),
            'Increase heart scales', 'platinum'
        )
        increase_heart_scale_modifier.availability = GameStateAvailability.POSTGAME

        const increase_iron_ball_modifier = new DropRateModifier(
            [ [ "Light Clay", 1 ], [ "Heart Scale", 2 ] ],
            new Map<ItemName, number>([ [ "Iron Ball", 100 ] ]),
            'Compressed clay', 'diamond'
        )
        increase_iron_ball_modifier.weight = (Collection.get_item_count("Iron Ball") === 0 && Collection.get_item_count("Light Clay") > 2) ? 100 : 30
        increase_iron_ball_modifier.guaranteed_chance = 1

        const increase_light_clay_modifier = new DropRateModifier(
            [ [ "Iron Ball", 1 ], [ "Heart Scale", 2 ] ],
            new Map<ItemName, number>([ [ "Light Clay", 100 ] ]),
            'Weakened iron', 'pearl'
        )
        increase_light_clay_modifier.weight = (Collection.get_item_count("Light Clay") === 0 && Collection.get_item_count("Iron Ball") > 2) ? 100 : 30
        increase_light_clay_modifier.guaranteed_chance = 1

        const transmuation_table = new Map<ItemName, ItemName[]>(version === GameVersion.DIAMOND
        // Prism -> Pale in diamond
            ? [ [ "Large Prism Sphere", [ "Small Pale Sphere", "Large Pale Sphere" ] ],
                [ "Small Prism Sphere", [ "Small Pale Sphere", "Large Pale Sphere" ] ] ]
        // Pale -> Prism in pearl
            : [ [ "Large Pale Sphere", [ "Small Prism Sphere", "Large Prism Sphere" ] ],
                [ "Small Pale Sphere", [ "Small Prism Sphere", "Large Prism Sphere" ] ] ])

        const transmutation_modifiers: Modifier[] = Array.from(transmuation_table.entries()).map((value, index) => {
            const new_modifier = new DropRateModifier(
                // Costs 2 small spheres, 1 large sphere
                [ [ value[0], index + 1 ] ],
                new Map<ItemName, number>(value[1].map((item) => [ item, 200 ])),
                'Transmute sphere', opposing_button_class
            )
            new_modifier.guaranteed_chance = 1
            new_modifier.modify_item_amount = (amount: number): number => amount + 2
            return new_modifier
        })

        const reinforced_hammers_modifier = new HammerDamageModifier(
            [ [ "Heat Rock", 1 ], [ "Icy Rock", 1 ], [ "Moon stone", 1 ] ]
            , 0.8, 'Reinforce hammers', 'diamond'
        )

        const alternate_hammer_modifier = new AlternateHammerModifier(
            [ [ "Damp Rock", 1 ], [ "Smooth Rock", 1 ], [ "Sun Stone", 1 ] ],
            'Alternate hammer', 'pearl'
        )

        const strong_hammers_modifier = new StrongHammersModifier(
            [ [ "Fire Stone", 1 ], [ "Hard Stone", 2 ], [ "Iron Ball", 1 ], [ "Heart Scale", 1 ] ],
            'Strong hammers', 'platinum'
        )

        const narrow_search_modifier = new NarrowSearchModifier(
            [ [ "Water Stone", 1 ], [ "Everstone", 1 ], [ "Revive", 1 ] ],
            'Narrow search', 'platinum'
        )

        const badge_one_modifier = new BadgeOneModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 1", same_button_class
        )

        const badge_two_modifier = new BadgeTwoModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 2", same_button_class
        )

        const badge_three_modifier = new BadgeThreeModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 3", same_button_class
        )

        const badge_four_modifier = new BadgeFourModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 4", same_button_class
        )

        const badge_five_modifier = new BadgeFiveModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 5", same_button_class
        )

        const badge_six_modifier = new BadgeSixModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 6", same_button_class
        )

        const badge_seven_modifier = new BadgeSevenModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 7", same_button_class
        )

        const badge_eight_modifier = new BadgeEightModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "Badge 8", same_button_class
        )

        const elite_four_modifier = new EliteFourModifier(
            [ [ "Heart Scale", 2 ], [ version === GameVersion.DIAMOND ? "Small Prism Sphere" : "Small Pale Sphere", 2 ] ],
            [ [ "Heart Scale", 1 ] ],
            "The League", same_button_class
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
            sphere_increase_modifier,
            shard_increase_modifier,
            odd_keystone_modifier,
            rare_bone_modifier,
            mineral_increase_modifier,
            medicine_increase_modifier,
            increase_everything_modifier,
            increase_heart_scale_modifier,
            version === GameVersion.DIAMOND ? increase_light_clay_modifier : increase_iron_ball_modifier,
            ...transmutation_modifiers,
            reinforced_hammers_modifier,
            alternate_hammer_modifier,
            strong_hammers_modifier,
            narrow_search_modifier,
            badge_one_modifier,
            badge_two_modifier,
            badge_three_modifier,
            badge_four_modifier,
            badge_five_modifier,
            badge_six_modifier,
            badge_seven_modifier,
            badge_eight_modifier,
            elite_four_modifier
        ]
    }
}
