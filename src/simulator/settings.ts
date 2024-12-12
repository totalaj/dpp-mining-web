class Storable<T extends string | number | boolean> {

    constructor (private parent: any, private default_value: T) {

    }

    private get key(): string {
        const keys = Object.keys(this.parent)
        for (const key in keys) {
            if (this.parent[key] === this) {
                return (typeof this.parent) + key.toString()
            }
        }
        throw new Error(`Storable<${typeof this._value!}> is not child of ${typeof this.parent}!`);
    }

    private _value?: any
    public get value(): T {
        if (!this._value) {
            const item = window.localStorage.getItem(this.key)
            if (item) {
                this._value = (typeof this.default_value) !== 'string' ? Number.parseFloat(item) : item
            } else {
                this.value = this.default_value
            }
        }
        return this._value
    }

    public set value(val: T) {
        this._value = val
        window.localStorage.setItem(this.key, this._value)
    }
}

function StorableDecorator<T extends string | number | boolean>() {
    return function(target: any, propertyKey: string) { 
      let value: T;
      const getter = function() {
        return value!;
      };
      const setter = function(newVal: T) {   
        value = newVal 
      }; 
      Object.defineProperty(target!, propertyKey!, {
        get: getter,
        set: setter
      }); 
    }
  }

export class Settings {

    @StorableDecorator()
    public static freeplay = false

    private static _screen_shake = new Storable<boolean>(this, true)
    static get screen_shake() {
        return this._screen_shake.value
    }
    static set screen_shake(value: typeof this._screen_shake.value) {
        this._screen_shake.value = value
    }
}