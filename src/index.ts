import { MiningGrid } from "./simulator/board";

function component() {
    const element = document.createElement('div');
    element.id = 'main-content'

    const grid = new MiningGrid(element)

    const lower_bar = element.appendChild(document.createElement('div'))
    lower_bar.className = 'horizontal-spread'

    const notification_text = lower_bar.appendChild(document.createElement('p'))
    const reset_button = lower_bar.appendChild(document.createElement('button'))

    
    grid.on_game_end = () => {
      const all_found = grid.added_items.every((item) => item.has_been_found)
      
      let text = all_found ? "Everything was dug up!" : "The wall collapsed!"
      
      grid.added_items.forEach((item) => {
        if (item.has_been_found) {
          text += `<br>You obtained a ${item.object_ref.name}!`
        }
      })

      notification_text.innerHTML = text
    }
    
    reset_button.innerText = "New board"
    reset_button.onclick = () => {
      grid.reset_board()
      notification_text.innerHTML = `Something pinged in the wall!<br>${grid.added_items.length} confirmed!`
    }

    notification_text.innerHTML = `Something pinged in the wall!<br>${grid.added_items.length} confirmed!`
    
    return element;
  }
  
document.body.appendChild(component());