import { Collection } from "./collection"
import { SMALL_SPHERES, LARGE_SPHERES, FOSSILS, EVOLUTION_STONES, SHARDS, WEATHER_STONES, ITEMS, PLATES, get_all_objects } from "./objects"

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
    @Saveable('Progress.started', false)
    public static has_selected_version: boolean

    @Saveable('Progress.postgame', false)
    public static postgame: boolean

    @Saveable('Progress.finished_collection', false)
    public static finished_collection: boolean
}

export class Statistics {
    @Saveable('Statistics.rounds_played', 0)
    public static rounds_played: number

    @Saveable('Statistics.heavy_hammer_hits', 0)
    public static heavy_hammer_hits: number

    @Saveable('Statistics.light_hammer_hits', 0)
    public static light_hammer_hits: number

    @Saveable('Statistics.full_clears', 0)
    public static full_clears: number

    @Saveable('Statistics.modifiers_purchased', 0)
    public static modifiers_purchased: number

    @Saveable('Statistics.time_played', 0)
    public static time_played_seconds: number

    @Saveable('Statistics.times_hit_bedrock', 0)
    public static times_hit_bedrock: number

    @Saveable('Statistics.times_hit_items', 0)
    public static times_hit_items: number

    @Saveable('Statistics.times_hit_nothing', 0)
    public static times_hit_nothing: number
}

export class Settings {
    @Saveable("Settings.freeplay", false)
    public static freeplay: boolean

    @Saveable("Settings.screen_shake", true)
    public static screen_shake: boolean

    @Saveable("Settings.version", GameVersion.DIAMOND)
    public static game_version: GameVersion

    // True = Diamond, False = Pearl
    @Saveable("Settings.version_parity", true)
    public static random_version_parity: boolean

    public static get_lootpool(): LootPool {
        return this.calculate_lootpool(Settings.game_version, Progress.postgame, this.random_version_parity)
    }

    public static calculate_lootpool(version: GameVersion, postgame: boolean, parity: boolean): LootPool {
        switch (version) {
            case GameVersion.DIAMOND:
                return postgame ? LootPool.POST_DEX_DIAMOND : LootPool.PRE_DEX_DIAMOND
            case GameVersion.PEARL:
                return postgame ? LootPool.POST_DEX_PEARL : LootPool.PRE_DEX_PEARL
            case GameVersion.PLATINUM:
                return parity
                    ? (postgame ? LootPool.POST_DEX_DIAMOND : LootPool.PRE_DEX_DIAMOND)
                    : (postgame ? LootPool.POST_DEX_PEARL : LootPool.PRE_DEX_PEARL)
            default:
                return LootPool.ALL
        }
    }

    public static get_squashed_version(): GameVersion {
        switch (Settings.game_version) {
            case GameVersion.DIAMOND:
                return GameVersion.DIAMOND
            case GameVersion.PEARL:
                return GameVersion.PEARL
            case GameVersion.PLATINUM:
                return Settings.random_version_parity ? GameVersion.DIAMOND : GameVersion.PEARL
            default:
                return GameVersion.DIAMOND
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

    const fill_collection = create_button_input(settings_element, 'Fill collection')
    fill_collection.onclick = (): void => {
        get_all_objects().forEach((object) => {
            if (!PLATES.includes(object)) Collection.add_item(object)
        })
    }

    const debug_print = create_button_input(settings_element, 'Print drop chances')
    debug_print.onclick = (): void => {
        // const loot_pool = Settings.calculate_lootpool(GameVersion.DIAMOND, true, false)
        function print_loot_pool(loot_pool: LootPool): void {
            console.log(`Printing loot pool: ${LootPool[loot_pool]}`)
            const all_items = [ ...SMALL_SPHERES, ...LARGE_SPHERES, ...FOSSILS, ...EVOLUTION_STONES, ...SHARDS, ...WEATHER_STONES, ...ITEMS, ...PLATES ]
            let total_chance = 0
            all_items.forEach((item) => {
                total_chance += item.get_weight(loot_pool)
            })

            all_items.sort((a, b) => b.get_weight(loot_pool) - a.get_weight(loot_pool))

            console.log("Total weight:", total_chance)

            all_items.forEach((item) => {
                const weight = item.get_weight(loot_pool)
                const alpha = weight / total_chance
                const per_board_chance = 1 - Math.pow(1 - alpha, 3)
                const percentage = alpha * 100
                const percentage_text = `${Math.floor(percentage * 100) / 100}%`
                if (weight > 0) {
                    console.log(`Chance of ${item.name}:`, weight, `${percentage_text}, about 1 in ${Math.floor(1 / per_board_chance)} in a board`)
                }
                else {
                    console.log(`Chance of ${item.name}:`, weight, `${percentage_text}, not available in the ${LootPool[loot_pool]} loot pool`)
                }
            })
        }

        print_loot_pool(LootPool.PRE_DEX_DIAMOND)
        print_loot_pool(LootPool.PRE_DEX_PEARL)
        print_loot_pool(LootPool.POST_DEX_DIAMOND)
        print_loot_pool(LootPool.POST_DEX_PEARL)
        print_loot_pool(LootPool.ALL)
    }

    return settings_element
}