import { Sprite, SpriteSheet } from "../components/sprite";
import { Vector2 } from "../math";
import { HammerType } from "./animations";

type AnimationFrame = {
    from: Vector2,
    to: Vector2
}

export class HammerButton {
    
    public sprite: Sprite
    private depressed_state: AnimationFrame
    private pressed_state: AnimationFrame

    constructor(parent_element: HTMLElement, sheet: SpriteSheet, private hammer_type: HammerType, on_click: (hammer_type: HammerType) => void) {
        this.sprite = new Sprite(parent_element, sheet, new Vector2(14, 22), new Vector2(16, 25))

        this.depressed_state = hammer_type === HammerType.LIGHT ? { from: new Vector2(14, 26), to: new Vector2(16, 29) } : { from: new Vector2(14, 22), to: new Vector2(16, 25) }
        this.pressed_state = hammer_type === HammerType.LIGHT ? { from: new Vector2(17, 26), to: new Vector2(19, 29) } : { from: new Vector2(17, 22), to: new Vector2(19, 25) }

        const animation = (hammer_type === HammerType.LIGHT) ? [

        ] : [

        ]

        this.sprite.element.onmousedown = () => {
            on_click(this.hammer_type)
            this.set_pressed()
        }
    } 

    public set_depressed() {
        this.sprite.set_tile(this.depressed_state.from, this.depressed_state.to)
    }

    public set_pressed() {
        this.sprite.set_tile(this.pressed_state.from, this.pressed_state.to)
    }
}