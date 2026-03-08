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

function showInfo(){

let modal = document.getElementById("infoModal")

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

modal.classList.remove("hidden")

}

function showSettings(){

let modal = document.getElementById("infoModal")

modal.innerHTML = `

<div class="modal-content">

<h2 class="settings-title">Game Settings</h2>

<div class="role-toggle">

<span style="color:${roleColors.doctor}">Doctor</span>

<label class="switch">
<input type="checkbox"
${state.rolesEnabled.doctor ? "checked" : ""}
onchange="toggleRole('doctor', this.checked)">
<span class="slider"></span>
</label>

</div>

${state.rolesEnabled.doctor ? `

<div class="role-weight">

<input type="range"
min="0"
max="100"
value="${state.roleWeights.doctor}"
oninput="setRoleWeight('doctor', this.value)">

<span>${state.roleWeights.doctor}%</span>

</div>

` : ""}

<div class="role-toggle">

<span style="color:${roleColors.sheriff}">Sheriff</span>

<label class="switch">
<input type="checkbox"
${state.rolesEnabled.sheriff ? "checked" : ""}
onchange="toggleRole('sheriff', this.checked)">
<span class="slider"></span>
</label>

</div>

${state.rolesEnabled.sheriff ? `

<div class="role-weight">

<input type="range"
min="0"
max="100"
value="${state.roleWeights.sheriff}"
oninput="setRoleWeight('sheriff', this.value)">

<span>${state.roleWeights.sheriff}%</span>

</div>

` : ""}

<div class="role-toggle">

<span style="color:${roleColors.jester}">Jester</span>

<label class="switch">
<input type="checkbox"
${state.rolesEnabled.jester ? "checked" : ""}
onchange="toggleRole('jester', this.checked)">
<span class="slider"></span>
</label>

</div>

${state.rolesEnabled.jester ? `

<div class="role-weight">

<input type="range"
min="0"
max="100"
value="${state.roleWeights.jester}"
oninput="setRoleWeight('jester', this.value)">

<span>${state.roleWeights.jester}%</span>

</div>

` : ""}

`

modal.classList.remove("hidden")

}

window.setRoleWeight = function(role,value){

state.roleWeights[role] = Number(value)

localStorage.setItem(
"mafiaRoleWeights",
JSON.stringify(state.roleWeights)
)

showSettings()

}

window.showSettings = showSettings

window.toggleRole = function(role, enabled){

state.rolesEnabled[role] = enabled

localStorage.setItem(
"mafiaRoles",
JSON.stringify(state.rolesEnabled)
)

showSettings()

}

function closeInfo(){
document.getElementById("infoModal").classList.add("hidden")
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

function assignRoles(){

let players=state.players
let pool=[]

let mafia=mafiaCount(players.length)

for(let i=0;i<mafia;i++) pool.push("mafia")

if(state.rolesEnabled.doctor) pool.push("doctor")
if(state.rolesEnabled.sheriff) pool.push("sheriff")
if(state.rolesEnabled.jester) pool.push("jester")

while(pool.length<players.length){
pool.push("villager")
}

shuffle(pool)

players.forEach((p,i)=>{
p.role=pool[i]
})

}

function startGame(){

if(state.players.length<4){
alert("Minimum 4 players")
return
}

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

showHome()