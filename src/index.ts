
import { animate_text } from "./simulator/animations"
import { GameState, MiningGrid } from "./simulator/board"
import { Collection } from "./simulator/collection"
import { create_settings_element } from "./simulator/settings"
// eslint-disable-next-line
import { create_sprite_debugger } from "./utils/sprite_debug"

function component(): HTMLDivElement {
    const element = document.createElement('div')
    element.id = 'main-content'

    const grid = new MiningGrid(element, (game_state: GameState) => {
        let text = game_state.failed ? "The wall collapsed!" : "Everything was dug up!"

        grid.added_items.forEach((item) => {
            if (item.has_been_found) {
                text += `\nYou obtained a ${item.object_ref.name}!`
            }
        })

        animate_text(notification_text, text)
    })

    const lower_bar = element.appendChild(document.createElement('div'))
    lower_bar.className = 'horizontal-spread'

    const notification_text = lower_bar.appendChild(document.createElement('p'))
    const reset_button = lower_bar.appendChild(document.createElement('button'))

    reset_button.innerText = "New board"
    reset_button.onclick = (): void => {
        grid.reset_board()
        animate_text(notification_text, `Something pinged in the wall!\n${grid.added_items.length} confirmed!`)
    }

    animate_text(notification_text, `Something pinged in the wall!\n${grid.added_items.length} confirmed!`)

    // element.appendChild(create_sprite_debugger(new SpriteSheet(5, './assets/health_bar.png', new Vector2(128, 128), 3), 24, 20))

    element.appendChild(create_settings_element())

    return element
}

document.body.appendChild(component())
document.body.appendChild(Collection.create_collection_element())