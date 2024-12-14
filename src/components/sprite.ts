import { Vector2 } from "../math"

export class SpriteSheet {
    public get tile_size (): number {
        return this._tile_size * this._scale
    }

    public get sheet_size (): Vector2 {
        return this._sheet_size.mul(this._scale)
    }

    public get scale (): number {
        return this._scale
    }
    
    constructor(private _tile_size: number, public src: string, private _sheet_size: Vector2, private _scale: number) { }
}

export class Sprite {
    public element: HTMLElement
    
    private _start_tile: Vector2
    private _end_tile: Vector2

    public get start_tile() : Vector2 { return this._start_tile.copy() }
    public get end_tile() : Vector2 { return this._end_tile.copy() }
    

    constructor (public parent_element: HTMLElement, private _src: SpriteSheet, start_tile: Vector2, end_tile?: Vector2) {
        this.element = parent_element.appendChild(document.createElement('div'))
        this._start_tile = start_tile
        this._end_tile = end_tile ?? start_tile
        this.set_tile(this._start_tile, this._end_tile)
    }

    public set_tile(start_tile: Vector2, end_tile?: Vector2): void {
        this._start_tile = start_tile
        this._end_tile = end_tile ?? start_tile

        const offset_in_pixels = this._start_tile.mul(this._src.tile_size)

        const size_in_tiles = this._end_tile.subtract(this._start_tile)
        size_in_tiles.x++
        size_in_tiles.y++
        
        this.element.className = 'sprite'
        this.element.style.width = `${this._src.tile_size * size_in_tiles.x}px`
        this.element.style.height = `${this._src.tile_size * size_in_tiles.y}px`
        this.element.style.background = `url('${this._src.src}') -${offset_in_pixels.x}px -${offset_in_pixels.y}px`
        this.element.style.backgroundSize = `${this._src.sheet_size.x}px ${this._src.sheet_size.y}px`
    }

    public dispose(): void {
        this.element.remove()
    }
}