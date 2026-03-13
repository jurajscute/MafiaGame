import {state, resetNightActions} from "./state.js"
import {render, passPhone} from "./ui.js"
import {roles} from "./roles.js"
import {addLogEntry} from "./state.js"

function setDay() {
    document.body.classList.remove("night");
    document.body.classList.add("day");
}

function setNight() {
    document.body.classList.remove("day");
    document.body.classList.add("night");
}

function renderPlayerStatus(){

let playersHTML = state.players.map(p => {
  return `
    <div class="status-row ${p.alive ? "alive" : "dead"}">
      <span>${p.name}</span>
      <span>${p.alive ? "Alive" : "Dead ☠"}</span>
    </div>
  `
}).join("")

return `

<div class="player-status-box">
  <h3>Players</h3>
  ${playersHTML}
</div>

`
}

window.forceNextPhase = function(){

if(state.phase === "night"){
resolveNight()
return
}

if(state.phase === "voting"){
resolveVotes()
return
}

}

window.setDay = setDay;
window.setNight = setNight;

export function startNight(){
    state.gameStats.nights++
addLogEntry(`Night ${state.gameStats.nights} began.`)

setNight();

state.phase="night"
state.nightTurnIndex=0

resetNightActions()

showNightTurn()

}

const roleColors = {
mafia: "#e74c3c",
doctor: "#2e8dcc",
sheriff: "#e4c200",
villager: "#8dc2ff",
jester: "#ff3ea5",
executioner: "#7a2f6f"
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

function renderHostControls(){

if(!state.hostMode || !state.gameStarted) return ""

return `

<div class="host-panel">
  <button class="host-btn" onclick="window.forceNextPhase()">Skip Phase</button>
  <button class="host-btn" onclick="window.forceRevealRoles()">Reveal Roles</button>
</div>

`

}

export function revealNightRole(){

let player = state.players[state.nightTurnIndex]
let role = roles[player.role]

if(!role.nightAction){

let roleKey = player.role.toLowerCase()
let color = roleColors[roleKey] || "white"

render(`

<div class="card">

<h2>
You are a
<span style="
color:${color};
font-weight:bold;
text-shadow:
0 0 10px ${color},
0 0 20px ${color},
0 0 30px ${color};
">
${player.role.toUpperCase()}
</span>
</h2>

<p class="role-description">
${role.description || ""}
</p>

<button onclick="window.nextNightTurn()">Hide</button>

${renderHostControls()}

</div>

`)

return

}

showNightAction(player,role)

}

function showNightAction(player){

let targets=""

let roleClass = player.role.toLowerCase()

state.players
.filter(p => {
    if(!p.alive) return false

    // Doctor can target themselves
    if(player.role === "doctor") return true

    // Other roles cannot target themselves
    return p.name !== player.name
})
.forEach(p=>{
targets+=`<button onclick="window.performNightAction('${p.name}')">
${p.name === player.name ? p.name + ' <span style="opacity:0.6">(You)</span>' : p.name}
</button>`
})

render(`

<div class="card role-${roleClass}">

<h2 class="role-title">${player.role.toUpperCase()} ACTION</h2>

<p>Select a target</p>

${targets}

${renderHostControls()}

</div>

`)

}

export function performNightAction(targetName){

let player = state.players[state.nightTurnIndex]
let role = roles[player.role]

state.nightActions[role.nightAction]=targetName

if(role.nightAction==="investigate"){

let target = state.players.find(p=>p.name===targetName)

let result = ""
let resultColor = "#b0e2ff"

if(state.sheriffExactReveal){

result = target.role.toUpperCase()

if(target.role === "mafia"){
resultColor = "#e74c3c"
}else if(target.role === "jester"){
resultColor = "#bb006d"
}else if(target.role === "doctor"){
resultColor = "#2e8dcc"
}else if(target.role === "sheriff"){
resultColor = "#e4c200"
}

}else{

let notInnocent = target.role === "mafia" || target.role === "jester"

result = notInnocent ? "NOT INNOCENT" : "INNOCENT"
resultColor = notInnocent ? "#e74c3c" : "#b0e2ff"

}

render(`

<div class="card role-sheriff">

<h2 class="role-title">INVESTIGATION RESULT</h2>

<p>${target.name} is</p>

<h1 style="
color:${resultColor};
text-shadow:
0 0 10px ${resultColor},
0 0 20px ${resultColor};
">
${result}
</h1>

<button onclick="window.nextNightTurn()">Hide</button>

</div>

`)

return

}

advanceNightTurn()

    if(role.nightAction === "kill"){
addLogEntry(`Mafia targeted ${targetName}.`)
}

if(role.nightAction === "save"){
addLogEntry(`Doctor protected ${targetName}.`)
}

if(role.nightAction === "investigate"){
addLogEntry(`Sheriff investigated ${targetName}.`)
}


}

function checkWin(){

let alive = state.players.filter(p=>p.alive)

let mafia = alive.filter(p=>p.role==="mafia").length
let villagers = alive.filter(p=>p.role!=="mafia").length

// Mafia win
if(mafia >= villagers){

let mafiaPlayers = state.players
.filter(p => p.role === "mafia")
.map(p => p.name)
.join("<br>")

document.body.className = "win-mafia"

render(`

<div class="card role-mafia">

<h1 class="role-title">MAFIA WINS</h1>

<p>The mafia have taken control of the town.</p>

<hr>

<p><strong>The Mafia were:</strong></p>

<p>${mafiaPlayers}</p>

<button onclick="window.showRoleRevealEnd()">Reveal All Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return true
}

// Village win
if(mafia === 0){

let mafiaPlayers = state.players
.filter(p => p.role === "mafia")
.map(p => p.name)
.join("<br>")

document.body.className = "win-village"

render(`

<div class="card role-doctor">

<h1 class="role-title">VILLAGE WINS</h1>

<p>The town has eliminated all mafia members.</p>

<hr>

<p><strong>The Mafia were:</strong></p>

<p>${mafiaPlayers}</p>

<button onclick="window.showRoleRevealEnd()">Reveal All Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return true
}

return false
}

function resolveNight(){
setDay();

let kill = state.nightActions.kill
let save = state.nightActions.save

let results = []

if(kill && kill !== save){

    addLogEntry(`${kill} was killed during the night.`)

let victim = state.players.find(p => p.name === kill)

if(victim){
victim.alive = false
results.push({
type: "death",
text: `${kill} was killed during the night.`
})
}

}else if(kill && kill === save){

    if(state.doctorRevealSave){
addLogEntry(`${save} was saved by the Doctor.`)
}else{
addLogEntry(`Someone was attacked but survived the night.`)
}

if(state.doctorRevealSave){
results.push({
type: "save",
text: `🩺 ${save} was saved by the Doctor!`
})
}else{
results.push({
type: "save",
text: "Someone was attacked but survived the night."
})
}

}else{

    addLogEntry(`The night was quiet.`)

results.push({
type: "peace",
text: "The night was quiet."
})
}

if(checkWin()) return

let resultsHTML = results.map(r => {
let cls = ""
if(r.type === "death") cls = "night-result-death"
if(r.type === "save") cls = "night-result-save"
if(r.type === "peace") cls = "night-result-peace"

return `<div class="night-result ${cls}">${r.text}</div>`
}).join("")

render(`

<div class="card">

<h2>Morning</h2>

${resultsHTML}

${renderPlayerStatus()}

<button onclick="window.startVoting()">Continue</button>

${renderHostControls()}

</div>

`)

}

export function startVoting(){

state.phase="voting"
state.voteTurnIndex=0
state.votes={}

 addLogEntry(`Day ${state.gameStats.nights} voting began.`)

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

buttons+=`<button class="skip-btn" onclick="window.castVote('skip')">Skip Vote</button>`

render(`

<div class="card">

<h2>Cast Your Vote</h2>

${buttons}

${renderPlayerStatus()}

${renderHostControls()}

</div>

`)

}

export function castVote(targetName){

let alivePlayers = state.players.filter(p=>p.alive)
let voter = alivePlayers[state.voteTurnIndex]

if(voter){
addLogEntry(`${voter.name} voted for ${targetName}.`)
}

state.gameStats.votesCast++

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

let voteCounts = Object.values(state.votes)
let maxVotes = voteCounts.length ? Math.max(...voteCounts) : 1

for(let name in state.votes){

let count = state.votes[name]
let label = name === "skip" ? "Skip Vote" : name
let percent = (count / maxVotes) * 100

resultsHTML += `

<div class="vote-row">

<div class="vote-label">
${label} — ${count}
</div>

<div class="vote-bar-bg">
<div class="vote-bar-fill" style="width:${percent}%"></div>
</div>

</div>

`

if(count > highest){
highest = count
eliminated = name
tie = false
}else if(count === highest){
tie = true
}

}

if(tie){

    addLogEntry(`Voting ended in a tie. Nobody was eliminated.`)

render(`

<div class="card">

<h2>Voting Results</h2>

${resultsHTML}

<hr>

<h2>It's a tie! Nobody was eliminated.</h2>

${renderPlayerStatus()}

<button onclick="window.nextNight()">Next Night</button>

${renderHostControls()}

</div>

`)

return

}

if(eliminated === "skip"){

addLogEntry(`The town skipped the vote.`)

render(`

<div class="card">

<h2>Voting Results</h2>

${resultsHTML}

<hr>

<h2>The town skipped the vote.</h2>

${renderPlayerStatus()}

<button onclick="window.nextNight()">Next Night</button>

${renderHostControls()}

</div>

`)

return

}

if(eliminated){

addLogEntry(`${eliminated} was voted out.`)
state.gameStats.eliminations++

let player = state.players.find(p => p.name === eliminated)

if(player){

player.alive = false

let executionerWinner = state.players.find(p => {
  return p.role === "executioner" &&
         state.executionerTargets[p.name] === eliminated
})

let mafiaAliveAfterVote = state.players.filter(p => p.alive && p.role === "mafia").length

// Jester + Executioner shared win
if(player.role === "jester" && executionerWinner){

addLogEntry(`${player.name} won as the Jester.`)
addLogEntry(`${executionerWinner.name} won as the Executioner by getting ${eliminated} voted out.`)

document.body.className = "win-jester-executioner"

render(`

<div class="card role-jester">

<h1 class="role-title">JESTER & EXECUTIONER WIN</h1>

<p>${player.name} was voted out and wins as the Jester.</p>
<p>${executionerWinner.name} also wins because ${player.name} was their target.</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return
}

// Jester solo win
if(player.role === "jester"){

addLogEntry(`${player.name} won as the Jester.`)

document.body.className = "win-jester"

render(`

<div class="card role-jester">

<h1 class="role-title">JESTER WINS</h1>

<p>${player.name} tricked the town into voting them out!</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return
}

// Village + Executioner shared win
if(executionerWinner && player.role === "mafia" && mafiaAliveAfterVote === 0){

addLogEntry(`${executionerWinner.name} won as the Executioner by getting ${eliminated} voted out.`)
addLogEntry(`The village also won because ${eliminated} was the last mafia.`)

document.body.className = "win-village-executioner"

render(`

<div class="card role-executioner">

<h1 class="role-title">VILLAGE & EXECUTIONER WIN</h1>

<p>${executionerWinner.name} succeeded in getting ${eliminated} voted out!</p>
<p>The village also wins because ${eliminated} was a part of the mafia.</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return
}

// Executioner solo win
if(executionerWinner){

addLogEntry(`${executionerWinner.name} won as the Executioner by getting ${eliminated} voted out.`)

document.body.className = "win-executioner"

render(`

<div class="card role-executioner">

<h1 class="role-title">EXECUTIONER WINS</h1>

<p>${executionerWinner.name} succeeded in getting ${eliminated} voted out!</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

return

}

}

if(checkWin()) return

render(`

<div class="card">

<h2>Voting Results</h2>

${resultsHTML}

<hr>

<h2 class="elimination-text">
${eliminated} was voted out
</h2>

${renderPlayerStatus()}

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

return

}

render(`

<div class="card">

<h2>Voting Results</h2>

${resultsHTML}

<hr>

<h2>Nobody was eliminated.</h2>

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

}

window.toggleExecutionerReveal = function(playerName){

if(state.openExecutionerReveal === playerName){
state.openExecutionerReveal = null
}else{
state.openExecutionerReveal = playerName
}

showRoleRevealEnd()

}

function showRoleRevealEnd(){

   let logHTML = state.gameLog.length
? state.gameLog.map(entry => {
    let isHeader = entry.startsWith("Night ") || entry.startsWith("Day ")
    return `<p class="log-entry ${isHeader ? "log-header" : ""}">${entry}</p>`
  }).join("")
: `<p style="opacity:0.7;">No log entries recorded.</p>`

let mafia = state.players.filter(p => roles[p.role]?.team === "mafia")
let town = state.players.filter(p => roles[p.role]?.team === "village")
let neutral = state.players.filter(p => roles[p.role]?.team === "neutral")
let statsHTML = `

<hr style="opacity:0.3;margin:20px 0;">

<h2 class="role-title">GAME STATISTICS</h2>

<div class="role-row">
  <span class="role-player">Nights Played</span>
  <span class="role-name">${state.gameStats.nights}</span>
</div>

<div class="role-row">
  <span class="role-player">Votes Cast</span>
  <span class="role-name">${state.gameStats.votesCast}</span>
</div>

<div class="role-row">
  <span class="role-player">Eliminations</span>
  <span class="role-name">${state.gameStats.eliminations}</span>
</div>

`

function renderRoleList(list){

if(!list.length){
return `<p style="opacity:0.7;">None</p>`
}

return list.map(p => {

let color = roleColors[p.role] || "white"
let isExecutioner = p.role === "executioner"
let isOpen = state.openExecutionerReveal === p.name
let target = state.executionerTargets?.[p.name]

if(isExecutioner){
return `

<div class="role-row executioner-row"
     style="border-left:4px solid ${color};"
     onclick="window.toggleExecutionerReveal('${p.name}')">

  <span class="role-player">${p.name}</span>

  <span class="role-name" style="color:${color}">
    ${p.role.toUpperCase()} ${isOpen ? "▴" : "▾"}
  </span>

</div>

${isOpen && target ? `
<div class="executioner-target-reveal">
  <span class="executioner-target-reveal-label">Target:</span>
  <span class="executioner-target-reveal-name">${target}</span>
</div>
` : ""}

`
}

return `

<div class="role-row" style="border-left:4px solid ${color};">

<span class="role-player">${p.name}</span>

<span class="role-name" style="color:${color}">
${p.role.toUpperCase()}
</span>

</div>

`

}).join("")

}

render(`

<div class="card final-results-card">

<h2 class="role-title">FINAL ROLES</h2>

<h3 class="mafia-win">Mafia</h3>
${renderRoleList(mafia)}

<hr style="opacity:0.3;margin:20px 0;">

<h3 class="village-win">Town</h3>
${renderRoleList(town)}

<hr style="opacity:0.3;margin:20px 0;">

<h3 class="neutral-win">Neutral</h3>
${renderRoleList(neutral)}

<br>

${statsHTML}

<br>

<hr style="opacity:0.3;margin:20px 0;">

<h2 class="role-title">LOG</h2>

<div class="game-log-box">
${logHTML}
</div>

<br>

<button onclick="location.reload()">Restart Game</button>

</div>

`)

}

export { showRoleRevealEnd }

window.showRoleRevealEnd = showRoleRevealEnd

export function nextNight(){

startNight()

}

window.nextNight = nextNight