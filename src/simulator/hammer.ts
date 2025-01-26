import { Vector2 } from "../math"
import { HammerType } from "./animations"


export class Hammer {
    public get_damage(): number {
        return 0
    }

    public get_mining_area(): Array<[Vector2, number]> {
        return []
    }

    public get_hammer_type(): HammerType {
        return HammerType.LIGHT
    }
}

export class LightHammer extends Hammer {
    public override get_damage(): number {
        return 1
    }

    public override get_mining_area(): Array<[Vector2, number]> {
        return [
            [ new Vector2(0, 0), 2 ],
            [ new Vector2(1, 0), 1 ],
            [ new Vector2(-1, 0), 1 ],
            [ new Vector2(0, 1), 1 ],
            [ new Vector2(0, -1), 1 ]
        ]
    }

    public override get_hammer_type(): HammerType {
        return HammerType.LIGHT
    }
}

// Hit in corners, instead of sides
export class AlternateLightHammer extends LightHammer {
    public override get_mining_area(): Array<[Vector2, number]> {
        return [
            [ new Vector2(0, 0), 2 ],
            [ new Vector2(1, 1), 1 ],
            [ new Vector2(1, -1), 1 ],
            [ new Vector2(-1, 1), 1 ],
            [ new Vector2(-1, -1), 1 ]
        ]
    }
}

export class HeavyHammer extends Hammer {
    public override get_damage(): number {
        return 2
    }

    public override get_mining_area(): Array<[Vector2, number]> {
        return [
            [ new Vector2(0, 0), 2 ],
            [ new Vector2(1, 0), 2 ],
            [ new Vector2(-1, 0), 2 ],
            [ new Vector2(0, 1), 2 ],
            [ new Vector2(0, -1), 2 ],
            [ new Vector2(1, 1), 1 ],
            [ new Vector2(1, -1), 1 ],
            [ new Vector2(-1, 1), 1 ],
            [ new Vector2(-1, -1), 1 ]
        ]
    }

    public override get_hammer_type(): HammerType {
        return HammerType.HEAVY
    }
}

// Heavy hit in corners, instead of sides
export class AlternateHeavyHammer extends HeavyHammer {
    public override get_mining_area(): Array<[Vector2, number]> {
        return [
            [ new Vector2(0, 0), 2 ],
            [ new Vector2(1, 0), 1 ],
            [ new Vector2(-1, 0), 1 ],
            [ new Vector2(0, 1), 1 ],
            [ new Vector2(0, -1), 1 ],
            [ new Vector2(1, 1), 2 ],
            [ new Vector2(1, -1), 2 ],
            [ new Vector2(-1, 1), 2 ],
            [ new Vector2(-1, -1), 2 ]
        ]
    }
}

export const LIGHT_HAMMER = new LightHammer()
export const ALTERNATE_LIGHT_HAMMER = new AlternateLightHammer()
export const HEAVY_HAMMER = new HeavyHammer()
export const ALTERNATE_HEAVY_HAMMER = new AlternateHeavyHammer()