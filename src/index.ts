import { MiningGrid } from "./simulator/board";

function component() {
    const element = document.createElement('div');
    element.style.display = 'flex'
    element.style.flexWrap = 'wrap'

    for (let index = 0; index < 1; index++) {
      new MiningGrid(element)
    }
    
    return element;
  }
  
document.body.appendChild(component());