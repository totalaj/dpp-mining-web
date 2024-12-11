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
        const sprite = new Sprite(container, this.sheet, new Vector2(0,0), new Vector2(0, 0))
        sprite.element.style.position = 'absolute'

        const set_animation = (translation_vector?: Vector2, frame?: number) => {
            if (translation_vector) {
                const visual_offset = new Vector2(translation_vector.x, translation_vector.y).mul(this.sheet.tile_size)
                sprite.element.style.translate = `${visual_offset.x}px ${visual_offset.y}px`
            }
    
            if (frame !== undefined) {
                const sprite_frame = (frame >= 0 && frame < sprite_kinds.length) ? sprite_kinds[frame] : {from: new Vector2(0, 0), to: new Vector2(0, 0)}
                sprite.set_tile(sprite_frame.from, sprite_frame.to)
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
    
        const lower_x = 0, lower_y = -1
        const upper_x = 0.5, upper_y = -1.5
        const hammer_animation: AnimationFrame[] = [
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

        const nothing = { from: new Vector2(0, 0), to: new Vector2(0, 0) }
        const regular_spark = hammer_type === HammerType.LIGHT ? { from: new Vector2(5, 1), to: new Vector2(8, 4) } : { from: new Vector2(5, 5), to: new Vector2(8, 8) }
        const spark_small_star = hammer_type === HammerType.LIGHT ? { from: new Vector2(9, 1), to: new Vector2(12, 4) } : { from: new Vector2(9, 5), to: new Vector2(12, 8) }
        const small_star = { from: new Vector2(17, 1), to: new Vector2(20, 4) }
        const spark_broken_star = hammer_type === HammerType.LIGHT ? { from: new Vector2(13, 1), to: new Vector2(16, 4) } : { from: new Vector2(13, 5), to: new Vector2(16, 8) }
        const whiff_spark = { from: new Vector2(17, 5), to: new Vector2(20, 8) }

        const sparks_frames = [
            nothing,            // 0
            regular_spark,      // 1
            spark_small_star,   // 2
            small_star,         // 3
            spark_broken_star,  // 4
            whiff_spark         // 5
        ]

        const sparks_translation = new Vector2(-1.5, -1.5)
        const terrain_sparks_animation: AnimationFrame[] = [
            { frame: 1, translation: sparks_translation },
            { frame: 0 },
            { frame: 1 },
            { frame: 0 },
            { frame: 1 },
            { frame: 0 },
        ]
        const bedrock_sparks_animation: AnimationFrame[] = [
            { frame: 5, translation: sparks_translation },
            { frame: 0 },
            { frame: 5 },
            { frame: 0 },
            { frame: 5 },
            { frame: 0 },
        ]

        const item_sparks_animation: AnimationFrame[] = [
            { frame: 2, translation: sparks_translation },
            { frame: 3 },
            { frame: 4 },
            { frame: 0 },
            { frame: 1 },
            { frame: 0 },
        ]
    
        this.play_animation(this.container, hammer_animation,
            hammer_type === HammerType.LIGHT ? [
            {from: new Vector2(3, 1), to: new Vector2(4, 2)},
            {from: new Vector2(1, 1), to: new Vector2(2, 2)}
        ]: [
            {from: new Vector2(3, 4), to: new Vector2(4, 5)},
            {from: new Vector2(1, 4), to: new Vector2(2, 5)}
        ])

        switch (content_type) {
            case ContentType.NOTHING:
                this.play_animation(this.container, terrain_sparks_animation, sparks_frames)
                break;
            case ContentType.BEDROCK:
                this.play_animation(this.container, bedrock_sparks_animation, sparks_frames)
                break;
            case ContentType.ITEM:
                this.play_animation(this.container, item_sparks_animation, sparks_frames)
                break;
        }

        
        this.removal_timeout = setTimeout(() => {
            this.container?.remove()
            this.container = undefined
        }, this.frame_rate * (hammer_animation.length + 1));
    }
}