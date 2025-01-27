import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"

const BADGES: { start: Vector2, end: Vector2 }[]
= [
    { start: new Vector2(0, 0), end: new Vector2(2, 2) },
    { start: new Vector2(3, 0), end: new Vector2(5, 2) },
    { start: new Vector2(6, 0), end: new Vector2(8, 2) },
    { start: new Vector2(9, 0), end: new Vector2(11, 2) },
    { start: new Vector2(0, 3), end: new Vector2(2, 5) },
    { start: new Vector2(3, 3), end: new Vector2(5, 5) },
    { start: new Vector2(6, 3), end: new Vector2(8, 5) },
    { start: new Vector2(9, 3), end: new Vector2(11, 5) }
]

const BADGE_SHEET = new SpriteSheet(16, 'assets/badge_sheet.png', new Vector2(192, 96), 2)

export function create_badge_sprite(id: number, parent: HTMLElement): Sprite {
    const badge = BADGES[id - 1]
    return new Sprite(parent, BADGE_SHEET, badge.start, badge.end)
}