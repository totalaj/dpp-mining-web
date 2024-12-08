import { MiningGrid } from "./simulator/board";
import { GridObject } from "./simulator/objects";
import { create_sprite_debugger } from "./utils/sprite_debug";

function component() {
    const element = document.createElement('div');
    element.style.display = 'flex'
    element.style.flexWrap = 'wrap'

    for (let index = 0; index < 1; index++) {
      new MiningGrid(element)
    }
    
    element.appendChild(create_sprite_debugger(GridObject.object_sheet, 64, 32))

    return element;
  }
  
document.body.appendChild(component());