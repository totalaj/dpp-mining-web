import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'
import { bedrock_objects, ContentType, evolution_stones, fossils, GridObject, items, large_spheres, plates, shards, small_speheres, weather_stones } from "./objects"
import { random_element } from "../utils/array_utils"
import { random_in_range } from "../utils/random"

const cell_scale = 3

enum HitResult {
    NORMAL,
    BOTTOM
}

enum HammerType {
    LIGHT,
    HEAVY
}

class ActiveObject {
    public has_been_found: boolean = false

    constructor(public object_ref: GridObject, public position: Vector2) {

    }
}

class Cell {
    private background_sprite: Sprite
    private terrain_sprite: Sprite
    private object_sprite?: Sprite
    public element: HTMLElement
    public content: ContentType = ContentType.NOTHING

    constructor(parent_element: HTMLDivElement, private _src: SpriteSheet, public xPos: number, public yPos: number, onClick: (x : number, y : number) => void) {
        this.element = parent_element.appendChild(document.createElement('div'))
        this.background_sprite = new Sprite(this.element, _src, new Vector2(1,0))
        this.background_sprite.element.style.scale = cell_scale.toString()
        this.background_sprite.element.style.zIndex = '-1'
        this.terrain_sprite = new Sprite(this.element, _src, new Vector2(0,0))
        this.terrain_sprite.element.style.scale = cell_scale.toString()
        this.terrain_sprite.element.style.zIndex = '1'

        this.element.id = "mining-cell"
        this.element.style.height = `${_src.tile_size * cell_scale}px`
        this.element.style.width = `${_src.tile_size * cell_scale}px`
        
        this.element.onclick = () => onClick(xPos-1, yPos-1)
        this.element.style.gridColumn = `${xPos}`
        this.element.style.gridRow = `${yPos}`
    }

    public set_object(object: GridObject, sprite_position: Vector2) {
        this.object_sprite = new Sprite(this.element, GridObject.object_sheet, sprite_position)
        this.object_sprite.element.style.scale = cell_scale.toString()
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

export class MiningGrid {
    private sprite_sheet: SpriteSheet
    private grid: HTMLDivElement
    private cells: Array<Array<Cell>> = []
    private readonly height = 10
    private readonly width = 13
    public on_game_end?: () => void
    private game_over: boolean = false

    public added_items: ActiveObject[] = []

    constructor(private _parent: HTMLDivElement) {
        this.sprite_sheet = new SpriteSheet(16, './assets/board_sheet.png')
        this.grid = this._parent.appendChild(document.createElement('div'))
        this.grid.id = 'mining-grid'

        for (let xIndex = 0; xIndex < this.width; xIndex++) {
            this.cells.push([])
            
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                this.cells[xIndex].push(new Cell(this.grid, this.sprite_sheet, xIndex+1, yIndex+1, (x,y) => this.clickedCell(x,y)))
            }
        }

        this.setup_terrain()
        this.populate_board()
        this.game_over = false
    }

    public reset_board() {
        this.clear_board()
        this.setup_terrain()
        this.populate_board()
        this.game_over = false
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
                const item = all_items[index];
                accumulation += item.rarity.get_rate()
                if (accumulation > roll) {
                    return item
                }
            }

            return all_items[0] // We should NEVER get here, in theory
        }

        let item_count = 2 + random_in_range(0, 2, true)

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
            const pos = positions[index];
         
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
            const cell_row = this.cells[xIndex];
            for (let yIndex = 0; yIndex < cell_row.length; yIndex++) {
                const cell = cell_row[yIndex];
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
                let positions = this.get_object_positions(item.object_ref, item.position)
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
            console.log("All found?", all_found)
            if (all_found) {
                console.log("Calling on_game_end")
                this.game_over = true
                this.on_game_end?.()
            }
        }
    }

    private clickedCell(xPos: number, yPos: number) {
        if (this.game_over) return

        const targetCell = this.cells[xPos][yPos]
        const result = targetCell.decrease(2)
        if (result === HitResult.BOTTOM && targetCell.content === ContentType.BEDROCK) {
            return
        }
        
        this.cells[xPos + 1]?.[yPos]?.decrease()
        this.cells[xPos - 1]?.[yPos]?.decrease()
        this.cells[xPos]?.[yPos + 1]?.decrease()
        this.cells[xPos]?.[yPos - 1]?.decrease()

        this.check_items_found()
    }
}