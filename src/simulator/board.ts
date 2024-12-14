import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'
import { bedrock_objects, ContentType, evolution_stones, fossils, GridObject, items, large_spheres, plates, shards, small_speheres, weather_stones } from "./objects"
import { random_element } from "../utils/array_utils"
import { random_in_range } from "../utils/random"
import { GLOBAL_FRAME_RATE, Hammer, HammerType } from "./animations"
import { HammerButton } from "./hammer_button"
import { set_translation } from "../utils/dom_util"
import { circle_animation, shutter_animation, SHUTTER_ANIMATION_FRAMES } from "../components/screen_transition"
import { Settings } from "./settings"



enum HitResult {
    NORMAL,
    BOTTOM
}

class ActiveObject {
    public has_been_found: boolean = false
    constructor(public object_ref: GridObject, public position: Vector2) { }
}

class Cell {
    private background_sprite: Sprite
    private terrain_sprite: Sprite
    private object_sprite?: Sprite
    public element: HTMLElement
    public content: ContentType = ContentType.NOTHING

    constructor(parent_element: HTMLDivElement, private _src: SpriteSheet, public xPos: number, public yPos: number, onClick: (x : number, y : number) => void) {
        this.element = parent_element.appendChild(document.createElement('div'))
        this.background_sprite = new Sprite(this.element, this._src, new Vector2(1,0))
        this.background_sprite.element.style.zIndex = '-1'
        this.terrain_sprite = new Sprite(this.element, this._src, new Vector2(0,0))
        this.terrain_sprite.element.style.zIndex = '1'

        this.element.id = "mining-cell"
        
        if (this.element.ontouchstart) {
            this.element.ontouchstart = () => onClick(xPos-1, yPos-1)
        }
        else {
            this.element.onmousedown = () => onClick(xPos-1, yPos-1)
        }
        this.element.style.gridColumn = `${xPos}`
        this.element.style.gridRow = `${yPos}`
    }

    public set_object(object: GridObject, sprite_position: Vector2) {
        this.object_sprite = new Sprite(this.element, GridObject.object_sheet, sprite_position)
        this.content = object.content_type
    }

    public clear_object() {
        if (this.object_sprite) {
            this.element.removeChild(this.object_sprite.element)
            this.object_sprite = undefined
            this.content = ContentType.NOTHING
        }
    }

    public play_found_animation() {
        if (!this.object_sprite) {
            console.warn("Playing an animation for a non-existent object!")
            return
        }

        this.object_sprite.element.classList.add("found")
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
        this.terrain_sprite.set_tile(new Vector2(this.level !== 0 ? 1 + this._level : 0, 0))
    }

}

export class GameState {
    public static readonly max_health = 49
    is_over: boolean = false
    failed: boolean = false
    health: number = GameState.max_health

    constructor(private health_bar: HealthBar) { 
        health_bar.set_health(GameState.max_health)
    }

    reduce_health(by: number) : boolean {
        this.health = Math.max(0, this.health - by)
        this.health_bar.set_health(this.health)
        if (this.health > 0) {
            return true
        } else {
            this.is_over = true
            this.failed = true
            return false
        }
    }
}

class HealthBar {
    public element: HTMLElement
    private inner_element: HTMLElement
    
    private sprite_sheet: SpriteSheet

    private readonly health_tile = {from: new Vector2(17, 0), to:new Vector2(21 - (1 / 5), 4)}
    private readonly health_remainder_tiles = [
        {from: new Vector2(13, 0), to:new Vector2(15, 4)},
        {from: new Vector2(12, 5), to:new Vector2(15, 9)},
        {from: new Vector2(11 + (2 / 5), 10), to:new Vector2(15, 14)},
        {from: new Vector2(2 + (2 / 5), 0), to:new Vector2(7, 4)},
        {from: new Vector2(1 + (3 / 5), 5), to:new Vector2(7, 9)},
        {from: new Vector2(1, 10), to:new Vector2(7, 14)},
    ]


    private segments: Sprite[] = []
    
    constructor(parent_element: HTMLElement) {
        this.sprite_sheet = new SpriteSheet(5, './assets/health_bar.png', new Vector2(128, 128), 3)
        
        this.element = parent_element.appendChild(document.createElement('div'))
        this.element.style.position = 'absolute'
        this.element.style.overflow = 'hidden'
        this.inner_element = this.element.appendChild(document.createElement('div'))
        this.inner_element.style.height = '100%'
        this.inner_element.id = 'health-bar'
        this.inner_element.style.translate = `${11 * this.sprite_sheet.scale}px -4px` // Oh this is disgusting
    }

    public set_health(health: number) {
        this.segments.forEach((sprite) => {
            sprite.dispose()
        })
        this.segments.length = 0
        
        if (GameState.max_health === health) return // Clear bar when no damage taken
        
        // Bar appears to start at tile with index 3, so add 3. Then subtract since the first frame is at 1 hp lost
        const damage_taken = GameState.max_health - health + 3 - 1

        const health_to_tile_width = 6
        
        const tile_count = Math.floor(damage_taken / health_to_tile_width)
        
        for (let index = 0; index < tile_count; index++) {
            this.segments.push(new Sprite(this.inner_element, this.sprite_sheet, this.health_tile.from, this.health_tile.to))            
        }
        
        const remainder = Math.floor((damage_taken) % health_to_tile_width)
        
        const remainder_sprite = this.health_remainder_tiles[remainder]
        
        this.segments.push(new Sprite(this.inner_element, this.sprite_sheet, remainder_sprite.from, remainder_sprite.to))
    }
}

export class MiningGrid {
    public game_state: GameState

    public added_items: ActiveObject[] = []

    private readonly height = 10
    private readonly width = 13

    private container_element: HTMLDivElement
    private sprite_sheet: SpriteSheet
    private grid_element: HTMLDivElement
    private background_sprite: Sprite
    private cells: Array<Array<Cell>> = []
    private hammer: Hammer
    private hammer_type: HammerType = HammerType.LIGHT
    private health_bar: HealthBar
    private _transition_element?: HTMLElement | undefined
    private get transition_element(): HTMLElement | undefined {
        return this._transition_element
    }
    private set transition_element(value: HTMLElement | undefined) {
        if (this._transition_element) this._transition_element.remove()
        this._transition_element = value
    }
    private game_over_internal: () => void

    constructor(private _parent: HTMLDivElement, on_game_end: (state: GameState) => void) {
        
        this.game_over_internal = () => {
            on_game_end(this.game_state)

            this.shake_timeouts.forEach((timeout: any) => {
                clearTimeout(timeout)
            })

            const failed_transition_duration = 2000
            if (this.game_state.failed) {
                const screen_shake_duration = ((failed_transition_duration) / GLOBAL_FRAME_RATE) + SHUTTER_ANIMATION_FRAMES + 1
                this.screen_shake(screen_shake_duration, 3)
            }

            setTimeout(() => {
                if (this.game_state.failed) {
                    this.transition_element = shutter_animation(this.background_sprite.element, true)
                } else {
                    this.transition_element = circle_animation(this.background_sprite.element, true)
                }
            }, this.game_state.failed ? failed_transition_duration : 2500)
        }

        this.container_element = this._parent.appendChild(document.createElement('div'))
        this.container_element.style.overflow = 'hidden'

        this.sprite_sheet = new SpriteSheet(16, './assets/board_sheet.png', new Vector2(512, 512), 3)
        const tile_size = this.sprite_sheet.tile_size
        this.background_sprite = new Sprite(this.container_element, this.sprite_sheet, new Vector2(5,9), new Vector2(20, 20))
        this.background_sprite.element.style.zIndex = '-1'

        this.transition_element = circle_animation(this.background_sprite.element, false)

        const light_hammer_button = new HammerButton(this.background_sprite.element, this.sprite_sheet, HammerType.LIGHT,
            (hammer_type) => {
                if (hammer_type !== this.hammer_type && !this.game_state.is_over) {
                    this.set_hammer_type(hammer_type)
                    heavy_hammer_button.set_depressed() 
                    return true
                }
                return false
            })
        light_hammer_button.sprite.element.id = 'hammer-button'
        light_hammer_button.set_pressed()
        set_translation(light_hammer_button.sprite.element, tile_size, 13 + (1 / 8), 7 + (4 / 8))
        
        const heavy_hammer_button = new HammerButton(this.background_sprite.element, this.sprite_sheet, HammerType.HEAVY,
            (hammer_type) => {
                if (hammer_type !== this.hammer_type && !this.game_state.is_over) {
                    this.set_hammer_type(hammer_type)
                    light_hammer_button.set_depressed() 
                    return true
                }
                return false
            })
        heavy_hammer_button.sprite.element.id = 'hammer-button'
        set_translation(heavy_hammer_button.sprite.element, tile_size, 13 + (1 / 8), 3)
        
        this.health_bar = new HealthBar(this.background_sprite.element)

        this.health_bar.element.style.width = `${this.sprite_sheet.tile_size * 13}px`
        this.health_bar.element.style.height = `${this.sprite_sheet.tile_size * 2}px`
        this.health_bar.element.style.position = 'absolute'

        this.grid_element = this.background_sprite.element.appendChild(document.createElement('div'))
        this.grid_element.id = 'mining-grid'
        set_translation(this.grid_element, tile_size, 0, 2)

        this.hammer = new Hammer(this.grid_element, this.sprite_sheet)

        for (let xIndex = 0; xIndex < this.width; xIndex++) {
            this.cells.push([])
            
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                this.cells[xIndex].push(new Cell(this.grid_element, this.sprite_sheet, xIndex+1, yIndex+1, (x,y) => this.clickedCell(x,y)))
            }
        }



        this.setup_terrain()
        this.populate_board()
        this.game_state = new GameState(this.health_bar)
    }

    public reset_board() {
        this.clear_board()
        this.setup_terrain()
        this.populate_board()
        this.game_state = new GameState(this.health_bar)
        this.transition_element = circle_animation(this.background_sprite.element, false)
    }

    public set_hammer_type(hammer_type: HammerType) {
        this.hammer_type = hammer_type
    }

    private clear_board() {
        for (let xIndex = 0; xIndex < this.width; xIndex++) {
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                const cell = this.cells[xIndex][yIndex]
                cell.clear_object()
            }
        }
    }

    private setup_terrain() {
        const noise = new Noise.SimplexNoise()
        const seed = Math.random()
        function sample_noise(x: number, y: number): number {
            let scale = 10
            let noise_val = (noise.noise3d(x / scale, y / scale, seed) + 1 ) / 2
            scale = 16
            noise_val += noise.noise3d(x / scale, y / scale, seed) * 0.3
            scale = 23
            noise_val += noise.noise3d(x / scale, y / scale, seed) * 0.15
            // Use 0.99 to prevent hitting the ceiling
            return Math.min(0.99, Math.max(0, noise_val))
        }
        for (let xIndex = 0; xIndex < this.width; xIndex++) {
            
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                const cell = this.cells[xIndex][yIndex]
                cell.level = 2 + (Math.floor((sample_noise(xIndex, yIndex) * 3)) * 2)
                // cell.level = 0
            }
        }
    }

    private populate_board() {
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

        const all_items: GridObject[] = [...small_speheres, ...large_spheres, ...fossils, ...evolution_stones, ...shards, ...weather_stones, ...items, ...plates]
        let total_chance = 0
        all_items.forEach((item) => {
            total_chance += item.rarity.get_rate()
        })

        function random_item() : GridObject {
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
            const disallowed_items = this.added_items.filter((item) => plates.includes(item.object_ref))

            let found_item: GridObject
            
            do {
                found_item = random_item()
            } while (disallowed_items.some((item) => found_item === item.object_ref))

                const result = this.try_add_object_at_random_valid_position(found_item)
                if (result) {
                    this.added_items.push(new ActiveObject(found_item, result))
                }
        }

        const bedrock_count = Math.floor(Math.pow(Math.random() * 8, 0.5)) + 4

        for (let index = 0; index < bedrock_count; index++) {
            this.try_add_object_at_random_valid_position(random_element(bedrock_objects))
        }
    }

    private get_object_positions(object: GridObject, position: Vector2) : Vector2[] {
        const output: Vector2[] = []
        for (let xIndex = 0; xIndex < object.extents.x; xIndex++) {
            for (let yIndex = 0; yIndex < object.extents.y; yIndex++) {
                if (object.collision[yIndex]?.[xIndex]) {
                    output.push(position.add(new Vector2(xIndex, yIndex)))
                }
            }                
        }
        return output
    }

    private test_object_placement(object: GridObject, position: Vector2) : boolean {
        const positions = this.get_object_positions(object, position)
        for (let index = 0; index < positions.length; index++) {
            const pos = positions[index]
         
            const targetCell = this.cells[pos.x]?.[pos.y]
            if (!targetCell) {
                return false
            }

            if (targetCell.content !== ContentType.NOTHING) {
                return false
            }
        }

        return true
    }

    private get_all_valid_object_positions(object: GridObject) : Vector2[] {
        const output: Vector2[] = []
        for (let xIndex = 0; xIndex < this.cells.length; xIndex++) {
            const cell_row = this.cells[xIndex]
            for (let yIndex = 0; yIndex < cell_row.length; yIndex++) {
                const cell = cell_row[yIndex]
                if (this.test_object_placement(object, new Vector2(xIndex, yIndex))) {
                    output.push(new Vector2(xIndex, yIndex))
                }
            }
        }
        return output
    }

    private add_object_to_grid(object: GridObject, position: Vector2) : void {
        this.get_object_positions(object, position).forEach((pos) => {
            const local_object_position = pos.subtract(position)
            if (object.collision[local_object_position.y]?.[local_object_position.x]) {

                const targetCell = this.cells[pos.x]?.[pos.y]
                if (targetCell) {
                    targetCell.set_object(object, object.start_tile.add(local_object_position))
                }
            }
        })
    }

    private try_add_object_at_random_valid_position(object: GridObject) : Vector2 | undefined {
        const valid_positions = this.get_all_valid_object_positions(object)
        
        if (valid_positions.length === 0) return undefined
        const position = valid_positions[Math.floor(Math.random() * valid_positions.length)]

        this.add_object_to_grid(object, position)
        return position
    }
    
    private check_items_found() {
        let something_newly_found = false
        this.added_items.forEach(item => {
            if (!item.has_been_found) {
                const positions = this.get_object_positions(item.object_ref, item.position)
                let found = true
                for (let index = 0; index < positions.length; index++) {
                    const pos = positions[index]
                    const targetCell = this.cells[pos.x][pos.y]
                    if (targetCell.level > 0) {
                        found = false
                        break
                    }
                }

                if (found) {
                    something_newly_found = true
                    item.has_been_found = true
                    for (let index = 0; index < positions.length; index++) {
                        const pos = positions[index]
                        const targetCell = this.cells[pos.x][pos.y]
                        targetCell.play_found_animation()
                    }
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

    private shake_timeouts: any = []
    private screen_shake(frame_duration: number, magnitude: number) {
        if (!Settings.screen_shake) return
        const pixel_size = this.sprite_sheet.scale
        
        this.shake_timeouts.forEach((timeout: any) => {
            clearTimeout(timeout)
        })
        this.shake_timeouts.length = 0

        console.log("Starting screen shake, duration", frame_duration, "f magnitude", magnitude, "px")

        for (let index = 0; index < frame_duration; index++) {
            const timeout = setTimeout(() => {
                let translation = new Vector2((Math.random() * 2) - 1, (Math.random() * 2) - 1)
                translation = translation.normalize()
                translation = translation.mul(pixel_size * magnitude)
                this.background_sprite.element.style.transform = 
                `translate(${Math.floor(translation.x)}px, ${Math.floor(translation.y)}px)`
            }, index * GLOBAL_FRAME_RATE)
            this.shake_timeouts.push(timeout)
        }

        const timeout = setTimeout(() => {
            this.background_sprite.element.style.transform = 'translate(0, 0)'
        }, frame_duration * GLOBAL_FRAME_RATE)
        this.shake_timeouts.push(timeout)
    }

    private clickedCell(xPos: number, yPos: number) {
        if (this.game_state.is_over) return
        const targetCell = this.cells[xPos][yPos]
        const result = targetCell.decrease(2)

        this.hammer.play_hammer_animation(
            new Vector2(xPos, yPos), 
            this.hammer_type, 
            result === HitResult.BOTTOM ? targetCell.content : ContentType.NOTHING)

        if (!(result === HitResult.BOTTOM && targetCell.content === ContentType.BEDROCK)) {
            if (this.hammer_type === HammerType.LIGHT) {   
                this.cells[xPos + 1]?.[yPos]?.decrease()
                this.cells[xPos - 1]?.[yPos]?.decrease()
                this.cells[xPos]?.[yPos + 1]?.decrease()
                this.cells[xPos]?.[yPos - 1]?.decrease()
            } else {
                this.cells[xPos + 1]?.[yPos]?.decrease(2)
                this.cells[xPos - 1]?.[yPos]?.decrease(2)
                this.cells[xPos]?.[yPos + 1]?.decrease(2)
                this.cells[xPos]?.[yPos - 1]?.decrease(2)
                
                this.cells[xPos + 1]?.[yPos + 1]?.decrease()
                this.cells[xPos + 1]?.[yPos - 1]?.decrease()
                this.cells[xPos - 1]?.[yPos + 1]?.decrease()
                this.cells[xPos - 1]?.[yPos - 1]?.decrease()
            }
            
            this.check_items_found()
        }
            
        const health_result = this.game_state.reduce_health(this.hammer_type === HammerType.LIGHT ? 1 : 2)

        if (!health_result) {
            this.game_over_internal()
        } else if (!this.game_state.is_over) {
            const damage_taken = GameState.max_health - this.game_state.health
    
            const shake_length = Math.floor((damage_taken / 5))
            const shake_magnitude = (Math.floor(damage_taken / (this.hammer_type === HammerType.LIGHT ? 25 : 18))) + 1
    
            if (shake_length > 0) {
                this.screen_shake(shake_length, shake_magnitude)
            }
        }
    }
}