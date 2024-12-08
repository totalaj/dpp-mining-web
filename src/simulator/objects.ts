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
[ // 4-tall I
    [true],
    [true],
    [true],
    [true]
]),
    new GridObject(new Vector2(2, 0), new Vector2(3, 3), ContentType.BEDROCK,
[ // 4-tall 2-wide I
    [true, true],
    [true, true],
    [true, true],
    [true, true]
]),
    new GridObject(new Vector2(4, 0), new Vector2(7, 0), ContentType.BEDROCK,
[ // 4-wide line
    [true, true, true, true]
]),
    new GridObject(new Vector2(4, 1), new Vector2(6, 3), ContentType.BEDROCK,
[ // 3x3 block
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(7, 1), new Vector2(10, 2), ContentType.BEDROCK,
[ // 2x4 block
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(11, 0), new Vector2(12, 1), ContentType.BEDROCK,
[ // 2x2 block
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(1, 4), new Vector2(2, 6), ContentType.BEDROCK,
[ // Vertical S
    [true, false],
    [true, true],
    [false, true],
]),
    new GridObject(new Vector2(3, 4), new Vector2(4, 6), ContentType.BEDROCK,
[ // Vertical Z
    [false, true],
    [true, true],
    [true, false],
]),
    new GridObject(new Vector2(5, 5), new Vector2(7, 6), ContentType.BEDROCK,
[ // Horizontal Z
    [true, true, false],
    [false, true, true],
]),
    new GridObject(new Vector2(8, 5), new Vector2(10, 6), ContentType.BEDROCK,
[ // Horizontal S
    [false, true, true],
    [true, true, false],
]),    
    new GridObject(new Vector2(1, 7), new Vector2(2, 9), ContentType.BEDROCK,
[ // Vertical T left
    [true, false],
    [true, true],
    [true, false],
]),
    new GridObject(new Vector2(3, 7), new Vector2(4, 9), ContentType.BEDROCK,
[ // Vertical T right
    [false, true],
    [true, true],
    [false, true],
]),
    new GridObject(new Vector2(5, 8), new Vector2(7, 9), ContentType.BEDROCK,
[ // Horizontal T invert
    [false, true, false],
    [true, true, true],
]),
    new GridObject(new Vector2(8, 8), new Vector2(10, 9), ContentType.BEDROCK,
[ // Horizontal T
    [true, true, true],
    [false, true, false],
])
]

export const small_speheres = [

]

export const large_spheres = [

]

export const regional_fossils = [

]

export const national_fossils = [regional_fossils].concat([

])

export const evolution_stones = [

]

export const shards = [

]

export const weather_stones = [

]

export const items = [

]

export const plates = [
    
]