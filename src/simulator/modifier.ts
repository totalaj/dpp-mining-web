import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import { Weighted } from "../utils/weighted_randomness"
import { Collection } from "./collection"
import { EVOLUTION_STONES, FOSSILS, GridObject, ITEMS, LARGE_SPHERES, PLATES, SHARDS, SMALL_SPHERES, WEATHER_STONES } from "./objects"
import { GameVersion, LootPool, Settings } from "./settings"


enum GameStateAvailability {
    PREGAME,
    POSTGAME,
    BOTH
}

export type ModifierWeightParams = { postgame: boolean }

type ModifierCost = [GridObject, number][]
export class Modifier implements Weighted<ModifierWeightParams> {
    constructor(
        public cost: ModifierCost,
        public title: string,
        private _button_class: string,
        public postgame: GameStateAvailability = GameStateAvailability.BOTH,
        public repeatable: boolean = true,
        private _weight: number | (() => number) = 100
    ) {

    }

    public get_weight(params: ModifierWeightParams): number {
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
            const sprite = new Sprite(item_list, small_sprites, value[0].start_tile, value[0].end_tile)
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
}

export class DropRateModifier extends Modifier {
    constructor(
        modifier_cost: ModifierCost,
        private _increases: Map<string, number>,
        title: string,
        button_class: string,
        postgame: GameStateAvailability = GameStateAvailability.BOTH,
        repeatable: boolean = true
    ) {
        super(modifier_cost, title, button_class, postgame, repeatable)
    }

    public override modify_rate(object: GridObject, rate: number): number {
        if (this._increases.has(object.name)) {
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

export class LootPoolModifier extends Modifier {
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

    public override modify_loot_pool(loot_pool: LootPool): LootPool {
        if (this._loot_pool_map.has(loot_pool)) {
            return this._loot_pool_map.get(loot_pool)!
        }
        else {
            return loot_pool
        }
    }
}

export class VersionChangeModifier extends Modifier {
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
    constructor(modifier_cost: ModifierCost) {
        super(modifier_cost, 'Assemble pieces', 'platinum', GameStateAvailability.POSTGAME, false)
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
}

export function create_active_modifier_element(modifier: Modifier): HTMLElement {
    const element = document.createElement('div')
    element.id = 'active-modifier'
    const small_sprites = new SpriteSheet(16, './assets/object_sheet.png', new Vector2(1024, 1024), 1)
    const first_cost = modifier.cost.values().next().value

    if (first_cost) {
        new Sprite(element, small_sprites, first_cost[0].start_tile, first_cost[0].end_tile)
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
        = new Map<string, number>(ITEMS.map((item) => [ item.name, item.get_weight(Settings.get_lootpool()) > 0 ? 100 : 0 ]))
        // Costs red spheres
        const item_modifier_small = new DropRateModifier([ [ SMALL_SPHERES[1], 6 ] ], item_modifier_increases, 'Increase Items', 'pearl')
        const item_modifier_large = new DropRateModifier([ [ LARGE_SPHERES[1], 2 ] ], item_modifier_increases, 'Increase Items', 'pearl')

        // Costs blue spheres
        const stone_modifier_increases
        // Only increase if normal rate isn't 0
        = new Map<string, number>([ ...EVOLUTION_STONES, ...WEATHER_STONES ].map((item) => [ item.name, item.get_weight(Settings.get_lootpool()) > 0 ? 100 : 0 ]))
        const stone_modifier_small = new DropRateModifier([ [ SMALL_SPHERES[2], 6 ] ], stone_modifier_increases, 'Increase stones', 'diamond')
        const stone_modifier_large = new DropRateModifier([ [ LARGE_SPHERES[2], 2 ] ], stone_modifier_increases, 'Increase stones', 'diamond')

        // Costs green spheres
        const fossil_modifier_increases
        // Only increase if normal rate isn't 0
        = new Map<string, number>(FOSSILS.map((item) => [ item.name, item.get_weight(Settings.get_lootpool()) > 0 ? 100 : 0 ]))
        const fossil_modifier_small = new DropRateModifier([ [ SMALL_SPHERES[0], 6 ] ], fossil_modifier_increases, 'Increase fossils', 'platinum')
        const fossil_modifier_large = new DropRateModifier([ [ LARGE_SPHERES[0], 2 ] ], fossil_modifier_increases, 'Increase fossils', 'platinum')

        const plate_modifier = new PlateModifier(SHARDS.map((shard) => [ shard, 1 ]))

        const loot_pool_mapping = new Map<LootPool, LootPool>([
            [ LootPool.POST_DEX_DIAMOND, LootPool.POST_DEX_PEARL ],
            [ LootPool.POST_DEX_PEARL, LootPool.POST_DEX_DIAMOND ],
            [ LootPool.PRE_DEX_DIAMOND, LootPool.PRE_DEX_PEARL ],
            [ LootPool.PRE_DEX_PEARL, LootPool.PRE_DEX_DIAMOND ]
        ])

        const version = Settings.get_squashed_version()
        const opposing_button_class = version === GameVersion.DIAMOND ? 'pearl' : 'diamond'
        const small_opposing_sphere = version === GameVersion.DIAMOND ? SMALL_SPHERES[4] : SMALL_SPHERES[3]
        const large_opposing_sphere = version === GameVersion.DIAMOND ? LARGE_SPHERES[4] : LARGE_SPHERES[3]
        const version_modifier_small = new VersionChangeModifier([ [ small_opposing_sphere, 3 ] ], loot_pool_mapping, 'Space-time rift?', opposing_button_class)
        const version_modifier_large = new VersionChangeModifier([ [ large_opposing_sphere, 1 ] ], loot_pool_mapping, 'Space-time rift?', opposing_button_class)

        return [
            plate_modifier,
            version_modifier_small,
            version_modifier_large,
            item_modifier_small,
            item_modifier_large,
            stone_modifier_small,
            stone_modifier_large,
            fossil_modifier_small,
            fossil_modifier_large
        ]
    }
}
