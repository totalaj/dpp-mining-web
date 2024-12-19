import { Vector2 } from "../math"
import { animate_text, TextAnimation } from "../simulator/animations"
import { set_translation } from "../utils/dom_util"
import { Sprite, SpriteSheet } from "./sprite"

export class MessageBox {
    public animated_text: TextAnimation
    private _sprite: Sprite

    constructor(parent_element: HTMLElement, text: string, sprite_sheet: SpriteSheet) {
        this._sprite = new Sprite(parent_element, sprite_sheet, new Vector2(14, 39), new Vector2(29, 41))
        set_translation(this._sprite.element, sprite_sheet.tile_size, 0, 9)
        const text_element = this._sprite.element.appendChild(document.createElement('div'))
        text_element.id = 'message-text'
        text_element.className = 'inverted-text'
        set_translation(text_element, sprite_sheet.tile_size, 1, (2 / 8))
        this.animated_text = animate_text(text_element, text)
    }

    public dispose(): void {
        this._sprite.dispose()
    }
}