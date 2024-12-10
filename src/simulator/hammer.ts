import { Sprite, SpriteSheet } from "../components/sprite";
import { Vector2 } from "../math";
import { ContentType } from "./objects";

export enum HammerType {
    LIGHT,
    HEAVY
}

export function play_hammer_animation(parent_element: HTMLElement, sheet: SpriteSheet, tile_offset: Vector2, scale: number, hammer_type: HammerType, content_type: ContentType) : HTMLElement {
    const tile_unit = sheet.tile_size * scale
    const container = parent_element.appendChild(document.createElement('div'))
    container.id = 'hammer'
    container.style.scale = scale.toString()
    const hammer = new Sprite(container, sheet, new Vector2(3,1), new Vector2(4, 2))

    function set_hammer_animation(translation_vector?: Vector2, hammer_state?: number) {
        if (translation_vector) {
            const hammer_visual_offset = new Vector2(tile_unit * translation_vector.x, tile_unit * translation_vector.y)
            const translation =  tile_offset.mul(tile_unit).add(hammer_visual_offset)
            container.style.translate = `${translation.x}px ${translation.y}px`
        }

        if (hammer_state !== undefined) {
            console.log("Hammer state")
            if (hammer_type === HammerType.LIGHT) {
                if (hammer_state === 0) {
                    console.log("Down light")
                    hammer.set_tile(new Vector2(3, 1), new Vector2(4, 2))
                } else {
                    console.log("Up light")
                    hammer.set_tile(new Vector2(1, 1), new Vector2(2, 2))
                }
            } else {
                if (hammer_state === 0) {
                    console.log("Down heavy")
                    hammer.set_tile(new Vector2(3, 4), new Vector2(4, 5))
                } else {
                    console.log("Up heavy")
                    hammer.set_tile(new Vector2(1, 4), new Vector2(2, 5))
                }
            }
        }
    }

    type AnimationFrame = {
        translation?: Vector2
        hammer_state?: number // 0: down 1: up
    }

    const lower_x = (6 / 8), lower_y = -2
    const upper_x = 1 + (2 / 8), upper_y = -(2 + (4 / 8))
    const animation_frames: AnimationFrame[] = [
        { hammer_state: 0, translation: new Vector2(upper_x, upper_y) },
        { translation: new Vector2(lower_x, lower_y) },
        { },
        { hammer_state: 1, translation: new Vector2(upper_x+ (6 / 8), upper_y) },
        { },
        { translation: new Vector2(upper_x + 1 + (1 / 8), upper_y) },
        { },
        { translation: new Vector2(upper_x + (6 / 8), upper_y) },
        { },
        { translation: new Vector2(upper_x + 1 + (1 / 8), upper_y) },
        { },
    ]

    const frame_rate = 1000 / 24
    // const frame_rate = 1000

    animation_frames.forEach((frame, index) => {
        setTimeout(() => {
            set_hammer_animation(frame.translation, frame.hammer_state)
        }, frame_rate * index);
    })

    setTimeout(() => {
        parent_element.removeChild(container)
    }, frame_rate * (animation_frames.length + 1));


    // Initialize animation
    set_hammer_animation(animation_frames[0].translation, animation_frames[0].hammer_state)


    return hammer.element
}