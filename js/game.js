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

<h1>Mafia</h1>

<button onclick="window.showSetup()">Start Game</button>

</div>

`)

}

function showSetup(){

render(`

<div class="card">

<h2>Add Players</h2>

<input id="name">

<button onclick="window.addPlayer()">Add</button>

<ul id="playerList"></ul>

<button onclick="window.startGame()">Start Game</button>

</div>

`)

updatePlayerList()

}

function renderPlayerSetup(){

let list=""

state.players.forEach((p,i)=>{

list += `

<li>

<input 
value="${p.name}"
oninput="renamePlayer(${i}, this.value)"
>

<button onclick="removePlayer(${i})">❌</button>

</li>

`

})

render(`

<div class="card">

<h2>Add Players</h2>

<ul>
${list}
</ul>

<button onclick="addPlayer()">Add Player</button>

<button onclick="startGame()">Start Game</button>

</div>

`)

}

window.renamePlayer = function(index,newName){

state.players[index].name = newName

}

function addPlayer(){

const input=document.getElementById("name")

const name=input.value.trim()

if(!name)return

state.players.push({
name:name,
role:null,
alive:true
})

input.value=""

updatePlayerList()

}

function updatePlayerList(){

const list=document.getElementById("playerList")

if(!list)return

list.innerHTML=""

state.players.forEach(p=>{

list.innerHTML+=`<li>${p.name}</li>`

})

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
alive: true
})

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