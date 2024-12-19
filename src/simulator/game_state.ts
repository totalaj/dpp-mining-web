import { SpriteSheet, Sprite } from "../components/sprite"
import { Vector2 } from "../math"

export class HealthBar {
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
