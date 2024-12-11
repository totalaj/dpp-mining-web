export function set_translation(element: HTMLElement, tile_size: number, x_tiles: number, y_tiles: number) {
    element.style.translate = `${Math.floor(tile_size * x_tiles)}px ${Math.floor(tile_size * y_tiles)}px`
}