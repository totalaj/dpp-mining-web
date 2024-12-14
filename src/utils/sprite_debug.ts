import { Sprite, SpriteSheet } from "../components/sprite"
import { Vector2 } from "../math"

export function create_sprite_debugger(sheet: SpriteSheet, x_tiles: number, y_tiles: number) : HTMLElement {
    const sprite_debugger = document.createElement('div')
    const sprite_helper = sprite_debugger.appendChild(document.createElement('div'))
    sprite_helper.style.display = 'grid'
    sprite_helper.style.width = 'fit-content'
    sprite_helper.style.height = 'fit-content'
    const pos_list = sprite_debugger.appendChild(document.createElement('div'))
    const text = pos_list.appendChild(document.createElement('p'))
    text.style.fontFamily = 'monospace'
    for (let x_index = 0; x_index < x_tiles; x_index++) {
        for (let y_index = 0; y_index < y_tiles; y_index++) {
            const sprite = new Sprite(sprite_helper, sheet, new Vector2(x_index, y_index))  
            sprite.element.style.gridColumn = `${x_index+1}`
            sprite.element.style.gridRow = `${y_index+1}`
            sprite.element.style.backgroundColor = 'hotpink'
            sprite.element.onmouseenter = (): void => {
            sprite.element.style.filter = 'brightness(1.25) contrast(1.5)'
            text.innerHTML = `${x_index} x ${y_index}`
            }
            sprite.element.onmouseleave = (): void => {
            sprite.element.style.filter = 'initial'
            text.innerHTML = ''
            }
            sprite.element.onclick = (): void => {
            
            const clicked_text = pos_list.appendChild(document.createElement('p'))
            clicked_text.style.fontFamily = 'monospace'
            clicked_text.innerHTML = text.innerHTML
            }
        }
    }

    return sprite_debugger
}