const screen=document.getElementById("screen")

export function render(html){

screen.innerHTML=html

}

export function button(text,action){

return `<button onclick="${action}">${text}</button>`

}

export function passPhone(playerName, nextAction){

render(`

<div class="card">

<h2>Pass the phone to</h2>

<h1>${playerName}</h1>

<button onclick="${nextAction}">Ready</button>

</div>

`)

}