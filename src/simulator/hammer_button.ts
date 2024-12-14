import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"
import { GLOBAL_FRAME_RATE, HammerType } from "./animations"

type AnimationFrame = {
    from: Vector2,
    to: Vector2
}

export class HammerButton {
    public sprite: Sprite
    private _depressed_state: AnimationFrame
    private _pressed_state: AnimationFrame

    constructor(parent_element: HTMLElement, sheet: SpriteSheet, private _hammer_type: HammerType, on_click: (hammer_type: HammerType) => boolean) {
        this.sprite = new Sprite(parent_element, sheet, new Vector2(14, 22), new Vector2(16, 25))

        this._depressed_state = _hammer_type === HammerType.LIGHT ? { from: new Vector2(14, 26), to: new Vector2(16, 29) } : { from: new Vector2(14, 22), to: new Vector2(16, 25) }
        this._pressed_state = _hammer_type === HammerType.LIGHT ? { from: new Vector2(17, 26), to: new Vector2(19, 29) } : { from: new Vector2(17, 22), to: new Vector2(19, 25) }

        const animation = (_hammer_type === HammerType.LIGHT) ? [
            { from: new Vector2(5, 26), to: new Vector2(7, 29) },
            { from: new Vector2(8, 26), to: new Vector2(10, 29) },
            { from: new Vector2(11, 26), to: new Vector2(13, 29) },
            this._pressed_state
        ] : [
            { from: new Vector2(5, 22), to: new Vector2(7, 25) },
            { from: new Vector2(8, 22), to: new Vector2(10, 25) },
            { from: new Vector2(11, 22), to: new Vector2(13, 25) },
            this._pressed_state
        ]

        this.sprite.element.onmousedown = (): void => {
            const result = on_click(this._hammer_type)
            if (result) {
                animation.forEach((anim_frame, index) => {
                    setTimeout(() => {
                        this.sprite.set_tile(anim_frame.from, anim_frame.to)
                    }, GLOBAL_FRAME_RATE * index)
                })
            }
        }
    }

    public set_depressed(): void {
        this.sprite.set_tile(this._depressed_state.from, this._depressed_state.to)
    }

    public set_pressed(): void {
        this.sprite.set_tile(this._pressed_state.from, this._pressed_state.to)
    }
}