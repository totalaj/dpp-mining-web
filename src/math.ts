
export class Vector2 {
    public x: number
    public y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }

    public copy(): Vector2 {
        return new Vector2(this.x, this.y)
    }

    public subtract(subtrahend: Vector2): Vector2 {
        return new Vector2(this.x - subtrahend.x, this.y - subtrahend.y)
    }

    public add(addend: Vector2): Vector2 {
        return new Vector2(this.x + addend.x, this.y + addend.y)
    }

    public mul(multiplier: number): Vector2 {
        return new Vector2(this.x * multiplier, this.y * multiplier)
    }

    public magnitude(): number {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2))
    }

    public normalize(): Vector2 {
        const length = this.magnitude()
        if (length === 0) {
            return new Vector2(1, 0)
        }
        return new Vector2(this.x / length, this.y / length)
    }
}