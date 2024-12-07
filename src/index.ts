import { Sprite, SpriteSheet } from "./components/sprite";
import { Vector2 } from "./math";
import { MiningGrid } from "./simulator/board";

function component() {
    const element = document.createElement('div');
    
    new MiningGrid(element)
    
    return element;
  }
  
document.body.appendChild(component());