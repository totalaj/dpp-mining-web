type SaveableValue = boolean | string | number
export function Saveable(key: string, default_value: SaveableValue) {
    return function(target: any, propertyKey: string) { 
      let value: SaveableValue;

      const getter = function() {
        if (!value) {
            const item = window.localStorage.getItem(key)
            if (item) {
                const type = typeof default_value
                if (type === 'boolean') {
                    value = item === "true"
                } else if (type === 'number') {
                    value = Number.parseFloat(item)
                } else {
                    value = item
                }
            } else {
                value = default_value
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

    @Saveable("Settings.screen_shake", true)
    public static screen_shake?: boolean
}


function create_boolean_input(parent_element: HTMLElement, default_value: boolean, text: string) : HTMLInputElement {
    const element =  parent_element.appendChild(document.createElement('div'))
    element.className = "setting"
    element.id = "boolean-setting"

    const input_element = element.appendChild(document.createElement('input'))
    input_element.type = 'checkbox'
    input_element.checked = default_value

    const text_element = element.appendChild(document.createElement('p'))
    text_element.innerText = text
    return input_element
}

export function settings_element() : HTMLElement {
    const settings_element = document.createElement('div')

    const freeplay = create_boolean_input(settings_element, !!Settings.freeplay, "Freeplay")
    freeplay.oninput = () => { Settings.freeplay = freeplay.checked }
    
    const screen_shake = create_boolean_input(settings_element, !!Settings.screen_shake, "Screen shake")
    screen_shake.oninput = () => { Settings.screen_shake = screen_shake.checked }
    
    return settings_element
}