import {state} from "./state.js"
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
jester: "#bb006d"

}

window.updateRoleCount = function(role,value){

state.roleCounts[role] = Number(value)

localStorage.setItem(
"mafiaRoleCounts",
JSON.stringify(state.roleCounts)
)

}

function showInfo(){

const modal = document.getElementById("infoModal");

modal.innerHTML = `

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

`
modal.classList.add("show");

}

function showSettings() {
  const modal = document.getElementById("infoModal");

if(state.gameStarted){
modal.querySelector(".modal-content")
.classList.add("settings-locked-mode")
}

  // List of roles we want to display in settings
  const rolesList = ["doctor", "sheriff", "jester"];

  let content = `
    <div class="modal-content">
      <h2 class="settings-title">Game Settings</h2>
${state.gameStarted ? `
<div class="settings-locked">
🔒 Settings locked during game
</div>
` : ""}
  `;

  rolesList.forEach(role => {
    const enabled = state.rolesEnabled[role];
    const weight = state.roleWeights[role] || 0;
    const color = roleColors[role] || "#fff";

    content += `
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

    content += `

<div class="role-count ${enabled ? "show" : ""}" id="${role}-count">

<label>Maximum amount:</label>

<input type="number"
min="1"
max="10"
value="${state.roleCounts[role] || 1}"
onchange="window.updateRoleCount('${role}', this.value)">

</div>

`
  });

  content += `

<div class="role-toggle">
<span>Reveal Doctor Save</span>

<label class="switch">
<input type="checkbox"
${state.doctorRevealSave ? "checked" : ""}
onchange="toggleDoctorReveal(this.checked)">
<span class="slider"></span>
</label>

</div>

`

  content += `<button onclick="closeInfo()">Close</button></div>`;

  modal.innerHTML = content;
  if(state.gameStarted){

modal.querySelectorAll("input").forEach(el=>{
el.disabled = true
})

}
  modal.classList.remove("hidden");

  // Animate only the sliders that are enabled
  document.querySelectorAll('.role-weight.show').forEach(el => {
    requestAnimationFrame(() => {
      el.classList.add("show");
    });
  });

  // Initialize slider backgrounds
  document.querySelectorAll('.role-weight input[type="range"]').forEach(slider => {
    let role = slider.id.replace("Slider", "");
    updateSlider(slider, role);
  });

  modal.classList.add("show");
}

window.toggleDoctorReveal = function(enabled){

state.doctorRevealSave = enabled

localStorage.setItem(
"mafiaDoctorReveal",
JSON.stringify(enabled)
)

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

window.toggleRole = function(role, enabled){

let slider = document.getElementById(role+"SliderContainer")
let count = document.getElementById(role+"-count")

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

function loadPlayers(){

let saved = localStorage.getItem("mafiaPlayers")

if(saved){
state.players = JSON.parse(saved)
}

}

loadPlayers()

let savedRoles = localStorage.getItem("mafiaRoles")

let savedWeights = localStorage.getItem("mafiaRoleWeights")

let savedCounts = localStorage.getItem("mafiaRoleCounts")

let savedDoctorReveal = localStorage.getItem("mafiaDoctorReveal")

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

}

window.clearPlayers = function(){

localStorage.removeItem("mafiaPlayers")
state.players = []

renderPlayerSetup()

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

let mafia = mafiaCount(players.length)

for(let i=0;i<mafia;i++){
pool.push("mafia")
}

["doctor","sheriff","jester"].forEach(role=>{

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

}

function startGame(){

if(state.players.length<4){
alert("Minimum 4 players")
return
}

state.gameStarted = true

assignRoles()

revealIndex=0

showRoleReveal()

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