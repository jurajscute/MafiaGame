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

      <div class="card role-pass-card pass-phone-card">

        <div class="role-pass-hero">
          <div class="role-pass-kicker">Pass the Phone</div>

          <h2 class="role-pass-title">
            ${name}
          </h2>

          <div class="role-pass-subtitle">
           Greetings ${name}, make sure no one can see your screen.
           </div>
        </div>

        <div class="reveal-role-description-wrap">
          <p class="role-description reveal-role-description">
            When you're ready, continue privately.
          </p>
        </div>

        <div class="role-pass-actions">
          <button class="primary-btn" onclick="${action}">
            I'm Ready
          </button>
        </div>

      </div>

    </div>

  `)
}