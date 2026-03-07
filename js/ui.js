const screen=document.getElementById("screen")

export function render(html){

screen.innerHTML=html

}

export function button(text,action){

return `<button onclick="${action}">${text}</button>`

}