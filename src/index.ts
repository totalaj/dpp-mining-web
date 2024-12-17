/* eslint-disable @typescript-eslint/no-unused-vars */
import { animate_remove_text, animate_text } from "./simulator/animations"
import { ActiveObject, GameState, MiningGrid } from "./simulator/board"
import { Collection } from "./simulator/collection"
import { create_settings_element, GameVersion, Progress, Settings } from "./simulator/settings"
import { Vector2 } from "./math"
import { SpriteSheet } from "./components/sprite"
import { create_sprite_debugger } from "./utils/sprite_debug"

const ELEMENT = document.createElement('div')
ELEMENT.id = 'main-content'

const GRID = new MiningGrid(ELEMENT)

const LOWER_BAR = ELEMENT.appendChild(document.createElement('div'))
LOWER_BAR.className = 'horizontal-spread'

const TEXT = LOWER_BAR.appendChild(document.createElement('h2'))
TEXT.style.background = 'white'
TEXT.style.minWidth = '13em'
TEXT.style.textAlign = 'center'
TEXT.style.borderStyle = 'inset'
TEXT.innerHTML = '&zwnj;'

GRID.on_game_start = (objects: ActiveObject[]): void => {
    TEXT.innerText = `${objects.length} items detected`
}

GRID.on_game_end = (): void => {
    TEXT.innerHTML = '&zwnj;'
}

const TITLE = document.body.appendChild(document.createElement('h1'))
// style="text-align: center;" class="title"
TITLE.style.textAlign = 'center'
TITLE.className = 'title'

function get_version_text(version?: GameVersion): string {
    console.log(version)
    switch (version) {
        case GameVersion.DIAMOND:
            return 'Pokémon Diamond underground mining game simulator'
        case GameVersion.PEARL:
            return 'Pokémon Pearl underground mining game simulator'
        case GameVersion.PLATINUM:
            return 'Pokémon Platinum underground mining game simulator'
        default:
            return 'NO VERSION'
    }
}

document.body.appendChild(ELEMENT)
document.body.appendChild(Collection.create_collection_element())
document.body.appendChild(create_settings_element())

if (Progress.has_selected_version) {
    TITLE.innerText = get_version_text(Settings.game_version)
}
else {
    TITLE.innerText = 'Select a version'
    GRID.on_version_selected = (version: GameVersion): void => {
        animate_remove_text(TITLE).on_complete = (): void => {
            animate_text(TITLE, get_version_text(version))
        }
    }
}
