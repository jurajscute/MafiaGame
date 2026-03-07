import {state, resetNightActions} from "./state.js"
import {render} from "./ui.js"
import {roles} from "./roles.js"
import {passPhone} from "./ui.js"

export function startNight(){

state.phase="night"

state.nightTurnIndex = 0

resetNightActions()

passPhone(player.name, "window.revealNightRole()")

nextNightTurn()

}

function nextNightTurn(){

if(state.nightTurnIndex >= state.players.length){

resolveNight()

return

}

let player = state.players[state.nightTurnIndex]

if(!player.alive){

state.nightTurnIndex++
nextNightTurn()
return

}

}

export function revealNightRole(){

let player = state.players[state.nightTurnIndex]

let role = roles[player.role]

if(!role.nightAction){

render(`

<div class="card">

<h2>You are ${player.role}</h2>

<p>No night action</p>

<button onclick="window.finishNightTurn()">Hide</button>

</div>

`)

return

}

showNightAction(player, role)

}

function showNightAction(player, role){

let targets=""

state.players
.filter(p => p.alive && p.name !== player.name)
.forEach(p => {

targets += `<button onclick="window.performNightAction('${p.name}')">${p.name}</button>`

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

state.nightActions[role.nightAction] = targetName

// Special handling for Sheriff
if(role.nightAction === "investigate"){

let target = state.players.find(p => p.name === targetName)

let result = target.role === "mafia" ? "MAFIA" : "NOT MAFIA"

render(`

<div class="card">

<h2>Investigation Result</h2>

<p>${target.name} is</p>

<h1>${result}</h1>

<button onclick="window.finishNightTurn()">Hide</button>

</div>

`)

return

}

finishNightTurn()

}

function resolveNight(){

let kill = state.nightActions.kill
let save = state.nightActions.save

let message = "No one died."

if(kill && kill !== save){

let victim = state.players.find(p=>p.name===kill)

victim.alive=false

message = `${kill} was killed during the night.`

}

render(`

<div class="card">

<h2>Morning</h2>

<p>${message}</p>

<button onclick="window.startVoting()">Continue</button>

</div>

`)

}

export function startVoting(){

state.phase = "voting"
state.voteTurnIndex = 0
state.votes = {}

nextVoteTurn()

}

function nextVoteTurn(){

let alivePlayers = state.players.filter(p => p.alive)

if(state.voteTurnIndex >= alivePlayers.length){

resolveVotes()
return

}

let player = alivePlayers[state.voteTurnIndex]

passPhone(player.name, "window.showVoteOptions()")

}

export function showVoteOptions(){

let alivePlayers = state.players.filter(p => p.alive)

let buttons=""

alivePlayers.forEach(p => {

buttons += `<button onclick="window.castVote('${p.name}')">${p.name}</button>`

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

state.votes[targetName] = 0

}

state.votes[targetName]++

state.voteTurnIndex++

nextVoteTurn()

}

function resolveVotes(){

let highest = 0
let eliminated = null

for(let name in state.votes){

if(state.votes[name] > highest){

highest = state.votes[name]
eliminated = name

}

}

if(eliminated){

let player = state.players.find(p => p.name === eliminated)

player.alive = false

render(`

<div class="card">

<h2>${eliminated} was voted out</h2>

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

}else{

render(`

<div class="card">

<h2>No one was eliminated</h2>

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

}

}