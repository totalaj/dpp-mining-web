type SaveableValue = boolean | string | number
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Saveable(key: string, default_value: SaveableValue) {
    return (target: any, property_key: string): void => {
        let value: SaveableValue

        const getter = (): SaveableValue => {
            if (!value) {
                const item = window.localStorage.getItem(key)
                if (item) {
                    const type = typeof default_value
                    if (type === 'boolean') {
                        value = item === "true"
                    }
                    else if (type === 'number') {
                        value = Number.parseFloat(item)
                    }
                    else {
                        value = item
                    }
                }
                else {
                    value = default_value
                }
            }
            return value
        }
        const setter = (new_val: SaveableValue): void => {
            value = new_val
            window.localStorage.setItem(key, value.toString())
        }
        Object.defineProperty(target, property_key, {
            get: getter,
            set: setter
        })
    }
}

export class Settings {
    @Saveable("Settings.freeplay", false)
    public static freeplay?: boolean

    @Saveable("Settings.screen_shake", true)
    public static screen_shake?: boolean
}


function create_boolean_input(parent_element: HTMLElement, default_value: boolean, text: string): HTMLInputElement {
    const element = parent_element.appendChild(document.createElement('div'))
    element.className = "setting"
    element.id = "boolean-setting"

    const input_element = element.appendChild(document.createElement('input'))
    input_element.type = 'checkbox'
    input_element.checked = default_value

    const text_element = element.appendChild(document.createElement('p'))
    text_element.innerText = text
    text_element.className = "setting-text inverted-text"
    return input_element
}

export function create_settings_element(): HTMLElement {
    const settings_element = document.createElement('div')
    settings_element.id = "settings"

    // const freeplay = create_boolean_input(settings_element, !!Settings.freeplay, "Freeplay")
    // freeplay.oninput = (): void => { Settings.freeplay = freeplay.checked }

    const screen_shake = create_boolean_input(settings_element, !!Settings.screen_shake, "Screen shake")
    screen_shake.oninput = (): void => { Settings.screen_shake = screen_shake.checked }

    return settings_element
}