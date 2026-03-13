import {state} from "./state.js"
import {addLogEntry} from "./state.js"
import {roles} from "./roles.js"
import {shuffle,mafiaCount} from "./utils.js"
import {render} from "./ui.js"
import {
startNight,
startVoting,
nextNightTurn,
revealNightRole,
performNightAction,
showVoteOptions,
castVote
} from "./phases.js"

const roleColors = {
mafia: "#e74c3c",
doctor: "#2e8dcc",
sheriff: "#e4c200",
villager: "#8dc2ff",
jester: "#ff3ea5",
executioner: "#7a2f6f"
}

window.updateRoleCount = function(role,value){

state.roleCounts[role] = Number(value)

localStorage.setItem(
"mafiaRoleCounts",
JSON.stringify(state.roleCounts)
)

}

function showInfo(){

openModal(`

<div class="modal-content">

<h2>Game Rules</h2>

<h3 style="color:${roleColors.mafia}">Mafia</h3>
<p>Chooses one player to eliminate each night.</p>

<h3 style="color:${roleColors.doctor}">Doctor</h3>
<p>Can protect one player from elimination.</p>

<h3 style="color:${roleColors.sheriff}">Sheriff</h3>
<p>Investigates a player to see if they are mafia.</p>

<h3 style="color:${roleColors.jester}">Jester</h3>
<p>Wins if they get voted out during the day.</p>

<h3 style="color:${roleColors.villager}">Villager</h3>
<p>No special power. Help find the mafia.</p>

<button onclick="closeInfo()">Close</button>

</div>

`)

}

window.toggleRolesSection = function(){

state.rolesSectionOpen = !state.rolesSectionOpen

let panel = document.getElementById("roles-section-content")
let arrow = document.querySelector("#roles-section-wrap .section-arrow")

if(panel){
panel.classList.toggle("show", state.rolesSectionOpen)
}

if(arrow){
arrow.style.transform = state.rolesSectionOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.togglePresetsSection = function(){

state.presetsSectionOpen = !state.presetsSectionOpen

let panel = document.getElementById("presets-section-content")
let arrow = document.querySelector("#presets-section-wrap .section-arrow")

if(panel){
panel.classList.toggle("show", state.presetsSectionOpen)
}

if(arrow){
arrow.style.transform = state.presetsSectionOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.resetSettings = function(){

state.rolesEnabled = {
doctor: false,
sheriff: false,
jester: false,
executioner: false
}

state.roleWeights = {
doctor: 50,
sheriff: 50,
jester: 50,
executioner: 50
}

state.roleCounts = {
doctor: 1,
sheriff: 1,
jester: 1,
executioner: 1
}

state.doctorRevealSave = false
state.sheriffExactReveal = false
state.mafiaCountOverride = 0

state.doctorExtraOpen = false
state.sheriffExtraOpen = false
state.rolesSectionOpen = true
state.presetsSectionOpen = false

localStorage.setItem("mafiaRoles", JSON.stringify(state.rolesEnabled))
localStorage.setItem("mafiaRoleWeights", JSON.stringify(state.roleWeights))
localStorage.setItem("mafiaRoleCounts", JSON.stringify(state.roleCounts))
localStorage.setItem("mafiaDoctorReveal", JSON.stringify(state.doctorRevealSave))
localStorage.setItem("mafiaSheriffExactReveal", JSON.stringify(state.sheriffExactReveal))
localStorage.setItem("mafiaCountOverride", JSON.stringify(state.mafiaCountOverride))

showSettings()

}

function initSettingsModal(){

  const modal = document.getElementById("infoModal")
  const modalContent = modal.querySelector(".modal-content")

  if(state.gameStarted){
    modalContent?.classList.add("settings-locked-mode")

    modal.querySelectorAll("input, select, button").forEach(el => {
      if(!el.classList.contains("close-settings-btn")){
        el.disabled = true
      }
    })
  }

  modal.querySelectorAll('.role-weight input[type="range"]').forEach(slider => {
    let role = slider.id.replace("Slider", "")
    updateSlider(slider, role)
  })

}

window.forceRevealRoles = function(){
addLogEntry("Host revealed final roles early.")
showRoleRevealEnd()
}

window.confirmStartGame = function(){

state.gameStarted = true
resetGameTracking()

assignRoles()

revealIndex = 0

showRoleReveal()

}

function showSettings() {
  const modal = document.getElementById("infoModal");
  let rolesContent = ""

  // List of roles we want to display in settings
  const rolesList = ["doctor", "sheriff", "jester", "executioner"];

  let content = `
    <div class="modal-content">
      <h2 class="settings-title">Game Settings</h2>
${state.gameStarted ? `
<div class="settings-locked">
🔒 Settings locked during game
</div>
` : ""}
  `;

content += `

<div class="role-toggle">
  <span>Host Mode</span>
  <label class="switch">
    <input type="checkbox"
      ${state.hostMode ? "checked" : ""}
      onchange="toggleHostMode(this.checked)">
    <span class="slider"></span>
  </label>
</div>

`

  content += `

<div class="settings-section-wrap" id="presets-section-wrap">

  <div class="settings-section-bar" onclick="togglePresetsSection()">
    <span>Presets</span>
    <span class="section-arrow" style="transform:${state.presetsSectionOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="settings-section-content ${state.presetsSectionOpen ? "show" : ""}" id="presets-section-content">
    <div class="preset-grid">
      <button type="button" onclick="applyPreset('classic')">Classic</button>
      <button type="button" onclick="applyPreset('beginner')">Beginner</button>
      <button type="button" onclick="applyPreset('chaotic')">Chaotic</button>
    </div>
  </div>

</div>

`

const playerCount = state.players.length
const mafiaMax = maxAllowedMafia(playerCount)
const autoMafia = playerCount > 0 ? mafiaCount(playerCount) : 1

let mafiaOptions = `<option value="0" ${state.mafiaCountOverride === 0 ? "selected" : ""}>Auto (${autoMafia})</option>`

for(let i = 1; i <= mafiaMax; i++){
let label = i === 1 ? "1 Mafia Member" : `${i} Mafia`
mafiaOptions += `<option value="${i}" ${state.mafiaCountOverride === i ? "selected" : ""}>${label}</option>`
}

content += `

<div class="global-setting-card mafia-setting-card">

  <div class="global-setting-top">
    <span class="global-setting-title" style="color:${roleColors.mafia}">
      Mafia Count
    </span>
    <span class="global-setting-badge">Global</span>
  </div>

  <div class="global-setting-row mafia-setting-row">
    <label for="mafiaCountSelect">How many mafia?</label>

    <select id="mafiaCountSelect" onchange="window.updateMafiaCountOverride(this.value)">
      ${mafiaOptions}
    </select>
  </div>

  <p class="global-setting-note">
    Recommended in Auto mode: <strong>${autoMafia}</strong><br>
    Max allowed with ${playerCount} player${playerCount === 1 ? "" : "s"}: <strong>${mafiaMax}</strong>
  </p>

</div>

`

  rolesList.forEach(role => {
    const enabled = state.rolesEnabled[role];
    const weight = state.roleWeights[role] || 0;
    const color = roleColors[role] || "#fff";

    rolesContent += `
      <div class="role-toggle">
        <span style="color:${color}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
        <label class="switch">
          <input type="checkbox" ${enabled ? "checked" : ""}
            onchange="toggleRole('${role}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>

      <div id="${role}SliderContainer"
        class="role-weight ${role}-slider ${enabled ? "show" : ""}">
        <input type="range"
          id="${role}Slider"
          min="0"
          max="100"
          value="${weight}"
          oninput="updateSlider(this,'${role}'); setRoleWeight('${role}', this.value)">
        <span>${weight}%</span>
      </div>
    `;

    rolesContent += `

<div class="role-count ${enabled ? "show" : ""}" id="${role}-count">

<label>Maximum amount:</label>

<input type="number"
min="1"
max="10"
value="${state.roleCounts[role] || 1}"
onchange="window.updateRoleCount('${role}', this.value)">

</div>

`

if(role === "doctor" && enabled){
rolesContent += `

<div class="doctor-extra-wrap show" id="doctor-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleDoctorExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow">▾</span>
  </div>

  <div class="doctor-extra-settings ${state.doctorExtraOpen ? "show" : ""}" id="doctor-extra-settings">
    <div class="role-toggle doctor-subsetting">
      <span>Reveal Saved Player</span>

      <label class="switch">
        <input type="checkbox"
          ${state.doctorRevealSave ? "checked" : ""}
          onchange="toggleDoctorReveal(this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  </div>

</div>

`
}

if(role === "sheriff" && enabled){
rolesContent += `

<div class="sheriff-extra-wrap show" id="sheriff-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleSheriffExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.sheriffExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="sheriff-extra-settings ${state.sheriffExtraOpen ? "show" : ""}" id="sheriff-extra-settings">
    <div class="role-toggle sheriff-subsetting">
      <span>Reveal Exact Role</span>

      <label class="switch">
        <input type="checkbox"
          ${state.sheriffExactReveal ? "checked" : ""}
          onchange="toggleSheriffExactReveal(this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  </div>

</div>

`
}
  });

  content += `

<div class="settings-section-wrap" id="roles-section-wrap">

  <div class="settings-section-bar" onclick="toggleRolesSection()">
    <span>Roles</span>
    <span class="section-arrow" style="transform:${state.rolesSectionOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="settings-section-content ${state.rolesSectionOpen ? "show" : ""}" id="roles-section-content">
    ${rolesContent}
  </div>

</div>

`

content += `

<button type="button" class="reset-settings-btn" onclick="confirmResetSettings()">
Reset Settings
</button>

`

  content += `<button class="close-settings-btn" onclick="closeInfo()">Close</button></div>`;

if(modal.classList.contains("show")){
  swapModalContent(content, initSettingsModal)
}else{
  openModal(content, initSettingsModal)
}
}

function openModal(content, onOpen){

  const modal = document.getElementById("infoModal")

  modal.classList.remove("hidden")
  modal.classList.remove("show")
  modal.innerHTML = content

  requestAnimationFrame(() => {
    if(onOpen) onOpen()
    modal.classList.add("show")
  })

}

function swapModalContent(newContent, onSwapDone){

  const modal = document.getElementById("infoModal")
  const currentContent = modal.querySelector(".modal-content")

  if(!currentContent){
    openModal(newContent, onSwapDone)
    return
  }

  currentContent.classList.add("modal-content-swap-out")

  setTimeout(() => {
    modal.innerHTML = newContent

    const nextContent = modal.querySelector(".modal-content")
    if(nextContent){
      nextContent.classList.add("modal-content-swap-in")
    }

    if(onSwapDone){
      requestAnimationFrame(() => {
        onSwapDone()
      })
    }
  }, 180)

}

window.confirmResetSettings = function(){

swapModalContent(`

<div class="modal-content reset-confirm-modal">

<h2>Reset Settings?</h2>

<p>This will restore all game settings to their default values.</p>

<div class="reset-confirm-actions">
  <button type="button" class="reset-settings-btn" onclick="resetSettings()">Yes, Reset</button>
  <button type="button" onclick="showSettings()">Cancel</button>
</div>

</div>

`)

}

window.updateSlider = function(slider,role){

let value = slider.value
let percent = (value/slider.max)*100 + "%"

/* get colors from CSS */

let style = getComputedStyle(slider)
let start = style.getPropertyValue("--start")
let end = style.getPropertyValue("--end")

slider.style.background = `
linear-gradient(
90deg,
${start} 0%,
${end} ${percent},
#444 ${percent},
#444 100%
)
`

/* update percentage text */

let label = slider.nextElementSibling
if(label){
label.textContent = value + "%"
}

}

window.setRoleWeight = function(role,value){

state.roleWeights[role] = Number(value)

localStorage.setItem(
"mafiaRoleWeights",
JSON.stringify(state.roleWeights)
)

}

window.showSettings = showSettings

window.toggleDoctorExtras = function(){

state.doctorExtraOpen = !state.doctorExtraOpen

let panel = document.getElementById("doctor-extra-settings")
let arrow = document.querySelector("#doctor-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.doctorExtraOpen)
}

if(arrow){
arrow.style.transform = state.doctorExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.toggleRole = function(role, enabled){

let slider = document.getElementById(role+"SliderContainer")
let count = document.getElementById(role+"-count")
if(role === "doctor"){

let extraWrap = document.getElementById("doctor-extra-wrap")

if(!enabled){
state.doctorExtraOpen = false

if(extraWrap){
extraWrap.classList.remove("show")
setTimeout(() => {
  extraWrap.remove()
}, 300)
}
}

if(enabled && !extraWrap){

let count = document.getElementById("doctor-count")

count.insertAdjacentHTML("afterend", `

<div class="doctor-extra-wrap" id="doctor-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleDoctorExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow">▾</span>
  </div>

  <div class="doctor-extra-settings" id="doctor-extra-settings">
    <div class="role-toggle doctor-subsetting">
      <span>Reveal Saved Player:</span>

      <label class="switch">
        <input type="checkbox"
          ${state.doctorRevealSave ? "checked" : ""}
          onchange="toggleDoctorReveal(this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  </div>

</div>

`)

requestAnimationFrame(() => {
let inserted = document.getElementById("doctor-extra-wrap")
if(inserted){
inserted.classList.add("show")
}
})

}

}

if(role === "sheriff"){

let extraWrap = document.getElementById("sheriff-extra-wrap")

if(!enabled){
state.sheriffExtraOpen = false

if(extraWrap){
extraWrap.classList.remove("show")
setTimeout(() => {
  extraWrap.remove()
}, 300)
}
}

if(enabled && !extraWrap){

let count = document.getElementById("sheriff-count")

count.insertAdjacentHTML("afterend", `

<div class="sheriff-extra-wrap" id="sheriff-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleSheriffExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow">▾</span>
  </div>

  <div class="sheriff-extra-settings" id="sheriff-extra-settings">
    <div class="role-toggle sheriff-subsetting">
      <span>Reveal Exact Role</span>

      <label class="switch">
        <input type="checkbox"
          ${state.sheriffExactReveal ? "checked" : ""}
          onchange="toggleSheriffExactReveal(this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  </div>

</div>

`)

requestAnimationFrame(() => {
let inserted = document.getElementById("sheriff-extra-wrap")
if(inserted){
inserted.classList.add("show")
}
})

}

}

if(role === "doctor" && !enabled){
state.doctorExtraOpen = false
}

state.rolesEnabled[role] = enabled

localStorage.setItem(
"mafiaRoles",
JSON.stringify(state.rolesEnabled)
)

if(slider && count){

if(enabled){

slider.classList.add("show")
count.classList.add("show")

}else{

slider.classList.remove("show")
count.classList.remove("show")

}

}

}

function closeInfo(){
  const modal = document.getElementById("infoModal");

  modal.classList.remove("show");

  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
}

window.showInfo = showInfo
window.closeInfo = closeInfo

window.showInfo = showInfo

function savePlayers(){
localStorage.setItem("mafiaPlayers", JSON.stringify(state.players))
}

function clampMafiaOverride(){

let max = maxAllowedMafia(state.players.length)

if(state.mafiaCountOverride > max){
state.mafiaCountOverride = max

localStorage.setItem(
"mafiaCountOverride",
JSON.stringify(state.mafiaCountOverride)
)
}

}

function loadPlayers(){

let saved = localStorage.getItem("mafiaPlayers")

if(saved){
state.players = JSON.parse(saved)
clampMafiaOverride()
}

}

loadPlayers()

let savedRoles = localStorage.getItem("mafiaRoles")

let savedWeights = localStorage.getItem("mafiaRoleWeights")

let savedCounts = localStorage.getItem("mafiaRoleCounts")

let savedDoctorReveal = localStorage.getItem("mafiaDoctorReveal")

let savedSheriffExactReveal = localStorage.getItem("mafiaSheriffExactReveal")

let savedMafiaCountOverride = localStorage.getItem("mafiaCountOverride")

let savedHostMode = localStorage.getItem("mafiaHostMode")

if(savedHostMode){
state.hostMode = JSON.parse(savedHostMode)
}

if(savedMafiaCountOverride){
state.mafiaCountOverride = JSON.parse(savedMafiaCountOverride)
}

if(savedSheriffExactReveal){
state.sheriffExactReveal = JSON.parse(savedSheriffExactReveal)
}

if(savedDoctorReveal){
state.doctorRevealSave = JSON.parse(savedDoctorReveal)
}

if(savedCounts){
state.roleCounts = JSON.parse(savedCounts)
}

if(savedWeights){
state.roleWeights = JSON.parse(savedWeights)
}

if(savedRoles){
state.rolesEnabled = JSON.parse(savedRoles)
}

let revealIndex=0

export function setDay(){

document.body.classList.remove("night")
document.body.classList.add("day")

}

export function setNight(){

document.body.classList.remove("day")
document.body.classList.add("night")

}

window.updateMafiaCountOverride = function(value){

state.mafiaCountOverride = Number(value)

localStorage.setItem(
"mafiaCountOverride",
JSON.stringify(state.mafiaCountOverride)
)

}

function maxAllowedMafia(playerCount){

if(playerCount < 4) return 1
if(playerCount <= 7) return 2
if(playerCount <= 10) return 3
if(playerCount <= 13) return 4
return 5

}

window.toggleSheriffExactReveal = function(enabled){

state.sheriffExactReveal = enabled

localStorage.setItem(
"mafiaSheriffExactReveal",
JSON.stringify(enabled)
)

}

window.toggleSheriffExtras = function(){

state.sheriffExtraOpen = !state.sheriffExtraOpen

let panel = document.getElementById("sheriff-extra-settings")
let arrow = document.querySelector("#sheriff-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.sheriffExtraOpen)
}

if(arrow){
arrow.style.transform = state.sheriffExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

function showHome(){

render(`

<div class="card">

<h1>Juraj's Mafia</h1>

<button onclick="window.showSetup()">Start Game</button>

</div>

`)

}

function showSetup(){
renderPlayerSetup()
}

function renderPlayerSetup(){

let list=""

state.players.forEach((p,i)=>{

list += `

<li class="player-row">

<span class="player-icon">👤</span>

<input 
value="${p.name}"
oninput="window.renamePlayer(${i}, this.value)"
>

<button onclick="window.removePlayer(${i})">✖</button>

</li>

`

})

render(`

<div class="card">

<h2>Add Players</h2>

<ul>
${list}
</ul>

<button onclick="window.addPlayer()">Add Player</button>

<button onclick="window.clearPlayers()">Reset Players</button>

<button onclick="window.startGame()">Start Game</button>

</div>

`)

}

window.renamePlayer = function(index,newName){

state.players[index].name = newName
savePlayers()

}

window.removePlayer = function(index){

state.players.splice(index,1)

savePlayers()
renderPlayerSetup()
clampMafiaOverride()
}

window.clearPlayers = function(){

localStorage.removeItem("mafiaPlayers")
state.players = []

renderPlayerSetup()
clampMafiaOverride()
}

function maybeAddRole(role, pool){

if(!state.rolesEnabled[role]) return

let weight = state.roleWeights[role] || 0
let roll = Math.random()*100

if(roll < weight){
pool.push(role)
}

}

function assignRoles(){

let players = state.players
let pool = []

let mafia = state.mafiaCountOverride || mafiaCount(players.length)
mafia = Math.min(mafia, maxAllowedMafia(players.length))

for(let i=0;i<mafia;i++){
pool.push("mafia")
}

["doctor","sheriff","jester","executioner"].forEach(role=>{

if(!state.rolesEnabled[role]) return

let weight = state.roleWeights[role] || 0
let max = state.roleCounts[role] || 1

for(let i=0;i<max;i++){

let roll = Math.random()*100

if(roll < weight){
pool.push(role)
}

}

})

while(pool.length < players.length){
pool.push("villager")
}

shuffle(pool)

players.forEach((p,i)=>{
p.role = pool[i]
})

state.executionerTargets = {}

let executioners = players.filter(p => p.role === "executioner")
let eligibleTargets = players.filter(p => p.role !== "executioner")

executioners.forEach(executioner => {
  let possibleTargets = eligibleTargets.filter(p => p.name !== executioner.name)
  if(possibleTargets.length){
    let target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)]
    state.executionerTargets[executioner.name] = target.name
  }
})

}

function startGame(){

if(state.players.length < 4){
alert("Minimum 4 players")
return
}

showPreGameSummary()

}

function showPreGameSummary(){

let playerCount = state.players.length
let mafia = state.mafiaCountOverride || mafiaCount(playerCount)
mafia = Math.min(mafia, maxAllowedMafia(playerCount))

let warnings = getBalanceWarnings()

let warningsHTML = warnings.length
? `
<div class="settings-locked" style="text-align:left;">
  <strong>Setup Warnings</strong>
  ${warnings.map(w => `<p style="margin:8px 0 0 0;">• ${w}</p>`).join("")}
</div>
`
: `
<div class="settings-locked" style="text-align:left; border-color:rgba(46,204,113,0.25);">
  <strong>Setup looks balanced</strong>
</div>
`

let enabledRoles = []

Object.keys(state.rolesEnabled).forEach(role => {
if(state.rolesEnabled[role]){
enabledRoles.push(role)
}
})

let rolesHTML = enabledRoles.length
? enabledRoles.map(role => {
let color = roleColors[role] || "white"
let count = state.roleCounts[role] || 1
let extras = ""

if(role === "doctor" && state.doctorRevealSave){
extras = ` <span style="opacity:0.7;">• reveals saved player</span>`
}

if(role === "sheriff"){
extras = state.sheriffExactReveal
? ` <span style="opacity:0.7;">• exact role</span>`
: ` <span style="opacity:0.7;">• innocent / not innocent</span>`
}

return `
<div class="role-row" style="border-left:4px solid ${color};">
  <span class="role-player">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
  <span class="role-name" style="color:${color}">
    up to ${count}${extras}
  </span>
</div>
`
}).join("")
: `<p style="opacity:0.75;">No special roles enabled</p>`

render(`

<div class="card">

<h2>Game Summary</h2>

<p><strong>Players:</strong> ${playerCount}</p>
<p><strong>Mafia:</strong> ${mafia}</p>

<hr style="opacity:0.3;margin:20px 0;">

<h3>Special Roles</h3>

${rolesHTML}

${warningsHTML}

<button onclick="window.confirmStartGame()">Start Game</button>
<button onclick="window.showSetup()">Back</button>

</div>

`)

}

window.confirmStartGame = function(){

state.gameStarted = true

assignRoles()

revealIndex = 0

showRoleReveal()

}

function getBalanceWarnings(){

let warnings = []
let playerCount = state.players.length
let mafia = state.mafiaCountOverride || mafiaCount(playerCount)
mafia = Math.min(mafia, maxAllowedMafia(playerCount))

let specialRoles = 0

Object.keys(state.rolesEnabled).forEach(role => {
if(state.rolesEnabled[role]){
specialRoles += state.roleCounts[role] || 1
}
})

if(mafia >= Math.ceil(playerCount / 2)){
warnings.push("Too many mafia for this player count.")
}

if(playerCount <= 5 && mafia >= 2){
warnings.push("2 mafia with 5 or fewer players may end the game very quickly.")
}

if(specialRoles > playerCount - mafia){
warnings.push("There may be more special roles than available non-mafia players.")
}

if(state.rolesEnabled.jester && playerCount < 6){
warnings.push("Jester can feel very swingy in smaller games.")
}

if(state.rolesEnabled.doctor && state.rolesEnabled.sheriff && playerCount < 6){
warnings.push("Doctor + Sheriff together may be too strong in a very small lobby.")
}

if(state.rolesEnabled.executioner && playerCount < 6){
warnings.push("Executioner can be very strong in smaller games.")
}

return warnings

}

revealIndex = 0

function showRoleReveal(){

let player = state.players[revealIndex]

render(`

<div class="card">

<h2>Pass device to ${player.name}</h2>

<button onclick="window.revealRole()">Reveal Role</button>

</div>

`)

}

function revealRole(){

let player = state.players[revealIndex]
let color = roleColors[player.role] || "white"
let role = roles[player.role]
let extraInfo = ""

if(player.role === "executioner"){
  let target = state.executionerTargets[player.name]
  if(target){
    extraInfo = `<p class="role-description"><strong>Your target is</strong> ${target}</p>`
  }
}

render(`

<div class="card">

<h2>Your Role</h2>

<div class="role-card" id="roleCard" onclick="flipRole()">

<div class="role-inner">

<div class="role-front">
Tap to reveal
</div>

<div class="role-back" style="color:${color}">
${player.role.toUpperCase()}
</div>

</div>

</div>

<p class="role-description">
${role.description || ""}
</p>

${extraInfo}

<button onclick="window.nextPlayer()">Hide</button>

</div>

`)

}

window.flipRole = function(){

document.getElementById("roleCard").classList.add("revealed")

}

function nextPlayer(){

revealIndex++

if(revealIndex >= state.players.length){

render(`

<div class="card">

<h2>All roles assigned</h2>

<button onclick="window.startNight()">Start Night</button>

</div>

`)

}else{

showRoleReveal()

}

}


window.applyPreset = function(preset){

state.doctorExtraOpen = false
state.sheriffExtraOpen = false

if(preset === "classic"){
state.rolesEnabled.doctor = true
state.rolesEnabled.sheriff = true
state.rolesEnabled.jester = false

state.roleWeights.doctor = 100
state.roleWeights.sheriff = 100
state.roleWeights.jester = 0

state.roleCounts.doctor = 1
state.roleCounts.sheriff = 1
state.roleCounts.jester = 1

state.rolesEnabled.executioner = false
state.roleWeights.executioner = 0
state.roleCounts.executioner = 1

state.doctorRevealSave = false
state.sheriffExactReveal = false
state.mafiaCountOverride = 0
}

if(preset === "beginner"){
state.rolesEnabled.doctor = true
state.rolesEnabled.sheriff = false
state.rolesEnabled.jester = false

state.roleWeights.doctor = 100
state.roleWeights.sheriff = 0
state.roleWeights.jester = 0

state.roleCounts.doctor = 1
state.roleCounts.sheriff = 1
state.roleCounts.jester = 1

state.rolesEnabled.executioner = false
state.roleWeights.executioner = 0
state.roleCounts.executioner = 1


state.doctorRevealSave = true
state.sheriffExactReveal = false
state.mafiaCountOverride = 0
}

if(preset === "chaotic"){
state.rolesEnabled.doctor = true
state.rolesEnabled.sheriff = true
state.rolesEnabled.jester = true

state.roleWeights.doctor = 100
state.roleWeights.sheriff = 100
state.roleWeights.jester = 100

state.roleCounts.doctor = 1
state.roleCounts.sheriff = 1
state.roleCounts.jester = 1

state.rolesEnabled.executioner = true
state.roleWeights.executioner = 100
state.roleCounts.executioner = 1

state.doctorRevealSave = true
state.sheriffExactReveal = true
state.mafiaCountOverride = 0
}

saveSettingsToStorage()
showSettings()

}

function saveSettingsToStorage(){

localStorage.setItem("mafiaRoles", JSON.stringify(state.rolesEnabled))
localStorage.setItem("mafiaRoleWeights", JSON.stringify(state.roleWeights))
localStorage.setItem("mafiaRoleCounts", JSON.stringify(state.roleCounts))
localStorage.setItem("mafiaDoctorReveal", JSON.stringify(state.doctorRevealSave))
localStorage.setItem("mafiaSheriffExactReveal", JSON.stringify(state.sheriffExactReveal))
localStorage.setItem("mafiaCountOverride", JSON.stringify(state.mafiaCountOverride))

}

window.showSetup=showSetup
window.addPlayer = function(){

let number = state.players.length + 1

state.players.push({
name: `Player ${number}`,
role: null,
alive: true
})

savePlayers()
renderPlayerSetup()
clampMafiaOverride()
}


window.startGame=startGame
window.revealRole=revealRole
window.nextPlayer=nextPlayer

window.startNight=startNight
window.nextNightTurn=nextNightTurn
window.revealNightRole=revealNightRole
window.performNightAction=performNightAction

window.startVoting=startVoting
window.showVoteOptions=showVoteOptions
window.castVote=castVote

document.getElementById("infoModal").addEventListener("click", e=>{
if(e.target.id === "infoModal"){
closeInfo()
}
})

showHome()