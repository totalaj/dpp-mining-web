
export class Vector2 {
    public x: number
    public y: number

    constructor(x:number, y:number) {
        this.x = x
        this.y = y
    }

    public copy(): Vector2 {
        return new Vector2(this.x, this.y)
    }

    public subtract(subtrahend: Vector2) : Vector2 {
        return new Vector2(this.x - subtrahend.x, this.y - subtrahend.y)
    }

    public add(addend: Vector2) : Vector2 {
        return new Vector2(this.x + addend.x, this.y + addend.y)
    }

    public mul(multiplier: number) : Vector2 {
        return new Vector2(this.x * multiplier, this.y * multiplier)
    }
}