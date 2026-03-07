const screen=document.getElementById("screen")

export function render(html){

screen.innerHTML=html

}

export function button(text,action){

return `<button onclick="${action}">${text}</button>`

}

export function passPhone(name, action){

render(`

<div class="card">

<div class="pass-screen">

<p>Pass the phone to</p>

<h2>${name}</h2>

<button onclick="${action}">I'm ready</button>

</div>

</div>

`)

}