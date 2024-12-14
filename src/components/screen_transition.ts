import { GLOBAL_FRAME_RATE } from "../simulator/animations"

export const SHUTTER_ANIMATION_FRAMES = 12
export function shutter_animation(parent_element: HTMLElement, direction: boolean) : HTMLElement {
    const element = parent_element.appendChild(document.createElement('div'))
    element.id = 'overlay'
    const top_rect = element.appendChild(document.createElement('div'))
    top_rect.className = "overlay-element"
    top_rect.style.background = 'black'
    top_rect.style.height = '50%'
    top_rect.style.width = '100%'

    for (let index = 0; index < SHUTTER_ANIMATION_FRAMES; index++) {
        let alpha = index / (SHUTTER_ANIMATION_FRAMES - 1)
        alpha = direction ? alpha : (1 - alpha)
        setTimeout(() => {
            top_rect.style.height = `${alpha * 100}%`
        }, index * GLOBAL_FRAME_RATE)
    }

    return element
}

export function circle_animation(parent_element: HTMLElement, direction: boolean) : HTMLElement {
    const element = parent_element.appendChild(document.createElement('div'))
    element.id = 'overlay'
    const top_rect = element.appendChild(document.createElement('div'))
    top_rect.className = "overlay-element"
    top_rect.style.background = 'black'
    top_rect.style.height = '100%'
    top_rect.style.width = '100%'
    top_rect.style.pointerEvents = direction ? 'none' : 'initial'

    const frames = 6
    for (let index = 0; index < frames; index++) {
        let alpha = index / (frames - 1)
        alpha = !direction ? alpha : (1 - alpha)
        setTimeout(() => {
            // top_rect.style.maskImage = `radial-gradient(circle, transparent ${alpha * 50}%, black ${alpha * 50}%)`
            top_rect.style.maskImage = `radial-gradient(circle, transparent ${alpha * 100}%, black ${alpha * 100}%)`
        }, index * GLOBAL_FRAME_RATE)
    }

    setTimeout(() => {
        top_rect.style.pointerEvents = direction ? 'initial' : 'none'
    }, frames * (1000/24))

    return element
}