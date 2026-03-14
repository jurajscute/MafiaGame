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

function shouldRevealOnNightDeath(){
return state.revealRolesOnElimination === "death" ||
       state.revealRolesOnElimination === "death_and_vote"
}

function shouldRevealOnVoteDeath(){
return state.revealRolesOnElimination === "vote_only" ||
       state.revealRolesOnElimination === "death_and_vote"
}

function revealedRoleText(player){

let color = roleColors[player.role] || "white"

return `
<div class="revealed-role-sequence">

  <div class="revealed-role-label" style="
    color:${color};
    text-shadow:0 0 8px ${color};
  ">
    ROLE REVEALED
  </div>

  <div class="revealed-role-inline"
       style="
       background:linear-gradient(
          135deg,
          ${color}22,
          rgba(0,0,0,0.35)
       );
       box-shadow:
          0 0 12px ${color}33;
       ">

    <span class="revealed-role-name"
          style="
          color:${color};
          text-shadow:0 0 8px ${color};
          ">
      ${player.role.toUpperCase()}
    </span>

  </div>

</div>
`
}

window.forceNextPhase = function(){

  if(state.phase === "night"){
    resolveNightSelections()
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

setNight()

state.phase = "night"
state.nightStep = "select"
state.nightTurnIndex = 0
state.nightResultIndex = 0

resetNightActions()

showNightTurn()
}

const roleColors = {
mafia: "#e74c3c",
doctor: "#2e8dcc",
sheriff: "#e4c200",
villager: "#8dc2ff",
jester: "#ff3ea5",
executioner: "#7a2f6f",
mayor: "#1d8161"
}

function showNightSelectionTurn(){

let player = state.players[state.nightTurnIndex]

if(!player){
  resolveNightSelections()
  state.nightStep = "results"
  state.nightResultIndex = 0
  showNightTurn()
  return
}

if(!player.alive){
  advanceNightTurn()
  return
}

let role = roles[player.role]

if(!role.nightAction){
  advanceNightTurn()
  return
}

passPhone(player.name, "window.revealNightRole()")
}

function advanceNightTurn(){

state.nightTurnIndex++

showNightTurn()

}

function showNightTurn(){

if(state.nightStep === "select"){
  showNightSelectionTurn()
  return
}

if(state.nightStep === "results"){
  showNightResultsTurn()
  return
}

}

export function nextNightTurn(){
  state.nightTurnIndex++
  showNightSelectionTurn()
}

function startNightResultsPhase(){
  state.nightStep = "results"
  state.nightResultIndex = 0
  showNightResultTurn()
}

function showNightResultsTurn(){

let resultPlayers = state.nightPrivateResults
let item = resultPlayers[state.nightResultIndex]

if(!item){
  showMorning()
  return
}

passPhone(item.playerName, "window.revealNightPrivateResult()")
}

window.revealNightPrivateResult = function(){

  let item = state.nightPrivateResults[state.nightResultIndex]

  if(!item){
    showMorning()
    return
  }

  if(item.type === "investigate"){
    render(`

<div class="card role-sheriff">

<h2 class="role-title">INVESTIGATION RESULT</h2>

<p>${item.targetName} is</p>

<h1 style="
color:${item.resultColor};
text-shadow:
0 0 10px ${item.resultColor},
0 0 20px ${item.resultColor};
">
${item.result}
</h1>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

    `)
  }
}

window.nextNightResultTurn = function(){
state.nightResultIndex++
showNightTurn()
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

state.nightActions[role.nightAction] = targetName

if(role.nightAction === "kill"){
  addLogEntry(`Mafia targeted ${targetName}.`)
}

if(role.nightAction === "save"){
  addLogEntry(`Doctor protected ${targetName}.`)
}

if(role.nightAction === "investigate"){
  addLogEntry(`Sheriff investigated ${targetName}.`)
}

if(role.nightAction === "frame"){
  addLogEntry(`Framer framed ${targetName}.`)
}

advanceNightTurn()
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

function buildSheriffResult(target, isFramed){

let result = ""
let resultColor = "#b0e2ff"

if(state.sheriffExactReveal){

  if(isFramed){
    result = "MAFIA"
    resultColor = roleColors.mafia
    return { result, resultColor }
  }

  if(target.role === "jester" && state.sheriffJesterResult === "innocent"){
    result = "VILLAGER"
    resultColor = roleColors.villager
  }else if(target.role === "executioner" && state.sheriffExecutionerResult === "innocent"){
    result = "VILLAGER"
    resultColor = roleColors.villager
  }else{
    result = target.role.toUpperCase()

    if(target.role === "mafia"){
      resultColor = roleColors.mafia
    }else if(target.role === "jester"){
      resultColor = roleColors.jester
    }else if(target.role === "doctor"){
      resultColor = roleColors.doctor
    }else if(target.role === "sheriff"){
      resultColor = roleColors.sheriff
    }else if(target.role === "executioner"){
      resultColor = roleColors.executioner
    }else if(target.role === "mayor"){
      resultColor = roleColors.mayor
    }else{
      resultColor = roleColors.villager
    }
  }

}else{

  if(isFramed){
    result = "NOT INNOCENT"
    resultColor = "#e74c3c"
    return { result, resultColor }
  }

  if(target.role === "jester"){

    if(state.sheriffJesterResult === "innocent"){
      result = "INNOCENT"
      resultColor = "#b0e2ff"
    }else if(state.sheriffJesterResult === "exact"){
      result = "JESTER"
      resultColor = roleColors.jester
    }else{
      result = "NOT INNOCENT"
      resultColor = "#e74c3c"
    }

  }else if(target.role === "executioner"){

    if(state.sheriffExecutionerResult === "innocent"){
      result = "INNOCENT"
      resultColor = "#b0e2ff"
    }else if(state.sheriffExecutionerResult === "exact"){
      result = "EXECUTIONER"
      resultColor = roleColors.executioner
    }else{
      result = "NOT INNOCENT"
      resultColor = "#e74c3c"
    }

  }else{
    let notInnocent = target.role === "mafia"
    result = notInnocent ? "NOT INNOCENT" : "INNOCENT"
    resultColor = notInnocent ? "#e74c3c" : "#b0e2ff"
  }

}

return { result, resultColor }
}

function showNightPrivateResultTurn(){

  let item = state.nightPrivateResults[state.nightRevealIndex]

  if(!item){
    showMorning()
    return
  }

  passPhone(item.playerName, "window.revealNightPrivateResult()")
}

window.revealNightPrivateResult = function(){

let item = state.nightPrivateResults[state.nightResultIndex]

if(!item){
  showMorning()
  return
}

if(item.type === "investigate"){
render(`

<div class="card role-sheriff">

<h2 class="role-title">INVESTIGATION RESULT</h2>

<p>${item.targetName} is</p>

<h1 style="
color:${item.resultColor};
text-shadow:
0 0 10px ${item.resultColor},
0 0 20px ${item.resultColor};
">
${item.result}
</h1>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
}
}

window.nextNightPrivateResult = function(){
  state.nightRevealIndex++
  showNightPrivateResultTurn()
}

function resolveNightSelections(){

let kill = state.nightActions.kill
let save = state.nightActions.save
let investigate = state.nightActions.investigate
let frame = state.nightActions.frame

let publicResults = []
let privateResults = []

if(investigate){
  let sheriff = state.players.find(p => p.alive && p.role === "sheriff")
  let target = state.players.find(p => p.name === investigate)

  if(sheriff && target){
    let isFramed = frame === target.name
    let sheriffData = buildSheriffResult(target, isFramed)

    privateResults.push({
      type: "investigate",
      playerName: sheriff.name,
      targetName: target.name,
      result: sheriffData.result,
      resultColor: sheriffData.resultColor
    })
  }
}

if(kill && kill !== save){

  addLogEntry(`${kill} was killed during the night.`)

  let victim = state.players.find(p => p.name === kill)

  if(victim){
    victim.alive = false

    let deathText = `${kill} was killed during the night.`

    if(shouldRevealOnNightDeath()){
      deathText += `<br>${revealedRoleText(victim)}`
    }

    publicResults.push({
      type: "death",
      text: deathText
    })
  }

}else if(kill && kill === save){

  if(state.doctorRevealSave){
    addLogEntry(`${save} was saved by the Doctor.`)
  }else{
    addLogEntry(`Someone was attacked but survived the night.`)
  }

  publicResults.push({
    type: "save",
    text: state.doctorRevealSave
      ? `${save} was saved by the Doctor!`
      : "Someone was attacked but survived the night."
  })

}else{

  addLogEntry(`The night was quiet.`)

  publicResults.push({
    type: "peace",
    text: "The night was quiet."
  })
}

state.nightPrivateResults = privateResults
state.nightResolved = {
  publicResults
}
}

function showMorning(){
setDay()

if(checkWin()) return

let results = state.nightResolved?.publicResults || []

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
let voteText = voter.role === "mayor"
  ? `${voter.name} voted for ${targetName} with 2 votes as Mayor.`
  : `${voter.name} voted for ${targetName}.`

addLogEntry(voteText)
}

state.gameStats.votesCast++

let votePower = 1

if(voter && voter.role === "mayor"){
votePower = 2
}

if(!state.votes[targetName]){
state.votes[targetName]=0
}

let voteWeight = 1

if(voter.role === "mayor"){
voteWeight = state.mayorVotePower
}

state.votes[targetName] += voteWeight

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

if(p.role !== "executioner") return false

if(state.executionerTargets[p.name] !== eliminated) return false

if(!state.executionerWinIfDead && !p.alive) return false

return true

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

${player && shouldRevealOnVoteDeath() ? revealedRoleText(player) : ""}

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

const panel = document.getElementById(`executioner-target-${playerName}`)
const arrow = document.getElementById(`executioner-arrow-${playerName}`)

if(!panel || !arrow) return

const isOpen = panel.classList.contains("show")

document.querySelectorAll(".executioner-target-reveal.show").forEach(el => {
  el.classList.remove("show")
})

document.querySelectorAll(".executioner-arrow").forEach(el => {
  el.style.transform = "rotate(0deg)"
})

if(!isOpen){
  panel.classList.add("show")
  arrow.style.transform = "rotate(90deg)"
}

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
    <span class="executioner-arrow" id="executioner-arrow-${p.name}">▸</span>
    EXECUTIONER
  </span>

</div>

${target ? `
<div class="executioner-target-reveal" id="executioner-target-${p.name}">
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