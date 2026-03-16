const screen=document.getElementById("screen")

export function render(html){
document.getElementById("app").innerHTML = html
}

export function button(text,action){

return `<button onclick="${action}">${text}</button>`

}

export function passPhone(name, action){
  render(`
    <div class="pass-screen">
      <p class="pass-label">PASS THE PHONE</p>

      <div class="card pass-card">
        <h1 class="pass-player"><strong>${name}</strong></h1>
        <button onclick="${action}">I'm Ready</button>
      </div>
    </div>
  `)
}