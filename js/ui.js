import {state} from "./state.js"
const screen=document.getElementById("screen")

export function render(html){
document.getElementById("app").innerHTML = html
}

export function button(text,action){

return `<button onclick="${action}">${text}</button>`

}

export function passPhone(name, action){
  const isMorningStyle =
    state.phase === "voting" ||
    document.body.classList.contains("day")

  render(`
    <div class="pass-screen ${isMorningStyle ? "pass-screen-morning" : "pass-screen-night"}">
      <div class="card ${isMorningStyle ? "pass-card-morning" : "pass-card"}">

        <div class="pass-phone-hero ${isMorningStyle ? "pass-phone-hero-morning" : "pass-phone-hero-night"}">
          <div class="pass-label">
            ${isMorningStyle ? "DAY PHASE" : "PASS THE PHONE"}
          </div>

          <h1 class="pass-player"><strong>${name}</strong></h1>

          <p class="role-description pass-phone-description">
            ${
              isMorningStyle
                ? "Hand the phone to the next player for the vote."
                : "Make sure nobody else is looking before continuing."
            }
          </p>
        </div>

        <button class="${isMorningStyle ? "morning-btn" : ""}" onclick="${action}">
  ${isMorningStyle ? "Start My Vote" : "I'm Ready"}
</button>
      </div>
    </div>
  `)
}