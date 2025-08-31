/* eslint-disable @typescript-eslint/no-unused-vars */
import { animate_remove_text, animate_text } from "./simulator/animations"
import { MiningGrid } from "./simulator/board"
import { Collection } from "./simulator/collection"
import { create_settings_element, GameVersion, Progress, Settings, Statistics } from "./simulator/settings"
import { Vector2 } from "./math"
import { SpriteSheet } from "./components/sprite"
import { create_sprite_debugger } from "./utils/sprite_debug"

const MAIN_CONTENT = document.createElement('div')
MAIN_CONTENT.id = 'main-content'

const GRID = new MiningGrid(MAIN_CONTENT)

const LOWER_BAR = MAIN_CONTENT.appendChild(document.createElement('div'))
LOWER_BAR.className = 'horizontal-spread'

const TITLE = document.body.appendChild(document.createElement('h1'))
// style="text-align: center;" class="title"
TITLE.style.textAlign = 'center'
TITLE.className = 'title'

const RESET = document.createElement('button')
RESET.innerText = "Reset all progress"
RESET.style.position = 'absolute'
RESET.style.right = '10%'

let RESET_FLAG = false
const RESET_TIME = 2000
let RESET_COUNT = 0
RESET.onmousedown = (): void => {
    RESET_FLAG = true
}

RESET.onmouseup = (): void => {
    RESET_FLAG = false
}

let TIME = Date.now()
function count_reset(): void {
    const dt = Date.now() - TIME
    TIME = Date.now()
    if (RESET_FLAG) {
        RESET_COUNT += dt
        // Set style

        const percentage = ((RESET_COUNT / RESET_TIME) * 100.0).toFixed(1) + '%'
        
        console.log(percentage)

        RESET.style.background = `linear-gradient(90deg, red ${percentage}, white 0%)`
    } else if (RESET_COUNT > 0) {
        // Reset style
        RESET.style.background = ''
        RESET_COUNT = 0
    }

    if (RESET_COUNT >= RESET_TIME) {
        window.localStorage.clear()
        location.reload()
    } else {
        requestAnimationFrame(count_reset)
    }
}

requestAnimationFrame(count_reset)

function get_version_text(version?: GameVersion): string {
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

if (Progress.has_selected_version) {
    GRID.reset_board()
}

document.body.appendChild(MAIN_CONTENT)
// document.body.appendChild(create_sprite_debugger(new SpriteSheet(16, './assets/board_sheet.png', new Vector2(512, 512), 3), 32, 32))
const COLLECTION = document.body.appendChild(Collection.create_collection_element())
document.body.appendChild(create_settings_element())

COLLECTION.appendChild(RESET)

const SECONDS_INTERVAL = 1
setInterval(() => {
    Statistics.time_played_seconds += SECONDS_INTERVAL
}, 1000 * SECONDS_INTERVAL)