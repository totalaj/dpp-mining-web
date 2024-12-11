import { Sprite, SpriteSheet } from "../components/sprite";
import { Vector2 } from "../math";
import { ContentType } from "./objects";

export enum HammerType {
    LIGHT,
    HEAVY
}

type AnimationFrame = {
    translation?: Vector2
    frame?: number // 0: down 1: up
}

export class Hammer {
    private readonly frame_rate = 1000 / 24

    private container?: HTMLElement
    private tile_unit: number
    private removal_timeout?: any

    constructor(private parent_element: HTMLElement, private sheet: SpriteSheet, private scale: number) {
        this.tile_unit = sheet.tile_size * scale
    }

    private play_animation(container: HTMLElement, frames: AnimationFrame[], sprite_kinds: {from: Vector2, to: Vector2}[]) {
        const hammer = new Sprite(container, this.sheet, new Vector2(0,0), new Vector2(0, 0))

        const set_animation = (translation_vector?: Vector2, frame?: number) => {
            if (translation_vector) {
                const visual_offset = new Vector2(translation_vector.x, translation_vector.y).mul(this.sheet.tile_size)
                hammer.element.style.translate = `${visual_offset.x}px ${visual_offset.y}px`
            }
    
            if (frame !== undefined) {
                const sprite_frame = (frame >= 0 && frame < sprite_kinds.length) ? sprite_kinds[frame] : {from: new Vector2(0, 0), to: new Vector2(0, 0)}
                hammer.set_tile(sprite_frame.from, sprite_frame.to)
            }
        }
        
        // const frame_rate = 100
    
        frames.forEach((frame, index) => {
            setTimeout(() => {
                set_animation(frame.translation, frame.frame)
            }, this.frame_rate * index);
        })
    
    
        // Initialize animation
        set_animation(frames[0].translation, frames[0].frame)
    }

    public play_hammer_animation(tile_offset: Vector2, hammer_type: HammerType, content_type: ContentType) {
        if (this.container) {
            this.container.remove()
            clearTimeout(this.removal_timeout)
        }
        this.container = this.parent_element.appendChild(document.createElement('div'))
        this.container.id = 'hammer'
        this.container.style.scale = this.scale.toString()
        const container_visual_translation = tile_offset.mul(this.tile_unit)
        this.container.style.translate = `${container_visual_translation.x}px ${container_visual_translation.y}px`
    
        const lower_x = (6 / 8), lower_y = -(4/8)
        const upper_x = 1 + (1 / 8), upper_y = -1
        const animation_frames: AnimationFrame[] = [
            { frame: 0, translation: new Vector2(upper_x, upper_y) },
            { translation: new Vector2(lower_x, lower_y) },
            { },
            { frame: 1, translation: new Vector2(upper_x+ (5 / 8), upper_y) },
            { },
            { translation: new Vector2(upper_x + 1, upper_y) },
            { },
            { translation: new Vector2(upper_x + (5 / 8), upper_y) },
            { },
            { translation: new Vector2(upper_x + 1, upper_y) },
            { },
        ]
    
        this.play_animation(this.container, animation_frames,
            hammer_type === HammerType.LIGHT ? [
            {from: new Vector2(3, 1), to: new Vector2(4, 2)},
            {from: new Vector2(1, 1), to: new Vector2(2, 2)}
        ]: [
            {from: new Vector2(3, 4), to: new Vector2(4, 5)},
            {from: new Vector2(1, 4), to: new Vector2(2, 5)}
        ])
        
        this.removal_timeout = setTimeout(() => {
            this.container?.remove()
            this.container = undefined
        }, this.frame_rate * (animation_frames.length + 1));
    }
}