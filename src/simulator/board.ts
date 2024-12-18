import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'
import { BEDROCK_OBJECTS, ContentType, EVOLUTION_STONES, FOSSILS, get_all_objects, GridObject, ITEMS, LARGE_SPHERES, PLATES, SHARDS, SMALL_SPHERES, trim_duplicates, WEATHER_STONES } from "./objects"
import { random_element } from "../utils/array_utils"
import { random_in_range } from "../utils/random"
import { animate_text, GLOBAL_FRAME_RATE, Hammer, HammerType, play_item_found_spark, TextAnimation } from "./animations"
import { HammerButton } from "./hammer_button"
import { set_translation } from "../utils/dom_util"
import { circle_animation, CIRCLE_ANIMATION_FRAMES, shutter_animation, SHUTTER_ANIMATION_FRAMES } from "../components/screen_transition"
import { GameVersion, LootPool, Progress, Settings } from "./settings"
import { Collection } from "./collection"
import { create_version_selector } from "./version_selector"
import { ProgressBar } from "../components/progress_bar"

enum HitResult {
    NORMAL,
    BOTTOM
}

export class ActiveObject {
    public has_been_found: boolean = false
    constructor(public object_ref: GridObject, public position: Vector2) { }
}

class Cell {
    private _background_sprite: Sprite
    private _terrain_sprite: Sprite
    private _object_sprite?: Sprite
    public element: HTMLElement
    public content: ContentType = ContentType.NOTHING

    constructor(parent_element: HTMLDivElement, private _src: SpriteSheet, public x_pos: number, public y_pos: number, on_click: (x: number, y: number) => void) {
        this.element = parent_element.appendChild(document.createElement('div'))
        this._background_sprite = new Sprite(this.element, this._src, new Vector2(1, 0))
        this._background_sprite.element.style.zIndex = '-1'
        this._terrain_sprite = new Sprite(this.element, this._src, new Vector2(0, 0))
        this._terrain_sprite.element.style.zIndex = '1'

        this.element.id = "mining-cell"

        if (this.element.ontouchstart) {
            this.element.ontouchstart = (): void => on_click(x_pos - 1, y_pos - 1)
        }
        else {
            this.element.onmousedown = (): void => on_click(x_pos - 1, y_pos - 1)
        }
        this.element.style.gridColumn = `${x_pos}`
        this.element.style.gridRow = `${y_pos}`
    }

    public set_object(object: GridObject, sprite_position: Vector2): void {
        this._object_sprite = new Sprite(this.element, GridObject.object_sheet, sprite_position)
        this.content = object.content_type
    }

    public clear_object(): void {
        if (this._object_sprite) {
            this.element.removeChild(this._object_sprite.element)
            this._object_sprite = undefined
            this.content = ContentType.NOTHING
        }
    }

    public play_found_animation(): void {
        if (!this._object_sprite) {
            console.warn("Playing an animation for a non-existent object!")
            return
        }

        this._object_sprite.element.classList.add("found")
    }

    public decrease(amount: number = 1): HitResult {
        this.level = Math.max(this._level - amount, 0)
        // Hitting bottom after
        return this._level === 0 ? HitResult.BOTTOM : HitResult.NORMAL
    }

    private _level: number = 0
    public get level(): number {
        return this._level
    }

    public set level(value: number) {
        this._level = Math.max(0, Math.floor(value))
        this._terrain_sprite.set_tile(new Vector2(this.level !== 0 ? 1 + this._level : 0, 0))
    }
}

export class GameState {
    public static readonly MAX_HEALTH = 49
    public is_over: boolean = false
    public failed: boolean = false
    public health: number = GameState.MAX_HEALTH

    constructor(private _health_bar: HealthBar) {
        _health_bar.set_health(GameState.MAX_HEALTH)
    }

    public reduce_health(by: number): boolean {
        this.health = Math.max(0, this.health - by)
        this._health_bar.set_health(this.health)
        if (this.health > 0) {
            return true
        }
        else {
            this.is_over = true
            this.failed = true
            return false
        }
    }
}

class HealthBar {
    public element: HTMLElement
    private _inner_element: HTMLElement

    private _sprite_sheet: SpriteSheet

    private readonly HEALTH_TILE = { from: new Vector2(17, 0), to: new Vector2(21 - (1 / 5), 4) }
    private readonly HEALTH_REMAINDER_TILES = [
        { from: new Vector2(13, 0), to: new Vector2(15, 4) },
        { from: new Vector2(12, 5), to: new Vector2(15, 9) },
        { from: new Vector2(11 + (2 / 5), 10), to: new Vector2(15, 14) },
        { from: new Vector2(2 + (2 / 5), 0), to: new Vector2(7, 4) },
        { from: new Vector2(1 + (3 / 5), 5), to: new Vector2(7, 9) },
        { from: new Vector2(1, 10), to: new Vector2(7, 14) }
    ]


    private _segments: Sprite[] = []

    constructor(parent_element: HTMLElement) {
        this._sprite_sheet = new SpriteSheet(5, './assets/health_bar.png', new Vector2(128, 128), 3)

        this.element = parent_element.appendChild(document.createElement('div'))
        this.element.style.position = 'absolute'
        this.element.style.overflow = 'hidden'
        this._inner_element = this.element.appendChild(document.createElement('div'))
        this._inner_element.style.height = '100%'
        this._inner_element.id = 'health-bar'
        this._inner_element.style.translate = `${11 * this._sprite_sheet.scale}px -4px` // Oh this is disgusting
    }

    public set_health(health: number): void {
        this._segments.forEach((sprite) => {
            sprite.dispose()
        })
        this._segments.length = 0

        if (GameState.MAX_HEALTH === health) return // Clear bar when no damage taken

        // Bar appears to start at tile with index 3, so add 3. Then subtract since the first frame is at 1 hp lost
        const damage_taken = GameState.MAX_HEALTH - health + 3 - 1

        const health_to_tile_width = 6

        const tile_count = Math.floor(damage_taken / health_to_tile_width)

        for (let index = 0; index < tile_count; index++) {
            this._segments.push(new Sprite(this._inner_element, this._sprite_sheet, this.HEALTH_TILE.from, this.HEALTH_TILE.to))
        }

        const remainder = Math.floor((damage_taken) % health_to_tile_width)

        const remainder_sprite = this.HEALTH_REMAINDER_TILES[remainder]

        this._segments.push(new Sprite(this._inner_element, this._sprite_sheet, remainder_sprite.from, remainder_sprite.to))
    }
}

class MessageBox {
    public animated_text: TextAnimation
    private _sprite: Sprite

    constructor(parent_element: HTMLElement, text: string) {
        this._sprite = new Sprite(parent_element, GridObject.object_sheet, new Vector2(14, 39), new Vector2(29, 41))
        set_translation(this._sprite.element, GridObject.object_sheet.tile_size, 0, 9)
        const text_element = this._sprite.element.appendChild(document.createElement('div'))
        text_element.id = 'message-text'
        text_element.className = 'inverted-text'
        set_translation(text_element, GridObject.object_sheet.tile_size, 1, (2 / 8))
        this.animated_text = animate_text(text_element, text)
    }

    public dispose(): void {
        this._sprite.dispose()
    }
}

type ModifierCost = [GridObject, number][]
class Modifier {
    constructor(public cost: ModifierCost) {

    }

    public can_afford(): boolean {
        let can_afford_modifier = true
        this.cost.forEach((value) => {
            console.log("Checking count of ", value[0].name, "Have", Collection.get_item_count(value[0]), "Need", value[1])
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

class DropRateModifier extends Modifier {
    constructor(modifier_cost: ModifierCost, private _increases: Map<string, number>) {
        super(modifier_cost)
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

class LootPoolModifier extends Modifier {
    constructor(modifier_cost: ModifierCost, private _loot_pool_map: Map<LootPool, LootPool>) {
        super(modifier_cost)
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

class PlateModifier extends Modifier {
    constructor(modifier_cost: ModifierCost) {
        super(modifier_cost)
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

export class MiningGrid {
    public game_state: GameState

    public added_items: ActiveObject[] = []
    public on_game_end?: (game_state: GameState) => void
    public on_game_start?: (objects: ActiveObject[]) => void
    public on_version_selected?: (version: GameVersion) => void

    private readonly HEIGHT = 10
    private readonly WIDTH = 13

    private _postgame_title?: HTMLElement
    private _postgame_progress?: ProgressBar
    private _container_element: HTMLDivElement
    private _sprite_sheet: SpriteSheet
    private _grid_element: HTMLDivElement
    private _background_sprite: Sprite
    private _cells: Array<Array<Cell>> = []
    private _hammer: Hammer
    private _hammer_type: HammerType = HammerType.LIGHT
    private _health_bar: HealthBar
    private _transition_element?: HTMLElement | undefined
    private _active_modifier: Modifier
    private get transition_element(): HTMLElement | undefined {
        return this._transition_element
    }
    private set transition_element(value: HTMLElement | undefined) {
        if (this._transition_element) this._transition_element.remove()
        this._transition_element = value
    }
    private game_over_internal(): void {
        this.on_game_end?.(this.game_state)

        this.clear_screen_shakes()

        const item_obtained_messages: string[] = []
        this.added_items.forEach((item) => {
            if (item.has_been_found) {
                Collection.add_item(item.object_ref)
                item_obtained_messages.push(`You obtained ${item.object_ref.genus} ${item.object_ref.name}!`)
            }
        })

        let on_new_game = (): void => {
            const modifier_interface = this.create_modifier_interface()
            this._background_sprite.element.appendChild(modifier_interface.element)
            modifier_interface.on_finalize = (): void => {
                this.reset_board()
            }
        }

        if (!Progress.postgame) {
            const progress_bar_update = this.update_progress_bar()
            console.log("Checking postgame", progress_bar_update)
            if (progress_bar_update) {
                Progress.postgame = true
                this._postgame_progress?.dispose()
                this._postgame_title?.remove()
                // Enter postgame, play some animation
                on_new_game = (): void => {
                    this.display_messages([
                        "You've discovered all item types!",
                        "You have entered the postgame",
                        "This means a greater variety\nof items will be available",
                        "Good luck!"
                    ]).on_completed = (): void => {
                        this.reset_board()
                    }
                }
            }
        }
        else if (!Progress.finished_collection) {
            let collection_completed = true
            const all_items = trim_duplicates(get_all_objects())
            for (let index = 0; index < all_items.length; index++) {
                const element = all_items[index]
                if (Collection.get_item_count(element) === 0) {
                    collection_completed = false
                    break
                }
            }
            console.log("Check progression", collection_completed)

            if (collection_completed) {
                Progress.finished_collection = true
                on_new_game = (): void => {
                    this.display_messages([
                        "You've completed your collection",
                        "Congratulations!",
                        "Very few people ever reach this point",
                        "Thanks for playing!",
                        "What's left to do?",
                        "Well...",
                        "Try getting 10 of each item?",
                        "Or contribute to the project\nand expand the game!",
                        "Anyway, thanks again\nand havea good day!"
                    ]).on_completed = (): void => {
                        this.reset_board()
                    }
                }
            }
        }

        const failed_transition_duration = 2000
        if (this.game_state.failed) {
            const screen_shake_duration = ((failed_transition_duration) / GLOBAL_FRAME_RATE) + SHUTTER_ANIMATION_FRAMES + 1
            this.screen_shake(screen_shake_duration, 3)

            this._game_over_timeout = setTimeout(() => {
                this.transition_element = shutter_animation(this._background_sprite.element, true)
                setTimeout(() => {
                    this.display_messages([ "The wall collapsed!", ...item_obtained_messages ]).on_completed = (): void => {
                        setTimeout(() => {
                            on_new_game()
                        }, 8 * GLOBAL_FRAME_RATE)
                    }
                }, SHUTTER_ANIMATION_FRAMES * GLOBAL_FRAME_RATE)
            }, failed_transition_duration)
        }
        else {
            this._game_over_timeout = setTimeout(() => {
                this.display_messages([ "Everything was dug up!", ...item_obtained_messages ]).on_completed = (): void => {
                    this.transition_element = circle_animation(this._background_sprite.element, true)
                    setTimeout(() => {
                        on_new_game()
                    }, (CIRCLE_ANIMATION_FRAMES + 8) * GLOBAL_FRAME_RATE)
                }
            }, 1000)
        }
    }

    private _game_over_timeout?: NodeJS.Timeout

    constructor(private _parent: HTMLDivElement) {
        this._container_element = this._parent.appendChild(document.createElement('div'))
        this._container_element.id = 'board'

        this._sprite_sheet = new SpriteSheet(16, './assets/board_sheet.png', new Vector2(512, 512), 3)
        const tile_size = this._sprite_sheet.tile_size
        this._background_sprite = new Sprite(this._container_element, this._sprite_sheet, new Vector2(5, 9), new Vector2(20, 20))
        this._background_sprite.element.style.zIndex = '-1'

        const light_hammer_button = new HammerButton(
            this._background_sprite.element, this._sprite_sheet, HammerType.LIGHT,
            (hammer_type) => {
                if (!this.game_state.is_over) {
                    this.set_hammer_type(hammer_type)
                    heavy_hammer_button.set_depressed()
                    return true
                }
                return false
            }
        )
        light_hammer_button.sprite.element.id = 'hammer-button'
        light_hammer_button.set_pressed()
        set_translation(light_hammer_button.sprite.element, tile_size, 13 + (1 / 8), 7 + (4 / 8))

        const heavy_hammer_button = new HammerButton(
            this._background_sprite.element, this._sprite_sheet, HammerType.HEAVY,
            (hammer_type) => {
                if (!this.game_state.is_over) {
                    this.set_hammer_type(hammer_type)
                    light_hammer_button.set_depressed()
                    return true
                }
                return false
            }
        )
        heavy_hammer_button.sprite.element.id = 'hammer-button'
        set_translation(heavy_hammer_button.sprite.element, tile_size, 13 + (1 / 8), 3)

        this._health_bar = new HealthBar(this._background_sprite.element)

        this._health_bar.element.style.width = `${this._sprite_sheet.tile_size * 13}px`
        this._health_bar.element.style.height = `${this._sprite_sheet.tile_size * 2}px`
        this._health_bar.element.style.position = 'absolute'

        this._grid_element = this._background_sprite.element.appendChild(document.createElement('div'))
        this._grid_element.id = 'mining-grid'
        set_translation(this._grid_element, tile_size, 0, 2)

        const shadow_overlay = this._background_sprite.element.appendChild(document.createElement('div'))
        shadow_overlay.id = "overlay"
        shadow_overlay.style.zIndex = '15'
        shadow_overlay.style.boxShadow = 'inset 0 0 5em 1px rgb(0 0 0 / 78%), inset 0 0 1em 4px rgb(0 0 0)'

        this._hammer = new Hammer(this._grid_element, this._sprite_sheet)

        this._active_modifier = new Modifier([])

        for (let x_index = 0; x_index < this.WIDTH; x_index++) {
            this._cells.push([])

            for (let y_index = 0; y_index < this.HEIGHT; y_index++) {
                this._cells[x_index].push(new Cell(this._grid_element, this._sprite_sheet, x_index + 1, y_index + 1, (x, y) => this.clicked_cell(x, y)))
            }
        }

        if (!Progress.has_selected_version) {
            const version_selector = create_version_selector()
            this._background_sprite.element.appendChild(version_selector.element)
            version_selector.on_selected = (): void => {
                this.on_version_selected?.(Settings.game_version ?? GameVersion.DIAMOND)
                this.reset_board()
            }
        }


        const text = this._parent.appendChild(document.createElement('h2'))
        text.style.background = 'white'
        text.style.minWidth = '13em'
        text.style.textAlign = 'center'
        text.style.borderStyle = 'inset'
        text.innerHTML = '&zwnj;'

        this.on_game_start = (objects: ActiveObject[]): void => {
            text.innerText = `${objects.length} items detected`
        }

        this.on_game_end = (): void => {
            text.innerHTML = '&zwnj;'
        }

        if (!Progress.postgame) {
            this._postgame_title = this._parent.appendChild(document.createElement('h2'))
            this._postgame_title.className = 'inverted-text'
            this._postgame_title.innerText = 'Item types discovered'

            this._postgame_progress = new ProgressBar(this._parent, 7, this._sprite_sheet)
            this.update_progress_bar()
        }

        // Setup dummy state
        this.game_state = new GameState(this._health_bar)
    }

    private clear_screen_shakes(): void {
        this._shake_timeouts.forEach((timeout: NodeJS.Timeout) => {
            clearTimeout(timeout)
        })
        this._shake_timeouts.length = 0
    }

    private create_modifier_option(title: string, modifier: Modifier, button_class: string): { element: HTMLElement, on_click?: (applied_modifier: Modifier) => void } {
        const small_sprites = new SpriteSheet(16, './assets/object_sheet.png', new Vector2(1024, 1024), 1)
        const element = document.createElement('div')
        element.id = 'modifier-option'
        const return_value: { element: HTMLElement, on_click?: (applied_modifier: Modifier) => void } = { element: element }

        // const title = document.createElement('p')
        const item_list = element.appendChild(document.createElement('div'))
        item_list.id = 'modifier-cost'

        modifier.cost.forEach((value) => {
            new Sprite(item_list, small_sprites, value[0].start_tile, value[0].end_tile)
            if (value[1] > 1) {
                const amt_text = item_list.appendChild(document.createElement('span'))
                amt_text.innerText = `x${value[1]}`
                amt_text.classList.add('inverted-text')
            }
        })

        const button = element.appendChild(document.createElement('button'))
        button.innerText = title
        button.id = 'modifier-button'
        button.classList.add(button_class)
        button.onclick = (): void => return_value.on_click?.(modifier)

        return return_value
    }

    private create_modifier_interface(): { element: HTMLElement, on_finalize?: () => void } {
        const element = document.createElement('div')
        element.classList.add('simple-overlay')
        element.id = 'modifier-screen'
        element.style.zIndex = '13'
        element.style.width = '90%'
        element.style.height = '90%'
        element.style.margin = '5%'

        const return_element: { element: HTMLElement, on_finalize?: () => void } = { element: element }

        function finalize_selection(): void {
            element.remove()
            return_element.on_finalize?.()
        }

        let modifier_count = 0
        const add_if_affordable = (modifier: Modifier, title: string, button_class: string): void => {
            if (modifier.can_afford()) {
                modifier_count++
                console.log("Can afford", modifier)
                const modifier_element = this.create_modifier_option(title, modifier, button_class)
                element.appendChild(modifier_element.element)
                modifier_element.on_click = (new_mod: Modifier): void => {
                    new_mod.purchase()
                    this._active_modifier = new_mod
                    finalize_selection()
                }
            }
        }

        const item_modifier_increases
        = new Map<string, number>(ITEMS.map((item) => [ item.name, item.rarity.get_rate(Settings.get_lootpool()) > 0 ? 100 : 0 ]))
        // Costs red spheres
        const item_modifier_small = new DropRateModifier([ [ SMALL_SPHERES[1], 6 ] ], item_modifier_increases)
        const item_modifier_large = new DropRateModifier([ [ LARGE_SPHERES[1], 2 ] ], item_modifier_increases)

        // Costs blue spheres
        const stone_modifier_increases
        // Only incraese if normal rate isn't 0
        = new Map<string, number>([ ...EVOLUTION_STONES, ...WEATHER_STONES ].map((item) => [ item.name, item.rarity.get_rate(Settings.get_lootpool()) > 0 ? 100 : 0 ]))
        const stone_modifier_small = new DropRateModifier([ [ SMALL_SPHERES[2], 6 ] ], stone_modifier_increases)
        const stone_modifier_large = new DropRateModifier([ [ LARGE_SPHERES[2], 2 ] ], stone_modifier_increases)

        // Costs green spheres
        const fossil_modifier_increases
        // Only increase if normal rate isn't 0
        = new Map<string, number>(FOSSILS.map((item) => [ item.name, item.rarity.get_rate(Settings.get_lootpool()) > 0 ? 100 : 0 ]))
        const fossil_modifier_small = new DropRateModifier([ [ SMALL_SPHERES[0], 6 ] ], fossil_modifier_increases)
        const fossil_modifier_large = new DropRateModifier([ [ LARGE_SPHERES[0], 2 ] ], fossil_modifier_increases)

        const plate_modifier = new PlateModifier(SHARDS.map((shard) => [ shard, 1 ]))

        const loot_pool_mapping = new Map<LootPool, LootPool>([
            [ LootPool.POST_DEX_DIAMOND, LootPool.POST_DEX_PEARL ],
            [ LootPool.POST_DEX_PEARL, LootPool.POST_DEX_DIAMOND ],
            [ LootPool.PRE_DEX_DIAMOND, LootPool.PRE_DEX_PEARL ],
            [ LootPool.PRE_DEX_PEARL, LootPool.PRE_DEX_DIAMOND ]
        ])

        console.log(plate_modifier)

        const version = Settings.get_squashed_version()
        const small_opposing_sphere = version === GameVersion.DIAMOND ? SMALL_SPHERES[4] : SMALL_SPHERES[3]
        const large_opposing_sphere = version === GameVersion.DIAMOND ? LARGE_SPHERES[4] : LARGE_SPHERES[3]
        const version_modifier_small = new LootPoolModifier([ [ small_opposing_sphere, 3 ] ], loot_pool_mapping)
        const version_modifier_large = new LootPoolModifier([ [ large_opposing_sphere, 1 ] ], loot_pool_mapping)

        add_if_affordable(item_modifier_small, 'Increase items', 'pearl')
        add_if_affordable(item_modifier_large, 'Increase items', 'pearl')
        add_if_affordable(stone_modifier_small, 'Increase stones', 'diamond')
        add_if_affordable(stone_modifier_large, 'Increase stones', 'diamond')
        add_if_affordable(fossil_modifier_small, 'Increase fossils', 'platinum')
        add_if_affordable(fossil_modifier_large, 'Increase fossils', 'platinum')
        add_if_affordable(plate_modifier, 'Increase plates', 'pearl')

        const opposing_button_class = version === GameVersion.DIAMOND ? 'pearl' : 'diamond'
        add_if_affordable(version_modifier_small, 'Spacetime rift?', opposing_button_class)
        add_if_affordable(version_modifier_large, 'Spacetime rift?', opposing_button_class)

        if (modifier_count === 0) {
            const no_modifier_count = element.appendChild(document.createElement('h2'))
            no_modifier_count.classList.add('inverted-text')
            no_modifier_count.innerText = 'No affordable modifiers'
        }

        const finalize_button = element.appendChild(document.createElement('button'))
        finalize_button.innerText = 'Continue'
        finalize_button.id = 'finalize-button'
        finalize_button.onclick = finalize_selection

        return return_element
    }

    private update_progress_bar(): boolean {
        if (!this._postgame_progress) return true
        let category_count = 0, total_count = 0

        function found_any(objects: GridObject[]): void {
            total_count++
            for (let index = 0; index < objects.length; index++) {
                const element = objects[index]
                if (Collection.get_item_count(element) > 0) {
                    category_count++
                    return
                }
            }
        }

        found_any([ ...SMALL_SPHERES, ...LARGE_SPHERES ])
        found_any(FOSSILS)
        found_any(EVOLUTION_STONES)
        found_any(SHARDS)
        found_any(WEATHER_STONES)
        found_any(ITEMS)
        found_any(PLATES)

        this._postgame_progress.set_progress(category_count)

        return category_count >= total_count
    }

    public reset_board(): void {
        clearTimeout(this._game_over_timeout)
        this.clear_screen_shakes()
        this.clear_board()
        this.setup_terrain()
        this.populate_board()
        this.game_state = new GameState(this._health_bar)
        this.transition_element = circle_animation(this._background_sprite.element, false)
        this.transition_element.style.width = this._background_sprite.element.style.width
        this.transition_element.style.height = this._background_sprite.element.style.height
        this.on_game_start?.(this.added_items)
    }

    public set_hammer_type(hammer_type: HammerType): void {
        this._hammer_type = hammer_type
    }

    private clear_board(): void {
        for (let x_index = 0; x_index < this.WIDTH; x_index++) {
            for (let y_index = 0; y_index < this.HEIGHT; y_index++) {
                const cell = this._cells[x_index][y_index]
                cell.clear_object()
            }
        }
    }

    private setup_terrain(): void {
        const noise = new Noise.SimplexNoise()
        const seed = Math.random()
        function sample_noise(x: number, y: number): number {
            let scale = 10
            let noise_val = (noise.noise3d(x / scale, y / scale, seed) + 1) / 2
            scale = 16
            noise_val += noise.noise3d(x / scale, y / scale, seed) * 0.3
            scale = 23
            noise_val += noise.noise3d(x / scale, y / scale, seed) * 0.15
            // Use 0.99 to prevent hitting the ceiling
            return Math.min(0.99, Math.max(0, noise_val))
        }
        for (let x_index = 0; x_index < this.WIDTH; x_index++) {
            for (let y_index = 0; y_index < this.HEIGHT; y_index++) {
                const cell = this._cells[x_index][y_index]
                cell.level = 2 + (Math.floor((sample_noise(x_index, y_index) * 3)) * 2)
                // cell.level = 0
            }
        }
    }

    private populate_board(): void {
        // Information source: https://bulbapedia.bulbagarden.net/wiki/Underground#Item_appearances
        // Chance is rolled out of total weight of all weights
        // 2-4 items can appear during a session
        // There are two binary factors deciding which rate items appear at
        // - Version or Parity: Diamond or Pearl, or the Parity of the Trainer ID in Platinum
        // - Pre or Post National Pokédex: Has the player received the National Pokédex?
        // I'm not sure which is the best way to implement this currently, perhaps allowing choice of game
        // otherwise taking some Device-specific value and going from there
        // We assume a number is rolled from 2-4 which determines how many items will appear in the grid
        // According to Bulbapedia, an item placement attempt is made. If it fails, a new item is rolled
        // We're not going to do that, instead we're gonna get all valid positions and place in one of those at random
        // Also, all items can appear any amount of times EXCEPT Plates. So we do a reroll if that happens

        const loot_pool = this._active_modifier.modify_loot_pool(Settings.get_lootpool())

        let elegible_items: GridObject[] = get_all_objects()
        if (this._active_modifier instanceof PlateModifier) {
            elegible_items = [ ...PLATES ]
        }

        elegible_items = elegible_items.filter((item) => PLATES.includes(item) && Collection.get_item_count(item) > 0)

        // Emergency fallback, if for example all elegible items were plates and all plates have been found
        if (elegible_items.length === 0) {
            elegible_items = get_all_objects()
        }

        let total_chance = 0
        elegible_items.forEach((item) => {
            total_chance += this._active_modifier.modify_rate(item, item.rarity.get_rate(loot_pool))
        })

        const random_item = (): GridObject => {
            const roll = Math.floor(Math.random() * total_chance)
            let accumulation = 0
            console.log("Starting roll", roll, "Total chance", total_chance)

            for (let index = 0; index < elegible_items.length; index++) {
                const item = elegible_items[index]
                console.log(
                    "Accumulating", item.name,
                    "Value", this._active_modifier.modify_rate(item, item.rarity.get_rate(loot_pool)), "Original value:", item.rarity.get_rate(loot_pool)
                )
                accumulation += this._active_modifier.modify_rate(item, item.rarity.get_rate(loot_pool))
                if (accumulation > roll) {
                    console.log("Accumulation finished at accumulation", accumulation, ", returned item", item.name)
                    return item
                }
            }

            return elegible_items[0] // We should NEVER get here, in theory
        }

        const item_count = this._active_modifier.modify_item_amount(2 + random_in_range(0, 2, true))

        this.added_items = []

        for (let index = 0; index < item_count; index++) {
            // Filter out plates that have already been added
            const disallowed_items: GridObject[] = [
                ...this.added_items.filter((item) => PLATES.includes(item.object_ref)).map((item) => item.object_ref) // No duplicate of plates
            ]

            let found_item: GridObject

            do {
                found_item = random_item()
            } while (disallowed_items.some((item) => found_item === item))

            const result = this.try_add_object_at_random_valid_position(found_item)
            if (result) {
                this.added_items.push(new ActiveObject(found_item, result))
            }
        }

        const bedrock_count = Math.floor(Math.pow(Math.random() * 8, 0.5)) + 4

        for (let index = 0; index < bedrock_count; index++) {
            this.try_add_object_at_random_valid_position(random_element(BEDROCK_OBJECTS))
        }

        this._active_modifier = new Modifier([])
        console.log(this.added_items)

        this.display_messages([ `Something pinged in the wall!\n${this.added_items.length} confirmed!` ])
    }

    private display_messages(messages: string[], instant: boolean = false): { on_completed?: () => void } {
        const return_value: { on_completed?: () => void } = { on_completed: undefined }
        const overlay = this._background_sprite.element.appendChild(document.createElement('div'))
        overlay.style.zIndex = '10'
        overlay.id = 'message-overlay'
        let current_message: MessageBox | undefined = undefined
        overlay.onclick = (): void => {
            if (current_message) {
                if (current_message.animated_text.completed) {
                    next_message()
                }
                else {
                    current_message.animated_text.skip()
                }
            }
        }
        let index = 0
        function next_message(): void {
            if (index >= messages.length) {
                return_value.on_completed?.()
                overlay.remove()
            }
            else {
                if (current_message) current_message.dispose()
                current_message = new MessageBox(overlay, messages[index])
                if (instant) current_message.animated_text.skip()
                index += 1
            }
        }
        next_message()

        return return_value
    }

    private get_object_positions(object: GridObject, position: Vector2): Vector2[] {
        const output: Vector2[] = []
        for (let x_index = 0; x_index < object.extents.x; x_index++) {
            for (let y_index = 0; y_index < object.extents.y; y_index++) {
                if (object.collision[y_index]?.[x_index]) {
                    output.push(position.add(new Vector2(x_index, y_index)))
                }
            }
        }
        return output
    }

    private test_object_placement(object: GridObject, position: Vector2): boolean {
        const positions = this.get_object_positions(object, position)
        for (let index = 0; index < positions.length; index++) {
            const pos = positions[index]

            const target_cell = this._cells[pos.x]?.[pos.y]
            if (!target_cell) {
                return false
            }

            if (target_cell.content !== ContentType.NOTHING) {
                return false
            }
        }

        return true
    }

    private get_all_valid_object_positions(object: GridObject): Vector2[] {
        const output: Vector2[] = []
        for (let x_index = 0; x_index < this._cells.length; x_index++) {
            const cell_row = this._cells[x_index]
            for (let y_index = 0; y_index < cell_row.length; y_index++) {
                if (this.test_object_placement(object, new Vector2(x_index, y_index))) {
                    output.push(new Vector2(x_index, y_index))
                }
            }
        }
        return output
    }

    private add_object_to_grid(object: GridObject, position: Vector2): void {
        this.get_object_positions(object, position).forEach((pos) => {
            const local_object_position = pos.subtract(position)
            if (object.collision[local_object_position.y]?.[local_object_position.x]) {
                const target_cell = this._cells[pos.x]?.[pos.y]
                if (target_cell) {
                    target_cell.set_object(object, object.start_tile.add(local_object_position))
                }
            }
        })
    }

    private try_add_object_at_random_valid_position(object: GridObject): Vector2 | undefined {
        const valid_positions = this.get_all_valid_object_positions(object)

        if (valid_positions.length === 0) return undefined
        const position = valid_positions[Math.floor(Math.random() * valid_positions.length)]

        this.add_object_to_grid(object, position)
        return position
    }

    private check_items_found(): void {
        let something_newly_found = false
        this.added_items.forEach(item => {
            if (!item.has_been_found) {
                const positions = this.get_object_positions(item.object_ref, item.position)
                let found = true
                for (let index = 0; index < positions.length; index++) {
                    const pos = positions[index]
                    const target_cell = this._cells[pos.x][pos.y]
                    if (target_cell.level > 0) {
                        found = false
                        break
                    }
                }

                if (found) {
                    something_newly_found = true
                    item.has_been_found = true
                    for (let index = 0; index < positions.length; index++) {
                        const pos = positions[index]
                        const target_cell = this._cells[pos.x][pos.y]
                        target_cell.play_found_animation()
                    }

                    // Play three spark animations
                    // First animation starts at frame 4
                    // Second at 9, third at 13
                    const start_frames: number[] = [ 4, 9, 13 ]

                    start_frames.forEach((frame) => {
                        setTimeout(() => {
                            // Play a spark within the bounds of the found item
                            const spark_element = play_item_found_spark(this._grid_element, this._sprite_sheet)
                            const offset = random_element(positions)
                            offset.x -= 0.5
                            offset.y -= 0.5
                            offset.x += Math.floor(random_in_range(-8, 8, true)) / 16
                            offset.y += Math.floor(random_in_range(-8, 8, true)) / 16
                            set_translation(spark_element, this._sprite_sheet.tile_size, offset.x, offset.y)
                        }, GLOBAL_FRAME_RATE * frame)
                    })
                }
            }
        })

        if (something_newly_found) {
            const all_found = this.added_items.every((item) => item.has_been_found)
            if (all_found) {
                this.game_state.is_over = true
                this.game_over_internal()
            }
        }
    }

    private _shake_timeouts: NodeJS.Timeout[] = []
    private screen_shake(frame_duration: number, magnitude: number): void {
        if (!Settings.screen_shake) return
        const pixel_size = this._sprite_sheet.scale

        this._shake_timeouts.forEach((timeout: NodeJS.Timeout) => {
            clearTimeout(timeout)
        })
        this._shake_timeouts.length = 0

        for (let index = 0; index < frame_duration; index++) {
            const timeout = setTimeout(() => {
                let translation = new Vector2((Math.random() * 2) - 1, (Math.random() * 2) - 1)
                translation = translation.normalize()
                translation = translation.mul(pixel_size * magnitude)
                this._background_sprite.element.style.transform
                = `translate(${Math.floor(translation.x)}px, ${Math.floor(translation.y)}px)`
            }, index * GLOBAL_FRAME_RATE)
            this._shake_timeouts.push(timeout)
        }

        const timeout = setTimeout(() => {
            this._background_sprite.element.style.transform = 'translate(0, 0)'
        }, frame_duration * GLOBAL_FRAME_RATE)
        this._shake_timeouts.push(timeout)
    }

    private clicked_cell(x_pos: number, y_pos: number): void {
        if (this.game_state.is_over) return
        const target_cell = this._cells[x_pos][y_pos]
        const result = target_cell.decrease(2)

        this._hammer.play_hammer_animation(
            new Vector2(x_pos, y_pos),
            this._hammer_type,
            result === HitResult.BOTTOM ? target_cell.content : ContentType.NOTHING
        )

        if (!(result === HitResult.BOTTOM && target_cell.content === ContentType.BEDROCK)) {
            if (this._hammer_type === HammerType.LIGHT) {
                this._cells[x_pos + 1]?.[y_pos]?.decrease()
                this._cells[x_pos - 1]?.[y_pos]?.decrease()
                this._cells[x_pos]?.[y_pos + 1]?.decrease()
                this._cells[x_pos]?.[y_pos - 1]?.decrease()
            }
            else {
                this._cells[x_pos + 1]?.[y_pos]?.decrease(2)
                this._cells[x_pos - 1]?.[y_pos]?.decrease(2)
                this._cells[x_pos]?.[y_pos + 1]?.decrease(2)
                this._cells[x_pos]?.[y_pos - 1]?.decrease(2)

                this._cells[x_pos + 1]?.[y_pos + 1]?.decrease()
                this._cells[x_pos + 1]?.[y_pos - 1]?.decrease()
                this._cells[x_pos - 1]?.[y_pos + 1]?.decrease()
                this._cells[x_pos - 1]?.[y_pos - 1]?.decrease()
            }

            this.check_items_found()
        }

        if (!this.game_state.is_over) {
            const health_result = this.game_state.reduce_health(this._hammer_type === HammerType.LIGHT ? 1 : 2)

            if (!health_result) {
                this.game_over_internal()
            }
            else {
                const damage_taken = GameState.MAX_HEALTH - this.game_state.health

                const shake_length = Math.floor((damage_taken / 5))
                const shake_magnitude = (Math.floor(damage_taken / (this._hammer_type === HammerType.LIGHT ? 25 : 18))) + 1

                if (shake_length > 0) {
                    this.screen_shake(shake_length, shake_magnitude)
                }
            }
        }
    }
}