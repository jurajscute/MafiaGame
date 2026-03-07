import {state, resetNightActions} from "./state.js"
import {render, passPhone} from "./ui.js"
import {roles} from "./roles.js"

export function startNight(){

state.phase="night"
state.nightTurnIndex=0

resetNightActions()

showNightTurn()

}

const roleColors = {

mafia: "#e74c3c",
doctor: "#2ecc71",
sheriff: "#3498db",
villager: "#f1c40f",
jester: "#9b59b6"

}

function showNightTurn(){

let player = state.players[state.nightTurnIndex]

if(!player){

resolveNight()
return

}

if(!player.alive){

advanceNightTurn()
return

}

passPhone(player.name,"window.revealNightRole()")

}

function advanceNightTurn(){

state.nightTurnIndex++

showNightTurn()

}

export function nextNightTurn(){

advanceNightTurn()

}

export function revealNightRole(){

let player = state.players[state.nightTurnIndex]
let role = roles[player.role]

if(!role.nightAction){

render(`

<div class="card">

<h2>You are ${player.role}</h2>
<p>No night action</p>

<button onclick="window.nextNightTurn()">Hide</button>

</div>

`)

return

}

showNightAction(player,role)

}

function showNightAction(player,role){

let targets=""

state.players
.filter(p=>p.alive && p.name!==player.name)
.forEach(p=>{
targets+=`<button onclick="window.performNightAction('${p.name}')">${p.name}</button>`
})

render(`

<div class="card">

<h2>${player.role.toUpperCase()} ACTION</h2>

<p>Select a target</p>

${targets}

</div>

`)

}

export function performNightAction(targetName){

let player = state.players[state.nightTurnIndex]
let role = roles[player.role]

state.nightActions[role.nightAction]=targetName

if(role.nightAction==="investigate"){

let target = state.players.find(p=>p.name===targetName)
let result = target.role==="mafia" ? "MAFIA" : "NOT MAFIA"

render(`

<div class="card">

<h2>Investigation Result</h2>

<p>${target.name} is</p>

<h1>${result}</h1>

<button onclick="window.nextNightTurn()">Hide</button>

</div>

`)

return

}

advanceNightTurn()

}

function checkWin(){

let alive = state.players.filter(p=>p.alive)

let mafia = alive.filter(p=>p.role==="mafia").length
let villagers = alive.filter(p=>p.role!=="mafia").length

// Mafia win
if(mafia >= villagers){

render(`

<div class="card">

<h1>MAFIA WIN</h1>

<p>The mafia have taken control of the town.</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return true

}

// Village win
if(mafia === 0){

render(`

<div class="card">

<h1>VILLAGE WINS</h1>

<p>All mafia members have been eliminated.</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return true

}

return false

}

function resolveNight(){

let kill=state.nightActions.kill
let save=state.nightActions.save

let message="No one died."

if(kill && kill!==save){

let victim=state.players.find(p=>p.name===kill)

if(victim){
victim.alive=false
message=`${kill} was killed during the night.`
}

}
if(checkWin()) return

render(`

<div class="card">

<h2>Morning</h2>

<p>${message}</p>

<button onclick="window.startVoting()">Continue</button>

</div>

`)

}

export function startVoting(){

state.phase="voting"
state.voteTurnIndex=0
state.votes={}

nextVoteTurn()

}

function nextVoteTurn(){

let alivePlayers = state.players.filter(p=>p.alive)

if(state.voteTurnIndex>=alivePlayers.length){

resolveVotes()
return

}

let player = alivePlayers[state.voteTurnIndex]

passPhone(player.name,"window.showVoteOptions()")

}

export function showVoteOptions(){

let alivePlayers = state.players.filter(p=>p.alive)

let buttons=""

alivePlayers.forEach(p=>{
buttons+=`<button onclick="window.castVote('${p.name}')">${p.name}</button>`
})

render(`

<div class="card">

<h2>Cast Your Vote</h2>

${buttons}

</div>

`)

}

export function castVote(targetName){

if(!state.votes[targetName]){
state.votes[targetName]=0
}

state.votes[targetName]++

state.voteTurnIndex++

nextVoteTurn()

}

function resolveVotes(){

let highest = 0
let eliminated = null
let tie = false
let resultsHTML = ""

// Build vote results
for(let name in state.votes){

let count = state.votes[name]

resultsHTML += `<p>${name} — ${count} vote${count>1?"s":""}</p>`

if(count > highest){

highest = count
eliminated = name
tie = false

}else if(count === highest){

tie = true

}

}

// Handle tie
if(tie){

render(`

<div class="card">

<h2>Voting Results</h2>

${resultsHTML}

<hr>

<h2>It's a tie! Nobody was eliminated.</h2>

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

return

}

// Eliminate player
if(eliminated){

let player = state.players.find(p => p.name === eliminated)

if(player){

player.alive = false

// Jester win
if(player.role === "jester"){

render(`

<div class="card">

<h1>JESTER WINS</h1>

<p>${player.name} tricked the town into voting them out!</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return

}

}

// Check village / mafia win
if(checkWin()) return

render(`

<div class="card">

<h2>Voting Results</h2>

${resultsHTML}

<hr>

<h2>${eliminated} was voted out</h2>

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

}

}

export function showRoleRevealEnd(){

let rolesHTML = ""

state.players.forEach(p => {

let color = roleColors[p.role] || "white"

rolesHTML += `
<p style="color:${color}; font-weight:bold; font-size:20px;">
${p.name} — ${p.role.toUpperCase()}
</p>
`

})

render(`

<div class="card">

<h2>All Roles</h2>

${rolesHTML}

<br>

<button onclick="location.reload()">Restart Game</button>

</div>

`)

}

window.showRoleRevealEnd = showRoleRevealEnd

window.showRoleRevealEnd = showRoleRevealEnd

export function nextNight(){

startNight()

}

window.nextNight = nextNight