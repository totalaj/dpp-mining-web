import { Sprite, SpriteSheet } from "../components/sprite";
import { Vector2 } from "../math";

export function create_sprite_debugger(sheet: SpriteSheet, xTiles: number, yTiles: number) : HTMLElement {
    const sprite_debugger = document.createElement('div')
    const sprite_helper = sprite_debugger.appendChild(document.createElement('div'))
    sprite_helper.style.display = 'grid'
    sprite_helper.style.width = 'fit-content'
    sprite_helper.style.height = 'fit-content'
    const pos_list = sprite_debugger.appendChild(document.createElement('div'))
    const text = pos_list.appendChild(document.createElement('p'))
    text.style.fontFamily = 'monospace'
    var x = 0
    for (let xIndex = 0; xIndex < xTiles; xIndex++) {
        for (let yIndex = 0; yIndex < yTiles; yIndex++) {
            const sprite = new Sprite(sprite_helper, sheet, new Vector2(xIndex, yIndex))  
            sprite.element.style.gridColumn = `${xIndex+1}`
            sprite.element.style.gridRow = `${yIndex+1}`
            sprite.element.style.backgroundColor = 'hotpink'
            sprite.element.onmouseenter = () => {
            sprite.element.style.filter = 'brightness(1.25) contrast(1.5)'
            text.innerHTML = `${xIndex} x ${yIndex}`
            }
            sprite.element.onmouseleave = () => {
            sprite.element.style.filter = 'initial'
            text.innerHTML = ''
            }
            sprite.element.onclick = () => {
            
            const clicked_text = pos_list.appendChild(document.createElement('p'))
            clicked_text.style.fontFamily = 'monospace'
            clicked_text.innerHTML = text.innerHTML
            }
        }
    }

    return sprite_debugger
}