import { GameVersion, Progress, Settings } from "./settings"

type VersionReturnValue = { element: HTMLElement, on_selected?: (version: GameVersion) => void }
export function create_version_selector(): VersionReturnValue {
    const element = document.createElement('div')
    element.id = 'version-selector'

    const return_value: VersionReturnValue = { element: element }


    let version: GameVersion = GameVersion.DIAMOND

    function select_version(new_version: GameVersion, class_names: string, text: string): void {
        console.log("select_version")
        version = new_version
        confirm_button.className = class_names
        confirm_title.innerText = `Confirm choosing ${text} version?`
        confirm_element.classList.remove('transparent')
        select_element.classList.add('transparent')
        confirm_element.style.pointerEvents = ''
        select_element.style.pointerEvents = 'none'
    }

    function finalize_version(): void {
        console.log("finalize_version")
        Settings.game_version = version
        Settings.random_version_parity = Math.random() > 0.5
        Progress.has_selected_version = true

        confirm_element.classList.add('transparent')
        confirm_element.style.pointerEvents = 'none'

        const white_fade = element.appendChild(document.createElement('div'))
        white_fade.style.background = 'white'
        white_fade.className = 'simple-overlay animate-opacity transparent'
        setTimeout(() => {
            white_fade.classList.remove('transparent')
        }, 0)
        const black_fade = element.appendChild(document.createElement('div'))
        black_fade.style.background = 'black'
        black_fade.style.zIndex = '1'
        black_fade.className = 'simple-overlay animate-opacity transparent'

        setTimeout(() => {
            black_fade.classList.remove('transparent')
        }, 1000)
        setTimeout(() => {
            element.remove()
            return_value.on_selected?.(version)
        }, 2500)
    }

    function cancel_finalize(): void {
        console.log("cancel_finalize")
        confirm_element.classList.add('transparent')
        select_element.classList.remove('transparent')
        confirm_element.style.pointerEvents = 'none'
        select_element.style.pointerEvents = ''
    }

    const select_element = element.appendChild(document.createElement('div'))
    const confirm_element = element.appendChild(document.createElement('div'))
    select_element.className = 'simple-overlay'
    confirm_element.className = 'simple-overlay'

    const title = select_element.appendChild(document.createElement('h1'))
    title.innerText = "Select a version"
    title.className = 'inverted-text'
    title.style.width = '100%'
    title.style.textAlign = 'center'

    const upper_spread = select_element.appendChild(document.createElement('div'))
    upper_spread.className = 'centered-spread'
    const diamond_button = upper_spread.appendChild(document.createElement('button'))
    diamond_button.id = 'version-button'
    diamond_button.className = 'diamond inverted-text'
    diamond_button.innerText = "Diamond"
    diamond_button.onclick = (): void => {
        select_version(GameVersion.DIAMOND, diamond_button.className, diamond_button.innerText)
    }
    const pearl_button = upper_spread.appendChild(document.createElement('button'))
    pearl_button.id = 'version-button'
    pearl_button.className = 'pearl inverted-text'
    pearl_button.innerText = "Pearl"
    pearl_button.onclick = (): void => {
        select_version(GameVersion.PEARL, pearl_button.className, pearl_button.innerText)
    }
    const lower_spread = select_element.appendChild(document.createElement('div'))
    lower_spread.className = 'centered-spread'
    lower_spread.style.flexDirection = 'column'
    const platinum_button = lower_spread.appendChild(document.createElement('button'))
    platinum_button.id = 'version-button'
    platinum_button.className = 'platinum inverted-text'
    platinum_button.innerText = "Platinum"
    platinum_button.onclick = (): void => {
        select_version(GameVersion.PLATINUM, platinum_button.className, platinum_button.innerText)
    }
    const platinum_text = lower_spread.appendChild(document.createElement('p'))
    platinum_text.innerText = 'Random loot pool'
    platinum_text.className = 'inverted-text'

    const confirm_spread = confirm_element.appendChild(document.createElement('div'))
    confirm_spread.className = 'centered-spread'
    confirm_spread.style.flexDirection = 'column'


    const confirm_title = confirm_spread.appendChild(document.createElement('h1'))
    confirm_title.innerText = '[PLACEHOLDER]'
    confirm_title.className = 'inverted-text'

    const confirm_text = confirm_spread.appendChild(document.createElement('p'))
    confirm_text.innerText = 'This cannot be changed later'
    confirm_text.className = 'inverted-text'

    const confirm_button = confirm_spread.appendChild(document.createElement('button'))
    confirm_button.id = 'version-button'
    confirm_button.className = 'platinum inverted-text'
    confirm_button.innerText = "Confirm?"
    confirm_button.onclick = (): void => {
        finalize_version()
    }
    const cancel_button = confirm_spread.appendChild(document.createElement('button'))
    cancel_button.style.marginTop = '2em'
    cancel_button.id = 'version-button'
    cancel_button.innerText = "Cancel"
    cancel_button.onclick = (): void => {
        cancel_finalize()
    }

    select_element.classList.add('animate-opacity')
    confirm_element.classList.add('animate-opacity')
    cancel_finalize()

    return return_value
}