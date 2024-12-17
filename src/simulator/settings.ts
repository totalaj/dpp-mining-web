
export enum GameVersion {
    DIAMOND = 'Diamond',
    PEARL = 'Pearl',
    PLATINUM = 'Platinum'
}

export enum LootPool {
    PRE_DEX_DIAMOND = 0,
    PRE_DEX_PEARL = 1,
    POST_DEX_DIAMOND = 2,
    POST_DEX_PEARL = 3,
    ALL = 4
}

type SaveableValue = boolean | string | number | Enumerator<string>
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
                    else if (type === 'object') {
                        value = item.toString()
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
            if (typeof value === 'object') {
                window.localStorage.setItem(key, value.item())
            }
            else {
                window.localStorage.setItem(key, value.toString())
            }
        }
        Object.defineProperty(target, property_key, {
            get: getter,
            set: setter
        })
    }
}

export class Progress {
    @Saveable('Progress.postgame', false)
    public static postgame: boolean

    @Saveable('Progress.started', false)
    public static has_selected_version: boolean
}

export class Settings {
    @Saveable("Settings.freeplay", false)
    public static freeplay: boolean

    @Saveable("Settings.screen_shake", true)
    public static screen_shake: boolean

    @Saveable("Settings.version", GameVersion.DIAMOND)
    public static game_version: GameVersion

    @Saveable("Settings.version_parity", true)
    public static random_version_parity: boolean

    public static get_lootpool(): LootPool {
        switch (this.game_version) {
            case GameVersion.DIAMOND:
                return Progress.postgame ? LootPool.POST_DEX_DIAMOND : LootPool.PRE_DEX_DIAMOND
            case GameVersion.PEARL:
                return Progress.postgame ? LootPool.POST_DEX_PEARL : LootPool.PRE_DEX_PEARL
            case GameVersion.PLATINUM:
                return this.random_version_parity
                    ? (Progress.postgame ? LootPool.POST_DEX_DIAMOND : LootPool.PRE_DEX_DIAMOND)
                    : (Progress.postgame ? LootPool.POST_DEX_PEARL : LootPool.PRE_DEX_PEARL)
            default:
                return LootPool.ALL
        }
    }
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

function create_button_input(parent_element: HTMLElement, text: string): HTMLButtonElement {
    const element = parent_element.appendChild(document.createElement('button'))
    element.className = 'setting'
    element.id = 'button-setting'
    element.innerText = text

    return element
}

export function create_settings_element(): HTMLElement {
    const settings_element = document.createElement('div')
    settings_element.id = "settings"

    // const freeplay = create_boolean_input(settings_element, !!Settings.freeplay, "Freeplay")
    // freeplay.oninput = (): void => { Settings.freeplay = freeplay.checked }

    const screen_shake = create_boolean_input(settings_element, !!Settings.screen_shake, "Screen shake")
    screen_shake.oninput = (): void => { Settings.screen_shake = screen_shake.checked }

    const reset_version = create_button_input(settings_element, 'Reset version')
    reset_version.onclick = (): void => { window.localStorage.removeItem("Progress.started") }

    const reset_button = create_button_input(settings_element, 'CLEAR ALL DATA')
    reset_button.onclick = (): void => { window.localStorage.clear() }

    return settings_element
}