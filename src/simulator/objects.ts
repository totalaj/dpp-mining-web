import { SpriteSheet } from "../components/sprite";
import { Vector2 } from "../math";

export enum ContentType {
    NOTHING = 0,
    ITEM = 1,
    BEDROCK = 2
}

export class GridObject {
    public static object_sheet = new SpriteSheet(16, './assets/object_sheet.png')
    public extents: Vector2
    
    // Use reverse indexing, (ie y,x rather than x,y) because of how data is inputed
    public collision: Array<Array<boolean>>

    constructor(public start_tile: Vector2, public end_tile: Vector2, public content_type: ContentType, collision: Array<Array<boolean>>) {
        this.extents = end_tile.subtract(start_tile).add(new Vector2(1,1))
        this.collision = collision
    }
}

export const bedrock_objects = [
    new GridObject(new Vector2(1, 0), new Vector2(1, 3), ContentType.BEDROCK,
[
    [true],
    [true],
    [true],
    [true]
])
]