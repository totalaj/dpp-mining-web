type Named = { get_name: () => string }

class Storable<T extends string | number | boolean, Parent extends Object & Named> {

    constructor (private parent: Parent, private default_value: T) { }

    private get key(): string {
        const entries = Object.entries(this.parent)

        for (const key in entries) {
            // Keyvalue pair for all properties
            const value = entries[key]
            
            if (value[1] === this) {
                const return_key = this.parent.get_name() + value[0]
                console.log(return_key)
                return return_key
            }
        }

        throw new Error(`Storable<${typeof this._value!}> is not child of ${typeof this.parent}!`);
    }

    private _value?: any
    public get value(): T {
        console.log("Current value", this._value)
        if (!this._value) {
            const item = window.localStorage.getItem(this.key)
            console.log("Item read as", item)
            if (item) {
                const type = typeof this.default_value
                if (type === 'boolean') {
                    this._value = item === "true"
                } else if (type === 'number') {
                    this._value = Number.parseFloat(item)
                } else {
                    this._value = item
                }
                console.log("Loaded value as", this._value)
            } else {
                this.value = this.default_value
                console.log("No saved value found! Setting default value:", this._value)
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

    public static all: Settings = new Settings()

    public get_name(): string { return "Settings" }

    public freeplay = false

    private _screen_shake = new Storable<boolean, Settings>(this, true)
    get screen_shake() {
        return this._screen_shake.value
    }
    set screen_shake(value: typeof this._screen_shake.value) {
        this._screen_shake.value = value
    }
}