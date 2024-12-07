import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import * as Noise from 'ts-perlin-simplex'

class Cell {
    private background_sprite: Sprite
    private sprite: Sprite
    public element: HTMLElement

    constructor(parent_element: HTMLDivElement, private _src: SpriteSheet, public xPos: number, public yPos: number, onClick: (x : number, y : number) => void) {
        this.element = parent_element.appendChild(document.createElement('div'))
        this.background_sprite = new Sprite(this.element, _src, new Vector2(1,0))
        this.sprite = new Sprite(this.element, _src, new Vector2(0,0))
        
        this.sprite.element.style.gridArea = '1 / 1'
        this.background_sprite.element.style.gridArea = '1 / 1'

        this.element.id = "mining-cell"
        
        this.element.onclick = (_) => onClick(xPos-1, yPos-1)
        this.element.style.gridColumn = `${xPos}`
        this.element.style.gridRow = `${yPos}`
    }

    public decrease(amount: number = 1) {
        this.level = this._level - amount
    }

    private _level: number = 0
    public get level(): number {
        return this._level
    }

    public set level(value: number) {
        this._level = Math.max(0, Math.floor(value))
        this.sprite.set_tile(new Vector2(this.level !== 0 ? 1 + this._level : 0, 0))
    }

}

export class MiningGrid {
    private sprite_sheet: SpriteSheet
    private grid: HTMLDivElement
    private cells: Array<Array<Cell>> = []
    private readonly height = 10
    private readonly width = 13

    constructor(private _parent: HTMLDivElement) {
        this.sprite_sheet = new SpriteSheet(16, './assets/test_sheet.png')
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
            return Math.min(0.99, Math.max(0, noise_val))
        }

        for (let xIndex = 0; xIndex < this.width; xIndex++) {
            this.cells.push([])
            
            for (let yIndex = 0; yIndex < this.height; yIndex++) {
                this.cells[xIndex].push(new Cell(this.grid, this.sprite_sheet, xIndex+1, yIndex+1, (x,y) => this.clickedCell(x,y)))
                let cell = this.cells[xIndex][yIndex]
                cell.level = 2 + (Math.floor((sample_noise(xIndex, yIndex) * 3)) * 2)
            }
        }
    }
    
    clickedCell(xPos: number, yPos: number) {
        this.cells[xPos]?.[yPos]?.decrease(2)
        this.cells[xPos + 1]?.[yPos]?.decrease()
        this.cells[xPos - 1]?.[yPos]?.decrease()
        this.cells[xPos]?.[yPos + 1]?.decrease()
        this.cells[xPos]?.[yPos - 1]?.decrease()
    }
}