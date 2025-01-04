import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'
import { BEDROCK_OBJECTS, ContentType, EVOLUTION_STONES, FOSSILS, get_all_objects, GridObject, ITEMS, LARGE_SPHERES, PLATES, SHARDS, SMALL_SPHERES, trim_duplicates, WEATHER_STONES } from "./objects"
import { random_element } from "../utils/array_utils"
import { random_in_range } from "../utils/random"
import { GLOBAL_FRAME_RATE, Hammer, HammerType, play_item_found_spark } from "./animations"
import { HammerButton } from "./hammer_button"
import { set_translation } from "../utils/dom_util"
import { circle_animation, CIRCLE_ANIMATION_FRAMES, shutter_animation, SHUTTER_ANIMATION_FRAMES } from "../components/screen_transition"
import { GameVersion, Progress, Settings, Statistics } from "./settings"
import { Collection } from "./collection"
import { create_version_selector } from "./version_selector"
import { ProgressBar } from "../components/progress_bar"
import { create_active_modifier_element, Modifier, Modifiers, PlateModifier } from "./modifier"
import { GameState, HealthBar } from "./game_state"
import { MessageBox } from "../components/message_box"
import { get_weighted_random } from "../utils/weighted_randomness"
import { get_flavour_text as create_flavour_text_element } from "../components/flavour_text"

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

    private _active_modifier_element?: HTMLElement | undefined
    private _active_modifier?: Modifier
    private get_active_modifier(): Modifier {
        return this._active_modifier ?? new Modifier([], '', '')
    }
    private set_active_modifier(value: Modifier | undefined): void {
        if (this._active_modifier_element) this._active_modifier_element.remove()

        if (value) {
            this._active_modifier_element = this._parent.appendChild(create_active_modifier_element(value))
            set_translation(this._active_modifier_element, 16 * 3, 16, -0.5)
        }
        this._active_modifier = value
    }

    private get transition_element(): HTMLElement | undefined {
        return this._transition_element
    }
    private set transition_element(value: HTMLElement | undefined) {
        if (this._transition_element) this._transition_element.remove()
        this._transition_element = value
    }
    private game_over_internal(): void {
        this.on_game_end?.(this.game_state)
        Statistics.rounds_played++

        // Only reset if you failed last time
        if (this.game_state.failed || !this._active_modifier?.repeatable) {
            this.set_active_modifier(undefined)
        }
        this.clear_screen_shakes()

        const item_obtained_messages: string[] = []
        this.added_items.forEach((item) => {
            if (item.has_been_found) {
                Collection.add_item(item.object_ref)
                item_obtained_messages.push(`You obtained ${item.object_ref.genus} ${item.object_ref.name}!`)
            }
        })

        let on_new_game = (): void => {
            this.reset_board()
        }

        if (!Progress.postgame) {
            const progress_bar_update = this.update_progress_bar()
            if (progress_bar_update) {
                Progress.postgame = true
                this._postgame_progress?.dispose()
                this._postgame_title?.remove()
                // Refresh all collection items because postgame has different styling
                Collection.refresh_all_style()
                on_new_game = (): void => {
                    this.display_messages([
                        "You've discovered all item types!",
                        "You have entered the postgame.",
                        "This means a greater variety\nof items will be available.",
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

            if (collection_completed) {
                Progress.finished_collection = true
                on_new_game = (): void => {
                    this.display_messages([
                        "You've completed your collection.",
                        "Congratulations!",
                        "Very few people ever reach this point.",
                        "Thanks for playing!",
                        "What's left to do?",
                        "Well...",
                        "Try getting 10 of each item?",
                        "Or contribute to the project\nand expand the game!",
                        "Anyway, thanks again\nand have a good day!"
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
            Statistics.full_clears++
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

    private create_modifier_interface(): { element: HTMLElement, on_finalize?: () => void } {
        const parent_element = document.createElement('div')
        parent_element.classList.add('simple-overlay')
        parent_element.style.background = 'black'
        parent_element.style.zIndex = '13'
        const element = parent_element.appendChild(document.createElement('div'))
        element.id = 'modifier-screen'

        const return_element: { element: HTMLElement, on_finalize?: () => void } = { element: parent_element }

        function finalize_selection(): void {
            element.classList.add('transparent')
            element.style.scale = '0.5'
            setTimeout(() => {
                parent_element.remove()
                return_element.on_finalize?.()
            }, 300)
        }

        const add_modifier = (modifier: Modifier): void => {
            const modifier_element = modifier.create_modifier_option()
            element.appendChild(modifier_element.element)
            modifier_element.on_click = (new_mod: Modifier): void => {
                Statistics.modifiers_purchased++
                new_mod.purchase()
                this.set_active_modifier(new_mod)
                finalize_selection()
            }
        }

        const shop_title_text = element.appendChild(document.createElement('h3'))
        shop_title_text.classList.add('inverted-text')
        shop_title_text.style.width = '100%'
        shop_title_text.style.textAlign = 'center'
        shop_title_text.style.marginTop = '0.5em'
        shop_title_text.innerText = 'Welcome to the modifier shop!'

        let affordable_modifier_count = 0
        if (!this._active_modifier) {
            const guaranteed_modifiers = Modifiers.get_guaranteed_modifiers()
            const random_modifiers = Modifiers.get_optional_modifiers()
            const added_random_modifiers: Modifier[] = []

            random_modifiers.forEach((modifier) => { if (modifier.can_afford()) affordable_modifier_count++ })

            console.log(affordable_modifier_count)

            let modifiers_to_generate = 0
            if (affordable_modifier_count < 2) {
                modifiers_to_generate = 0
            }
            else if (affordable_modifier_count < 4 && affordable_modifier_count > 2) {
                modifiers_to_generate = 2
            }
            else if (affordable_modifier_count < 6) {
                modifiers_to_generate = 3
            }
            else if (affordable_modifier_count < 8) {
                modifiers_to_generate = 4
            }
            else if (affordable_modifier_count >= 8) {
                modifiers_to_generate = 5
            }

            for (let index = 0; index < modifiers_to_generate; index++) {
                if (random_modifiers.length === 0) break
                const random_modifier = get_weighted_random(random_modifiers, { postgame: Progress.postgame })
                added_random_modifiers.push(random_modifier)
                random_modifiers.splice(random_modifiers.indexOf(random_modifier), 1)
            }

            const modifiers = [ ...guaranteed_modifiers, ...added_random_modifiers ]

            modifiers.forEach((modifier) => { add_modifier(modifier) })
        }

        element.appendChild(create_flavour_text_element(this._active_modifier, affordable_modifier_count))

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

        const modifier_interface = this.create_modifier_interface()
        this._background_sprite.element.appendChild(modifier_interface.element)
        modifier_interface.on_finalize = (): void => {
            this.clear_screen_shakes()
            this.clear_board()
            this.setup_terrain()
            this.populate_board()
            this.game_state = new GameState(this._health_bar)
            this.transition_element = circle_animation(this._background_sprite.element, false)
            this.on_game_start?.(this.added_items)
        }
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

        const active_modifier = this.get_active_modifier()

        const loot_pool = active_modifier.modify_loot_pool(Settings.get_lootpool())

        let elegible_items: GridObject[] = get_all_objects()
        if (active_modifier instanceof PlateModifier) {
            elegible_items = [ ...PLATES ]
        }

        // If a plate, and collection contains at least one, remove from elegible items
        elegible_items = elegible_items.filter((item) => !(PLATES.includes(item) && Collection.get_item_count(item) > 0))

        // Emergency fallback, if for example all elegible items were plates and all plates have been found
        if (elegible_items.length === 0) {
            console.warn("No elegible items! This might be an error, perhaps plate modifier was available when it shouldn't have been")
            elegible_items = get_all_objects()
        }

        const item_count = active_modifier.modify_item_amount(2 + random_in_range(0, 2, true))

        this.added_items = []

        for (let index = 0; index < item_count; index++) {
            // Filter out plates that have already been added
            const disallowed_items: GridObject[] = [
                ...this.added_items.filter((item) => PLATES.includes(item.object_ref)).map((item) => item.object_ref) // No duplicate of plates
            ]

            let found_item: GridObject

            do {
                found_item = get_weighted_random(elegible_items, loot_pool)
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
                current_message = new MessageBox(overlay, messages[index], GridObject.object_sheet)
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

        // Statistics
        if (this._hammer_type === HammerType.HEAVY) {
            Statistics.heavy_hammer_hits++
        }
        else {
            Statistics.light_hammer_hits++
        }

        if (result === HitResult.BOTTOM) {
            switch (target_cell.content) {
                case ContentType.BEDROCK:
                    Statistics.times_hit_bedrock++
                    break
                case ContentType.ITEM:
                    Statistics.times_hit_items++
                    break
                case ContentType.NOTHING:
                    Statistics.times_hit_nothing++
                    break
                default:
                    break
            }
        }


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