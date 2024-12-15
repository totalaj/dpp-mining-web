/* eslint-disable @typescript-eslint/no-unused-vars */
import { animate_text } from "./simulator/animations"
import { ActiveObject, GameState, MiningGrid } from "./simulator/board"
import { Collection } from "./simulator/collection"
import { create_settings_element } from "./simulator/settings"
import { Vector2 } from "./math"
import { SpriteSheet } from "./components/sprite"
import { create_sprite_debugger } from "./utils/sprite_debug"

function component(): HTMLDivElement {
    const element = document.createElement('div')
    element.id = 'main-content'

    const grid = new MiningGrid(element)

    const lower_bar = element.appendChild(document.createElement('div'))
    lower_bar.className = 'horizontal-spread'

    const text = lower_bar.appendChild(document.createElement('h2'))

    grid.on_game_start = (objects: ActiveObject[]): void => {
        text.innerText = `${objects.length} items detected`
    }

    grid.on_game_end = (): void => {
        text.innerText = ''
    }

    grid.reset_board()
    return element
}

document.body.appendChild(component())
const COLLECTION = document.body.appendChild(Collection.create_collection_element())
COLLECTION.appendChild(create_settings_element())