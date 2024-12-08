import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'
import { bedrock_objects, ContentType, evolution_stones, GridObject, items, large_spheres, national_fossils, plates, shards, small_speheres, weather_stones } from "./objects"
import { random_element } from "../utils/array_utils"

const cell_scale = 3

enum HitResult {
    NORMAL,
    BOTTOM
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
    
    public decrease(amount: number = 1): HitResult {
        this.level = this._level - amount
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

    constructor(private _parent: HTMLDivElement) {
        this.sprite_sheet = new SpriteSheet(16, './assets/board_sheet.png')
        this.grid = this._parent.appendChild(document.createElement('div'))
        this.grid.id = 'mining-grid'
        this.grid.style.borderColor = '#' + Math.floor(Math.random()*16777215).toString(16);

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
            this.cells.push([])
            
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                this.cells[xIndex].push(new Cell(this.grid, this.sprite_sheet, xIndex+1, yIndex+1, (x,y) => this.clickedCell(x,y)))
                const cell = this.cells[xIndex][yIndex]
                cell.level = 2 + (Math.floor((sample_noise(xIndex, yIndex) * 3)) * 2)
                cell.level = 0
            }
        }

        plates.forEach((obj) => {
            this.try_add_object_at_random_valid_position(obj)
        })

        for (let index = 0; index < 4; index++) {
            this.try_add_object_at_random_valid_position(random_element(Math.random() > 0.3 ? large_spheres : small_speheres))
        }

        for (let index = 0; index < 6; index++) {
            this.try_add_object_at_random_valid_position(random_element(bedrock_objects))
        }

    }

    get_object_positions(object: GridObject, position: Vector2) : Vector2[] {
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

    test_object_placement(object: GridObject, position: Vector2) : boolean {
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

    get_all_valid_object_positions(object: GridObject) : Vector2[] {
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

    add_object_to_grid(object: GridObject, position: Vector2) : void {
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

    public try_add_object_at_random_valid_position(object: GridObject) : boolean {
        const valid_positions = this.get_all_valid_object_positions(object)
        
        if (valid_positions.length === 0) return false
        const position = valid_positions[Math.floor(Math.random() * valid_positions.length)]

        this.add_object_to_grid(object, position)
        return true
    }
    
    clickedCell(xPos: number, yPos: number) {
        const targetCell = this.cells[xPos]?.[yPos]
        console.log("Clicked", xPos, yPos, ContentType[targetCell.content])
        const result = targetCell.decrease(2)
        if (result === HitResult.BOTTOM && targetCell.content === ContentType.BEDROCK) {
            return
        }
        
        this.cells[xPos + 1]?.[yPos]?.decrease()
        this.cells[xPos - 1]?.[yPos]?.decrease()
        this.cells[xPos]?.[yPos + 1]?.decrease()
        this.cells[xPos]?.[yPos - 1]?.decrease()
    }
}