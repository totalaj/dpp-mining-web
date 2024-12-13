type SaveableValue = boolean | string | number
export function Saveable(key: string, default_value: SaveableValue) {
    return function(target: any, propertyKey: string) { 
      let value: SaveableValue;

      const getter = function() {
        console.log("Current value", value)
        if (!value) {
            const item = window.localStorage.getItem(key)
            console.log("Item read as", item)
            if (item) {
                const type = typeof default_value
                if (type === 'boolean') {
                    value = item === "true"
                } else if (type === 'number') {
                    value = Number.parseFloat(item)
                } else {
                    value = item
                }
                console.log("Loaded value as", value)
            } else {
                value = default_value
                console.log("No saved value found! Setting default value:", value)
            }
        }
        return value
      };
      const setter = function(newVal: SaveableValue) {   
        value = newVal
        window.localStorage.setItem(key, value.toString())
      }; 
      Object.defineProperty(target, propertyKey, {
        get: getter,
        set: setter
      }); 
    }
  }

export class Settings {
    @Saveable("Settings.freeplay", false)
    public static freeplay?: boolean
}