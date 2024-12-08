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
    new GridObject(new Vector2(13, 0), new Vector2(14, 1), ContentType.ITEM,
[ // 2x2 small green sphere
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(15, 0), new Vector2(16, 1), ContentType.ITEM,
[ // 2x2 small red sphere
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(17, 0), new Vector2(18, 1), ContentType.ITEM,
[ // 2x2 small blue sphere
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(19, 0), new Vector2(20, 1), ContentType.ITEM,
[ // 2x2 small diamond sphere
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(21, 0), new Vector2(22, 1), ContentType.ITEM,
[ // 2x2 small pearl sphere
    [true, true],
    [true, true],
]),
]

export const large_spheres = [
    new GridObject(new Vector2(13, 2), new Vector2(15, 4), ContentType.ITEM,
[ // 3x3 large green sphere
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(16, 2), new Vector2(18, 4), ContentType.ITEM,
[ // 3x3 large red sphere
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(19, 2), new Vector2(21, 4), ContentType.ITEM,
[ // 3x3 large blue sphere
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(22, 2), new Vector2(24, 4), ContentType.ITEM,
[ // 3x3 large diamond sphere
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(25, 2), new Vector2(27, 4), ContentType.ITEM,
[ // 3x3 large pearl sphere
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
]

export const regional_fossils = [
    new GridObject(new Vector2(13, 5), new Vector2(16, 8), ContentType.ITEM,
[ // Skull Fossil
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
    [false, true, true, false],
]),
    new GridObject(new Vector2(17, 5), new Vector2(21, 8), ContentType.ITEM,
[ // Armor Fossil
    [false, true, true, true, false],
    [false, true, true, true, false],
    [true, true, true, true, true],
    [false, true, true, true, false],
]),
]

export const national_fossils = [...regional_fossils].concat([
    new GridObject(new Vector2(22, 5), new Vector2(26, 8), ContentType.ITEM,
[ // Dome Fossil
    [true, true, true, true, true],
    [true, true, true, true, true],
    [true, true, true, true, true],
    [false, true, true, true, false],
]),
    new GridObject(new Vector2(27, 5), new Vector2(30, 8), ContentType.ITEM,
[ // Helix Fossil 0deg
    [false, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, false],
]),
    new GridObject(new Vector2(31, 5), new Vector2(34, 8), ContentType.ITEM,
[ // Helix Fossil 90deg
    [true, true, true, false],
    [true, true, true, true],
    [true, true, true, true],
    [false, true, true, true],
]),
    new GridObject(new Vector2(35, 5), new Vector2(38, 8), ContentType.ITEM,
[ // Helix Fossil 180deg
    [false, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, false],
]),
    new GridObject(new Vector2(39, 5), new Vector2(42, 8), ContentType.ITEM,
[ // Helix Fossil 270deg
    [true, true, true, false],
    [true, true, true, true],
    [true, true, true, true],
    [false, true, true, true],
]),
    new GridObject(new Vector2(43, 5), new Vector2(46, 8), ContentType.ITEM,
[ // Old Amber 0deg
    [false, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, false],
]),
    new GridObject(new Vector2(47, 5), new Vector2(50, 8), ContentType.ITEM,
[ // Old Amber 90deg
    [true, true, true, false],
    [true, true, true, true],
    [true, true, true, true],
    [false, true, true, true],
]),
    new GridObject(new Vector2(13, 9), new Vector2(17, 13), ContentType.ITEM,
[ // Root Fossil 0deg
    [true, true, true, true, false],
    [true, true, true, true, true],
    [true, true, false, true, true],
    [false, false, false, true, true],
    [false, false, true, true, false],
]),
    new GridObject(new Vector2(18, 9), new Vector2(22, 13), ContentType.ITEM,
[ // Root Fossil 90deg
    [false, false, true, true, true],
    [false, false, true, true, true],
    [true, false, false, true, true],
    [true, true, true, true, true],
    [false, true, true, true, false],
]),
    new GridObject(new Vector2(23, 9), new Vector2(27, 13), ContentType.ITEM,
[ // Root Fossil 180deg
    [false, true, true, false, false],
    [true, true, false, false, false],
    [true, true, false, true, true],
    [true, true, true, true, true],
    [false, true, true, true, true],
]),
    new GridObject(new Vector2(28, 9), new Vector2(32, 13), ContentType.ITEM,
[ // Root Fossil 270deg
    [false, true, true, true, false],
    [true, true, true, true, true],
    [true, true, false, false, true],
    [true, true, true, false, false],
    [true, true, true, false, false],
]),
    new GridObject(new Vector2(33, 9), new Vector2(36, 13), ContentType.ITEM,
[ // Claw Fossil 0deg
    [false, false, true, true],
    [false, true, true, true],
    [false, true, true, true],
    [true, true, true, false],
    [true, true, false, false],
]),
    new GridObject(new Vector2(37, 10), new Vector2(41, 13), ContentType.ITEM,
[ // Claw Fossil 90deg
    [true, true, false, false, false],
    [true, true, true, true, false],
    [false, true, true, true, true],
    [false, false, true, true, true],
]),
    new GridObject(new Vector2(42, 9), new Vector2(45, 13), ContentType.ITEM,
[ // Claw Fossil 180deg
    [false, false, true, true],
    [false, true, true, true],
    [true, true, true, false],
    [true, true, true, false],
    [true, true, false, false],
]),
    new GridObject(new Vector2(46, 10), new Vector2(50, 13), ContentType.ITEM,
[ // Claw Fossil 270deg
    [true, true, true, false, false],
    [true, true, true, true, false],
    [false, true, true, true, true],
    [false, false, false, true, true],
]),
])

export const evolution_stones = [
    new GridObject(new Vector2(13, 14), new Vector2(15, 17), ContentType.ITEM,
[ // Leaf Stone 0deg
    [false, true, false],
    [true, true, true],
    [true, true, true],
    [false, true, false],
]),
    new GridObject(new Vector2(16, 15), new Vector2(19, 17), ContentType.ITEM,
[ // Leaf Stone 90deg
    [false, true, true, false],
    [true, true, true, true],
    [false, true, true, false],
]),
    new GridObject(new Vector2(20, 15), new Vector2(22, 17), ContentType.ITEM,
[ // Fire Stone
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(23, 15), new Vector2(25, 17), ContentType.ITEM,
[ // Water Stone
    [true, true, true],
    [true, true, true],
    [true, true, false],
]),
    new GridObject(new Vector2(26, 15), new Vector2(28, 17), ContentType.ITEM,
[ // Thunder Stone
    [false, true, true],
    [true, true, true],
    [true, true, false],
]),
    new GridObject(new Vector2(29, 16), new Vector2(32, 17), ContentType.ITEM,
[ // Moon stone 0deg
    [false, true, true, true],
    [true, true, true, true],
    [true, true, true, false],
]),
    new GridObject(new Vector2(33, 14), new Vector2(34, 17), ContentType.ITEM,
[ // Moon stone 0deg
    [true, true, false],
    [true, true, true],
    [true, true, true],
    [false, true, true],
]),
    new GridObject(new Vector2(35, 15), new Vector2(37, 17), ContentType.ITEM,
[ // Sun Stone
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
]

export const shards = [
    new GridObject(new Vector2(13, 18), new Vector2(16, 20), ContentType.ITEM,
[ // Green Shard
    [true, true, true, true],
    [true, true, true, true],
    [true, true, false, true],
]),
    new GridObject(new Vector2(17, 18), new Vector2(19, 20), ContentType.ITEM,
[ // Red Shard
    [true, true, true],
    [true, true, false],
    [true, true, true],
]),
    new GridObject(new Vector2(20, 18), new Vector2(22, 20), ContentType.ITEM,
[ // Blue Shard
    [true, true, true],
    [true, true, true],
    [true, true, false],
]),
    new GridObject(new Vector2(23, 18), new Vector2(26, 20), ContentType.ITEM,
[ // Yellow Shard
    [true, false, true, false],
    [true, true, true, false],
    [true, true, true, true],
]),
]

export const weather_stones = [

    new GridObject(new Vector2(13, 21), new Vector2(16, 23), ContentType.ITEM,
[ // Heat Rock
    [true, false, true, false],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(17, 21), new Vector2(19, 23), ContentType.ITEM,
[ // Damp Rock
    [true, true, true],
    [true, true, true],
    [true, false, true],
]),
    new GridObject(new Vector2(20, 21), new Vector2(23, 24), ContentType.ITEM,
[ // Icy Rock
    [false, true, true, false],
    [true, true, true, true],
    [true, true, true, true],
    [true, false, false, true],
]),
    new GridObject(new Vector2(24, 21), new Vector2(27, 24), ContentType.ITEM,
[ // Smooth Rock
    [false, false, true, false],
    [true, true, true, false],
    [false, true, true, true],
    [false, true, false, false],
]),
]

export const items = [
    new GridObject(new Vector2(13, 25), new Vector2(15, 27), ContentType.ITEM,
[ // Revive
    [false, true, false],
    [true, true, true],
    [false, true, false],
]),
    new GridObject(new Vector2(16, 25), new Vector2(18, 27), ContentType.ITEM,
[ // Max Revive
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(19, 25), new Vector2(21, 27), ContentType.ITEM,
[ // Star Shard
    [false, true, false],
    [true, true, true],
    [false, true, false],
]),
    new GridObject(new Vector2(22, 26), new Vector2(23, 27), ContentType.ITEM,
[ // Heart Scale
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(14, 28), new Vector2(15, 29), ContentType.ITEM,
[ // Hard Stone
    [true, true],
    [true, true],
]),
    new GridObject(new Vector2(16, 28), new Vector2(19, 29), ContentType.ITEM,
[ // Everstone
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(20, 28), new Vector2(23, 31), ContentType.ITEM,
[ // Light Clay
    [true, false, true, false],
    [true, true, true, false],
    [true, true, true, true],
    [false, true, false, true],
]),
    new GridObject(new Vector2(24, 28), new Vector2(26, 30), ContentType.ITEM,
[ // Iron Ball
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(27, 28), new Vector2(29, 30), ContentType.ITEM,
[ // Oval Stone
    [true, true, true],
    [true, true, true],
    [true, true, true],
]),
    new GridObject(new Vector2(29, 18), new Vector2(31, 23), ContentType.ITEM,
[ // Rare bone 0deg
    [true, true, true],
    [false, true, false],
    [false, true, false],
    [false, true, false],
    [false, true, false],
    [true, true, true],
]),
    new GridObject(new Vector2(32, 21), new Vector2(37, 23), ContentType.ITEM,
[ // Rare bone 90deg
    [true, false, false, false, false, true],
    [true, true, true, true, true, true],
    [true, false, false, false, false, true],
]),
    new GridObject(new Vector2(38, 20), new Vector2(41, 23), ContentType.ITEM,
[ // Odd Keystone
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),

]

export const plates = [
    new GridObject(new Vector2(14, 32), new Vector2(17, 34), ContentType.ITEM,
[ // Insect Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(18, 32), new Vector2(21, 34), ContentType.ITEM,
[ // Dread Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(22, 32), new Vector2(25, 34), ContentType.ITEM,
[ // Draco Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(26, 32), new Vector2(29, 34), ContentType.ITEM,
[ // Zap Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(30, 32), new Vector2(33, 34), ContentType.ITEM,
[ // Fist Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(34, 32), new Vector2(37, 34), ContentType.ITEM,
[ // Flame Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(38, 32), new Vector2(41, 34), ContentType.ITEM,
[ // Sky Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(42, 32), new Vector2(47, 34), ContentType.ITEM,
[ // Spooky Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(14, 35), new Vector2(17, 37), ContentType.ITEM,
[ // Meadow Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(18, 35), new Vector2(21, 37), ContentType.ITEM,
[ // Earth Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(22, 35), new Vector2(25, 37), ContentType.ITEM,
[ // Icicle Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(26, 35), new Vector2(29, 37), ContentType.ITEM,
[ // Toxic Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(30, 35), new Vector2(33, 37), ContentType.ITEM,
[ // Mind Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(34, 35), new Vector2(37, 37), ContentType.ITEM,
[ // Stone Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(38, 35), new Vector2(41, 37), ContentType.ITEM,
[ // Iron Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
    new GridObject(new Vector2(42, 35), new Vector2(45, 37), ContentType.ITEM,
[ // Splash Plate
    [true, true, true, true],
    [true, true, true, true],
    [true, true, true, true],
]),
]