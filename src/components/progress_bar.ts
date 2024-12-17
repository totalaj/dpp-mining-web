import { Vector2 } from "../math"
import { Sprite, SpriteSheet } from "./sprite"

export class ProgressBar {
    private _element: HTMLElement

    private _bar_sprites: Sprite[] = []

    constructor(parent_element: HTMLElement, private _total_progress: number, private _board_sheet: SpriteSheet) {
        this._element = parent_element.appendChild(document.createElement('div'))
        this._element.id = 'progress-bar'
    }

    public set_progress(progress: number): void {
        this._bar_sprites.forEach((element) => element.dispose())
        this._bar_sprites.length = 0
        for (let index = 0; index < this._total_progress; index++) {
            const sprite_range: [Vector2, Vector2] = (index < progress) ? [ new Vector2(10, 0), new Vector2(11, 0) ] : [ new Vector2(8, 0), new Vector2(9, 0) ]
            const sprite = new Sprite(this._element, this._board_sheet, sprite_range[0], sprite_range[1])
            this._bar_sprites.push(sprite)
        }
    }
}