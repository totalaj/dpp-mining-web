import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'
import { BEDROCK_OBJECTS, ContentType, EVOLUTION_STONES, FOSSILS, GridObject, ITEMS, LARGE_SPHERES, PLATES, SHARDS, SMALL_SPHERES, WEATHER_STONES } from "./objects"
import { random_element } from "../utils/array_utils"
import { random_in_range } from "../utils/random"
import { animate_text, GLOBAL_FRAME_RATE, Hammer, HammerType, play_item_found_spark, TextAnimation } from "./animations"
import { HammerButton } from "./hammer_button"
import { set_translation } from "../utils/dom_util"
import { circle_animation, CIRCLE_ANIMATION_FRAMES, shutter_animation, SHUTTER_ANIMATION_FRAMES } from "../components/screen_transition"
import { Settings } from "./settings"
import { Collection } from "./collection"

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

export class MiningGrid {
    public game_state: GameState

    public added_items: ActiveObject[] = []
    public on_game_end?: (game_state: GameState) => void
    public on_game_start?: (objects: ActiveObject[]) => void

    private readonly HEIGHT = 10
    private readonly WIDTH = 13

    private _container_element: HTMLDivElement
    private _sprite_sheet: SpriteSheet
    private _grid_element: HTMLDivElement
    private _background_sprite: Sprite
    private _cells: Array<Array<Cell>> = []
    private _hammer: Hammer
    private _hammer_type: HammerType = HammerType.LIGHT
    private _health_bar: HealthBar
    private _transition_element?: HTMLElement | undefined
    private get transition_element(): HTMLElement | undefined {
        return this._transition_element
    }
    private set transition_element(value: HTMLElement | undefined) {
        if (this._transition_element) this._transition_element.remove()
        this._transition_element = value
    }
    private _game_over_internal: () => void
    private _game_over_timeout?: NodeJS.Timeout

    constructor(private _parent: HTMLDivElement) {
        this._game_over_internal = (): void => {
            console.log("Game over internal", this.game_state)
            this.on_game_end?.(this.game_state)

            const item_obtained_messages: string[] = []
            this.added_items.forEach((item) => {
                if (item.has_been_found) {
                    Collection.add_item(item.object_ref)
                    item_obtained_messages.push(`You obtained ${item.object_ref.genus} ${item.object_ref.name}!`)
                }
            })
            this.clear_screen_shakes()

            const failed_transition_duration = 2000
            if (this.game_state.failed) {
                const screen_shake_duration = ((failed_transition_duration) / GLOBAL_FRAME_RATE) + SHUTTER_ANIMATION_FRAMES + 1
                this.screen_shake(screen_shake_duration, 3)

                this._game_over_timeout = setTimeout(() => {
                    this.transition_element = shutter_animation(this._background_sprite.element, true)
                    setTimeout(() => {
                        this.display_messages([ "The wall collapsed!", ...item_obtained_messages ]).on_completed = (): void => {
                            setTimeout(() => {
                                this.reset_board()
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
                            this.reset_board()
                        }, (CIRCLE_ANIMATION_FRAMES + 8) * GLOBAL_FRAME_RATE)
                    }
                }, 1000)
            }
        }

        this._container_element = this._parent.appendChild(document.createElement('div'))
        this._container_element.style.overflow = 'hidden'

        this._sprite_sheet = new SpriteSheet(16, './assets/board_sheet.png', new Vector2(512, 512), 3)
        const tile_size = this._sprite_sheet.tile_size
        this._background_sprite = new Sprite(this._container_element, this._sprite_sheet, new Vector2(5, 9), new Vector2(20, 20))
        this._background_sprite.element.style.zIndex = '-1'

        this.transition_element = circle_animation(this._background_sprite.element, false)

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
        shadow_overlay.style.width = this._background_sprite.element.style.width
        shadow_overlay.style.height = this._background_sprite.element.style.height

        this._hammer = new Hammer(this._grid_element, this._sprite_sheet)

        for (let x_index = 0; x_index < this.WIDTH; x_index++) {
            this._cells.push([])

            for (let y_index = 0; y_index < this.HEIGHT; y_index++) {
                this._cells[x_index].push(new Cell(this._grid_element, this._sprite_sheet, x_index + 1, y_index + 1, (x, y) => this.clicked_cell(x, y)))
            }
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

        const all_items: GridObject[] = [ ...SMALL_SPHERES, ...LARGE_SPHERES, ...FOSSILS, ...EVOLUTION_STONES, ...SHARDS, ...WEATHER_STONES, ...ITEMS, ...PLATES ]
        let total_chance = 0
        all_items.forEach((item) => {
            total_chance += item.rarity.get_rate()
        })

        function random_item(): GridObject {
            const roll = Math.floor(Math.random() * total_chance)
            let accumulation = 0

            for (let index = 0; index < all_items.length; index++) {
                const item = all_items[index]
                accumulation += item.rarity.get_rate()
                if (accumulation > roll) {
                    return item
                }
            }

            return all_items[0] // We should NEVER get here, in theory
        }

        const item_count = 2 + random_in_range(0, 2, true)

        this.added_items = []

        for (let index = 0; index < item_count; index++) {
            // Filter out plates that have already been added
            const disallowed_items: GridObject[] = [
                ...this.added_items.filter((item) => PLATES.includes(item.object_ref)).map((item) => item.object_ref), // No duplicate of plates
                ...PLATES.filter((item) => Collection.get_item_count(item) > 0) // No already found plates
            ]

            console.log("Disallowed items", disallowed_items)

            let found_item: GridObject

            do {
                found_item = random_item()
                console.log("Disallowed?", found_item.name, disallowed_items.includes(found_item))
            } while (disallowed_items.some((item) => found_item === item))

            const result = this.try_add_object_at_random_valid_position(found_item)
            if (result) {
                this.added_items.push(new ActiveObject(found_item, result))
            }
        }

        this.display_messages([ `Something pinged in the wall!\n${this.added_items.length} confirmed!` ])

        const bedrock_count = Math.floor(Math.pow(Math.random() * 8, 0.5)) + 4

        for (let index = 0; index < bedrock_count; index++) {
            this.try_add_object_at_random_valid_position(random_element(BEDROCK_OBJECTS))
        }
    }

    private display_messages(messages: string[], instant: boolean = false): { on_completed?: () => void } {
        const return_value: { on_completed?: () => void } = { on_completed: undefined }
        const overlay = this._background_sprite.element.appendChild(document.createElement('div'))
        overlay.style.zIndex = '10'
        overlay.id = 'message-overlay'
        let current_message: MessageBox | undefined = undefined
        overlay.onclick = (): void => {
            console.log("Click")
            if (current_message) {
                if (current_message.animated_text.completed) {
                    next_message()
                }
                else {
                    console.log("Skipping")
                    current_message.animated_text.skip()
                }
            }
        }
        let index = 0
        function next_message(): void {
            console.log("Starting message", index)
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
                this._game_over_internal()
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
                this._game_over_internal()
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