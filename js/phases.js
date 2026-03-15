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
state.nightResultOrder = state.players
  .filter(p => p.alive)
  .map(p => p.name)

if(state.mafiaKillMethod === "leader"){
  assignCurrentMafiaLeader()
}else{
  state.currentMafiaLeader = null
}

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
mayor: "#1d8161",
spirit: "#e6aafd",
framer: "#8b0000",
vigilante: "#3b48ff"
}

function showSpiritVoteRevealPrompt(player){

let targets = state.players
  .filter(p => p.name !== player.name)
  .map(p => `
    <button onclick="window.chooseSpiritVoteReveal('${p.name}')">
      ${p.name}
    </button>
  `)
  .join("")

if(state.spiritCanSkipReveal){
  targets += `
    <button class="skip-btn" onclick="window.chooseSpiritVoteReveal('__skip__')">
      Skip Reveal
    </button>
  `
}

render(`

<div class="card role-spirit">

<h2 class="role-title">SPIRIT AWAKENS</h2>

<p class="role-description">
Before the day ends, choose one player to reveal publicly.
</p>

${targets}

</div>

`)
}

function showNightSelectionTurn(){

let player = state.players[state.nightTurnIndex]

if(!player){
  const endedGame = resolveNightSelections()

  if(endedGame){
    return
  }

  state.nightStep = "results"
  state.nightResultIndex = 0
  showNightTurn()
  return
}

if(!player.alive){
  nextNightTurn()
  return
}

if(player.role === "mafia" && state.mafiaKillMethod === "leader"){
  if(player.name !== state.currentMafiaLeader){
    passPhone(player.name, "window.showMafiaWaitingScreen()")
    return
  }
}

passPhone(player.name, "window.revealNightRole()")
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

window.showMafiaWaitingScreen = function(){

let player = state.players[state.nightTurnIndex]

if(!player) return

let leaderText = ""

if(player.name === state.currentMafiaLeader){
  leaderText = `Tonight <strong>you</strong> are in charge of killing.`
}else if(state.mafiaKnowsFirstLeader){
  leaderText = `Tonight <strong>${state.currentMafiaLeader}</strong> is in charge of killing.`
}else{
  leaderText = `One of your teammates is in charge of killing tonight.`
}

render(`

<div class="card role-mafia">

<h2 class="role-title">MAFIA</h2>

<p class="role-description">
Your partner is choosing someone to kill tonight.
</p>

<p style="opacity:0.8;">
${leaderText}
</p>

<button onclick="window.nextNightTurn()">Hide</button>

${renderHostControls()}

</div>

`)
}

function showNightResultsTurn(){

let resultPlayers = getNightResultPlayers()
let player = resultPlayers[state.nightResultIndex]

if(!player){
  showMorning()
  return
}

passPhone(player.name, "window.revealNightPrivateResult()")
}

export function nextNightTurn(){
  state.nightTurnIndex++
  showNightSelectionTurn()
}

window.revealNightPrivateResult = function(){

let resultPlayers = getNightResultPlayers()
let player = resultPlayers[state.nightResultIndex]

if(!player){
  showMorning()
  return
}

let item = state.nightPrivateResults.find(r => r.playerName === player.name)

if(item && item.type === "investigate"){
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
return
}

if(item && item.type === "framer_success"){
render(`

<div class="card role-framer">

<h2 class="role-title">FRAMED SUCCESSFULLY</h2>

<p>You successfully framed</p>

<h1 style="
color:${roleColors.framer};
text-shadow:
0 0 10px ${roleColors.framer},
0 0 20px ${roleColors.framer};
">
${item.targetName.toUpperCase()}
</h1>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
return
}

if(item && item.type === "doctor_save_success"){
render(`

<div class="card role-doctor">

<h2 class="role-title">SAVE SUCCESSFUL</h2>

<p>You successfully saved your patient!</p>

<h1 style="
color:${roleColors.doctor};
text-shadow:
0 0 10px ${roleColors.doctor},
0 0 20px ${roleColors.doctor};
">
${item.targetName.toUpperCase()}
</h1>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
return
}

if(item && item.type === "mafia_kill_blocked"){
render(`

<div class="card role-mafia">

<h2 class="role-title">ATTACK FAILED</h2>

<p>Your attack on</p>

<h1 style="
color:${roleColors.mafia};
text-shadow:
0 0 10px ${roleColors.mafia},
0 0 20px ${roleColors.mafia};
">
${item.targetName.toUpperCase()}
</h1>

<p class="role-description">
was stopped by the doctor!
</p>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
return
}

if(item && item.type === "vigilante_blocked"){
render(`

<div class="card role-vigilante">

<h2 class="role-title">ATTACK FAILED</h2>

<p>Your attack on</p>

<h1 style="
color:${roleColors.vigilante};
text-shadow:
0 0 10px ${roleColors.vigilante},
0 0 20px ${roleColors.vigilante};
">
${item.targetName.toUpperCase()}
</h1>

<p class="role-description">
was stopped by the doctor!
</p>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
return
}

if(item && item.type === "vigilante_outcome"){
render(`

<div class="card role-vigilante">

<h2 class="role-title">VIGILANTE OUTCOME</h2>

<p>You headed to slash <strong>${item.targetName}</strong>.</p>

<p class="role-description">
${
  item.blocked
    ? "But the Doctor protected them. Your attack failed."
    : !item.targetDied && !item.vigilanteDies
      ? "But when you got there, they were already dead."
      : item.wrongTarget
        ? item.vigilanteDies && item.targetDied
          ? `${item.targetName} was a ${item.targetRole?.toUpperCase() || "TOWN"}. How could have this happened, you slash yourself and both of you die.`
          : item.vigilanteDies && !item.targetDied
            ? `${item.targetName} was a ${item.targetRole?.toUpperCase() || "TOWN"}. You realise fast enough but cannot believe your decision, you end your own life.`
            : !item.vigilanteDies && item.targetDied
              ? `${item.targetName} was a ${item.targetRole?.toUpperCase() || "TOWN"}. You cannot believe your eyes, but you're determined to correct your mistakes...`
              : "You attacked the wrong person."
        : `${item.targetName} was a ${item.targetRole?.toUpperCase() || "MAFIA"}, you stand proudly over the body.`
}
</p>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
return
}

if(item && item.type === "vigilante_incoming_death"){
render(`

<div class="card">

<h2>Night Results</h2>

<p style="
color:${roleColors[player.role] || "white"};
font-weight:bold;
text-shadow:
0 0 10px ${roleColors[player.role] || "white"};
">
${player.role.toUpperCase()}
</p>

<p class="role-description">
You have an eerie feeling that justice will be served tonight.
</p>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
return
}

if(item && item.type === "spirit_reveal_choice"){

let targets = state.players
  .filter(p => p.alive && p.name !== player.name)
  .map(p => `
    <button onclick="window.chooseSpiritReveal('${p.name}')">
      ${p.name}
    </button>
  `)
  .join("")

if(state.spiritCanSkipReveal){
  targets += `
    <button class="skip-btn" onclick="window.chooseSpiritReveal('__skip__')">
      Skip Reveal
    </button>
  `
}

render(`

<div class="card role-spirit">

<h2 class="role-title">YOU WERE KILLED</h2>

<p class="role-description">
Before morning, expose a player and show the world who they truly are.
</p>

${targets}

${renderHostControls()}

</div>

`)
return
}

let roleColor = roleColors[player.role] || "white"
let noResultText = getRandomNoResultText(player.role)

if(state.nightDeaths?.includes(player.name)){
  noResultText = "You had a terrifying nightmare, you have a bad feeling about tonight..."
}

render(`

<div class="card">

<h2>Night Results</h2>

<p style="
color:${roleColor};
font-weight:bold;
text-shadow:
0 0 10px ${roleColor};
">
${player.role.toUpperCase()}
</p>

<p class="role-description">
${noResultText}
</p>

<button onclick="window.nextNightResultTurn()">Hide</button>

${renderHostControls()}

</div>

`)
}

function getRandomNoResultText(roleName){

const role = roles[roleName]
if(!role) return "No results tonight."

let texts = role.noResultTexts || []

// Mafia special case
if(roleName === "mafia" && state.mafiaKillMethod === "leader"){
  let player = state.players[state.nightResultIndex]

  if(player && player.name !== state.currentMafiaLeader){
    texts = role.teammateKillTexts || role.noResultTexts
  }
}

if(!Array.isArray(texts) || !texts.length){
  return role.noResultText || "No results tonight."
}

if(!state.lastNoResultTexts){
  state.lastNoResultTexts = {}
}

let filtered = texts

if(texts.length > 1 && state.lastNoResultTexts[roleName]){
  filtered = texts.filter(t => t !== state.lastNoResultTexts[roleName])
}

const choice = filtered[Math.floor(Math.random() * filtered.length)]
state.lastNoResultTexts[roleName] = choice

return choice
}

window.nextNightResultTurn = function(){
state.nightResultIndex++
showNightTurn()
}

window.chooseSpiritReveal = function(targetName){

if(targetName === "__skip__"){
  state.spiritReveal = null
  addLogEntry("Spirit chose not to reveal anyone.")
}else{
  state.spiritReveal = targetName
  addLogEntry(`Spirit chose to reveal ${targetName}'s role.`)
}

window.nextNightResultTurn()
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

    if(player.role === "doctor") return true

    if(player.role === "framer"){
      return p.name !== player.name && p.role !== "mafia" && p.role !== "framer"
    }

    if(player.role === "vigilante"){
      return p.name !== player.name
    }

    return p.name !== player.name
})
.forEach(p=>{
targets+=`<button onclick="window.performNightAction('${p.name}')">
${p.name === player.name ? p.name + ' <span style="opacity:0.6">(You)</span>' : p.name}
</button>`
})

if(player.role === "vigilante"){
  targets += `<button class="skip-btn" onclick="window.performNightAction('__skip__')">Skip</button>`
}

render(`

<div class="card role-${roleClass}">

<h2 class="role-title">${player.role.toUpperCase()} ACTION</h2>

<p>
${player.role === "vigilante" ? "Serve justice, or abstain." : "Select a target"}
</p>

${targets}

${renderHostControls()}

</div>

`)
}

function assignCurrentMafiaLeader(){

  const aliveMafia = new Set(
    state.players
      .filter(p => p.alive && p.role === "mafia")
      .map(p => p.name)
  )

  const availableOrder = (state.mafiaLeaderOrder || []).filter(name =>
    aliveMafia.has(name)
  )

  if(!availableOrder.length){
    state.currentMafiaLeader = null
    return
  }

  state.currentMafiaLeader =
    availableOrder[state.mafiaLeaderIndex % availableOrder.length]

  state.mafiaLeaderIndex++
}

function resolveMafiaKillTarget(kills){

kills = kills.filter(kill => {
  const actor = state.players.find(p => p.name === kill.actor)
  return actor && actor.alive
})

if(!kills.length) return null

if(state.mafiaKillMethod === "leader"){
  return kills[0].target
}

let voteCounts = {}

kills.forEach(kill => {
  if(!voteCounts[kill.target]){
    voteCounts[kill.target] = 0
  }
  voteCounts[kill.target]++
})

let highest = 0
let tiedTargets = []

for(let target in voteCounts){
  let count = voteCounts[target]

  if(count > highest){
    highest = count
    tiedTargets = [target]
  }else if(count === highest){
    tiedTargets.push(target)
  }
}

if(tiedTargets.length === 1){
  return tiedTargets[0]
}

let chosen = tiedTargets[Math.floor(Math.random() * tiedTargets.length)]
addLogEntry(`Mafia vote tied between ${tiedTargets.join(", ")}. Randomly chosen target: ${chosen}.`)
return chosen
}

export function performNightAction(targetName){

let player = state.players[state.nightTurnIndex]
let role = roles[player.role]

if(role.nightAction === "vigilante_kill"){
  if(targetName === "__skip__"){
    addLogEntry(`Vigilante skipped.`)
  }else{
    state.nightActions.push({
      actor: player.name,
      role: player.role,
      action: role.nightAction,
      target: targetName
    })

    addLogEntry(`Vigilante targeted ${targetName}.`)
  }

  nextNightTurn()
  return
}

state.nightActions.push({
  actor: player.name,
  role: player.role,
  action: role.nightAction,
  target: targetName
})

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

nextNightTurn()
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
    }else if(target.role === "vigilante"){
      resultColor = roleColors.vigilante
    }else if(target.role === "framer"){
      resultColor = roleColors.framer
    }else if(target.role === "spirit"){
      resultColor = roleColors.spirit
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

  let item = state.nightPrivateResults[state.nightResultIndex]

  if(!item){
    showMorning()
    return
  }

  passPhone(item.playerName, "window.revealNightPrivateResult()")
}


function resolveNightSelections(){

let kills = state.nightActions.filter(a => a.action === "kill")
let saves = state.nightActions.filter(a => a.action === "save")
let investigations = state.nightActions.filter(a => a.action === "investigate")
let frames = state.nightActions.filter(a => a.action === "frame")
let vigilanteShots = state.nightActions.filter(a => a.action === "vigilante_kill")

state.vigilanteOutcomeToShow = null

let protectedTargets = saves.map(a => a.target)
let framedTargets = frames.map(a => a.target)
let instantNightWin = false

let publicResults = []
let privateResults = []

// Sheriff private result
investigations.forEach(investigation => {
  let sheriff = state.players.find(p => p.name === investigation.actor)
  let target = state.players.find(p => p.name === investigation.target)

  if(!sheriff || !target) return

  let isFramed = framedTargets.includes(target.name)
  let sheriffData = buildSheriffResult(target, isFramed)

  privateResults.push({
    type: "investigate",
    playerName: sheriff.name,
    targetName: target.name,
    result: sheriffData.result,
    resultColor: sheriffData.resultColor
  })
})

// Framer successful frame info
if(state.framerKnowsSuccess){
  investigations.forEach(investigation => {
    if(!framedTargets.includes(investigation.target)) return

    frames
      .filter(frame => frame.target === investigation.target)
      .forEach(frame => {
        privateResults.push({
          type: "framer_success",
          playerName: frame.actor,
          targetName: frame.target
        })
      })
  })
}

// Resolve Vigilante first
vigilanteShots.forEach(shot => {
  let shooter = state.players.find(p => p.name === shot.actor)
  let target = state.players.find(p => p.name === shot.target)

  if(!shooter || !shooter.alive) return

  // Target already dead before resolution
  if(!target || !target.alive){
    state.vigilanteOutcomeToShow = {
      shooter: shot.actor,
      target: shot.target,
      targetRole: null,
      targetDied: false,
      vigilanteDies: false,
      blocked: false
    }

    state.vigilantePublicReveal = state.vigilanteOutcomeToShow
    return
  }

if(instantNightWin){
  return
}
  
  // Doctor blocks Vigilante
  if(protectedTargets.includes(target.name)){
    addLogEntry(`Vigilante's attack on ${target.name} was stopped by the Doctor.`)

    state.vigilanteOutcomeToShow = {
      shooter: shooter.name,
      target: target.name,
      targetRole: target.role,
      targetDied: false,
      vigilanteDies: false,
      blocked: true
    }

    state.vigilantePublicReveal = state.vigilanteOutcomeToShow

    return
  }

const targetTeam = roles[target.role]?.team

const isWrongTarget =
  targetTeam !== "mafia" &&
  !(state.vigilanteCanKillNeutrals && targetTeam === "neutral")

let vigilanteDies = false
let targetDies = true

if(isWrongTarget){
  if(state.vigilanteWrongKillOutcome === "both_die"){
    vigilanteDies = true
    targetDies = true
  }else if(state.vigilanteWrongKillOutcome === "only_vigilante_dies"){
    vigilanteDies = true
    targetDies = false
  }else if(state.vigilanteWrongKillOutcome === "only_target_dies"){
    vigilanteDies = false
    targetDies = true
  }
}

  // Warn victim privately
  if(targetDies){
  privateResults.push({
    type: "vigilante_incoming_death",
    playerName: target.name
  })

  target.alive = false
  state.nightDeaths.push(target.name)
  addLogEntry(`${target.name} was slashed by the Vigilante.`)

if(state.executionerWinIfVigilanteKillsTarget){
  let executionerWinner = state.players.find(p => {
    if(p.role !== "executioner") return false
    if(state.executionerTargets[p.name] !== target.name) return false
    if(!state.executionerWinIfDead && !p.alive) return false
    return true
  })

  if(executionerWinner){
    addLogEntry(`${executionerWinner.name} won as the Executioner because the Vigilante killed ${target.name}.`)

    document.body.className = "win-executioner"

    render(`

<div class="card role-executioner">

<h1 class="role-title">EXECUTIONER WINS</h1>

<p>${executionerWinner.name} succeeded because the Vigilante killed their target, ${target.name}.</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

    instantNightWin = true
    return
  }
}

if(target.role === "jester" && state.jesterWinIfVigilanteKilled){

  addLogEntry(`${target.name} won as the Jester.`)

  document.body.className = "win-jester"

  render(`

<div class="card role-jester">

<h1 class="role-title">JESTER WINS</h1>

<p>${target.name} was killed by the Vigilante and wins as the Jester!</p>

<button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
<button onclick="location.reload()">Restart Game</button>

</div>

`)

  instantNightWin = true
  return
}

  if(target.role === "spirit" &&
     (state.spiritActivation === "night_only" || state.spiritActivation === "any_death")){
    privateResults.push({
      type: "spirit_reveal_choice",
      playerName: target.name
    })
  }
}

if(vigilanteDies && shooter.alive){
  shooter.alive = false
  state.nightDeaths.push(shooter.name)
  addLogEntry(`${shooter.name} died after attacking the wrong person.`)

  if(shooter.role === "spirit" &&
     (state.spiritActivation === "night_only" || state.spiritActivation === "any_death")){
    privateResults.push({
      type: "spirit_reveal_choice",
      playerName: shooter.name
    })
  }
}

  state.vigilanteOutcomeToShow = {
  shooter: shooter.name,
  target: target.name,
  targetRole: target.role,
  targetDied: targetDies,
  vigilanteDies,
  blocked: false,
  wrongTarget: isWrongTarget
}

  state.vigilantePublicReveal = state.vigilanteOutcomeToShow
})

if(instantNightWin){
  return true
}

// Resolve mafia kill AFTER Vigilante deaths
let killTarget = resolveMafiaKillTarget(kills)
const saveSucceeded = !!(killTarget && protectedTargets.includes(killTarget))

// Doctor successful save result against mafia
if(saveSucceeded){
  saves
    .filter(save => save.target === killTarget)
    .forEach(save => {
      privateResults.push({
        type: "doctor_save_success",
        playerName: save.actor,
        targetName: save.target
      })
    })

  let mafiaKillerName = null

  if(state.mafiaKillMethod === "leader"){
    const leader = state.players.find(p => p.name === state.currentMafiaLeader)
    if(leader && leader.alive){
      mafiaKillerName = state.currentMafiaLeader
    }
  }else{
    let aliveKills = kills.filter(k => {
      let actor = state.players.find(p => p.name === k.actor)
      return actor && actor.alive
    })

    if(aliveKills.length){
      let killAction = aliveKills.find(k => k.target === killTarget) || aliveKills[0]
      mafiaKillerName = killAction.actor
    }
  }

  if(mafiaKillerName){
    privateResults.push({
      type: "mafia_kill_blocked",
      playerName: mafiaKillerName,
      targetName: killTarget
    })
  }
}

// Public morning result for mafia kill
if(killTarget && !saveSucceeded){

  addLogEntry(`${killTarget} was killed during the night.`)

  let victim = state.players.find(p => p.name === killTarget)

  if(victim && victim.alive){
    victim.alive = false
    state.nightDeaths.push(victim.name)

    let deathText = `${killTarget} was killed during the night.`

    if(shouldRevealOnNightDeath()){
      deathText += `<br>${revealedRoleText(victim)}`
    }

    publicResults.push({
      type: "death",
      text: deathText
    })

    if(victim.role === "spirit" &&
       (state.spiritActivation === "night_only" || state.spiritActivation === "any_death")){
      privateResults.push({
        type: "spirit_reveal_choice",
        playerName: victim.name
      })
    }
  }

}else if(saveSucceeded){

  if(state.doctorRevealSave){
    addLogEntry(`${killTarget} was saved by the Doctor.`)
  }else{
    addLogEntry(`Someone was attacked but survived the night.`)
  }

  publicResults.push({
    type: "save",
    text: state.doctorRevealSave
      ? `${killTarget} was saved by the Doctor!`
      : "Someone was attacked but survived the night."
  })

}else{

  addLogEntry(`The night was quiet.`)

  publicResults.push({
    type: "peace",
    text: "The night was quiet."
  })
}

// Vigilante private result
if(state.vigilanteOutcomeToShow){
  privateResults.push({
    type: "vigilante_outcome",
    playerName: state.vigilanteOutcomeToShow.shooter,
    targetName: state.vigilanteOutcomeToShow.target,
    targetRole: state.vigilanteOutcomeToShow.targetRole,
    targetDied: state.vigilanteOutcomeToShow.targetDied,
    vigilanteDies: state.vigilanteOutcomeToShow.vigilanteDies,
    blocked: state.vigilanteOutcomeToShow.blocked,
    wrongTarget: state.vigilanteOutcomeToShow.wrongTarget
  })
}

state.nightPrivateResults = privateResults
state.nightResolved = {
  publicResults
}

return false
}

function showMorning(){
setDay()

if(checkWin()) return

let results = [...(state.nightResolved?.publicResults || [])]

if(state.spiritReveal){
  let revealedPlayer = state.players.find(p => p.name === state.spiritReveal)

  if(revealedPlayer){
    let revealLabel = ""
    let revealColor = "white"

    if(state.spiritRevealType === "team"){
      if(roles[revealedPlayer.role]?.team === "mafia"){
        revealLabel = "MAFIA"
        revealColor = roleColors.mafia
      }else if(roles[revealedPlayer.role]?.team === "neutral"){
        revealLabel = "NEUTRAL"
        revealColor = roleColors.executioner
      }else{
        revealLabel = "TOWN"
        revealColor = roleColors.villager
      }
    }else{
      revealLabel = revealedPlayer.role.toUpperCase()
      revealColor = roleColors[revealedPlayer.role] || "white"
    }

    results.push({
      type: "spirit_reveal",
      text: `
        The Spirit reveals that <strong>${revealedPlayer.name}</strong> is
        <span style="
          color:${revealColor};
          font-weight:bold;
          text-shadow:0 0 8px ${revealColor};
        ">
          ${revealLabel}
        </span>
      `
    })
  }
}

if(state.vigilantePublicReveal){

  const v = state.vigilantePublicReveal
  const targetPlayer = state.players.find(p => p.name === v.target)
  const shooterPlayer = state.players.find(p => p.name === v.shooter)

  let text = ""

  if(v.blocked){
    text = `The Vigilante tried to slash <strong>${v.target}</strong>, but the Doctor protected them.`

  }else if(v.wrongTarget){

    if(v.targetDied){
      text = `${v.target} was slashed by the Vigilante.`

      if(targetPlayer && shouldRevealOnNightDeath()){
        text += `<br>${revealedRoleText(targetPlayer)}`
      }
    }

    if(v.vigilanteDies){
      text += `${text ? "<br>" : ""}The Vigilante stabs their own heart in devastation.`

      if(shooterPlayer && shouldRevealOnNightDeath()){
        text += `<br>${revealedRoleText(shooterPlayer)}`
      }
    }

    if(!v.targetDied && !v.vigilanteDies){
      text = `The Vigilante killed an innocent, they need to get their head straight.`
    }

  }else if(!v.targetDied){

    text = `The Vigilante tried to slash <strong>${v.target}</strong>, but nothing happened.`

  }else{

    text = `${v.target} was slashed by the Vigilante.`

    if(targetPlayer && shouldRevealOnNightDeath()){
      text += `<br>${revealedRoleText(targetPlayer)}`
    }
  }

  results.push({
    type: "vigilante",
    text
  })

  state.vigilantePublicReveal = null
}

let resultsHTML = results.map(r => {
  let cls = ""
  if(r.type === "vigilante") cls = "night-result-vigilante"
  if(r.type === "death") cls = "night-result-death"
  if(r.type === "save") cls = "night-result-save"
  if(r.type === "peace") cls = "night-result-peace"
  if(r.type === "spirit_reveal") cls = "night-result-spirit"

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

function getNightResultPlayers(){
  return (state.nightResultOrder || [])
    .map(name => state.players.find(p => p.name === name))
    .filter(Boolean)
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

if(voter && voter.role === "mayor"){
voteWeight = state.mayorVotePower
}

state.votes[targetName] += voteWeight

state.voteTurnIndex++

nextVoteTurn()

}


window.chooseSpiritVoteReveal = function(targetName){

if(targetName === "__skip__"){
  state.spiritReveal = null
  addLogEntry("Spirit chose not to reveal anyone.")
}else{
  state.spiritReveal = targetName
  addLogEntry(`Spirit chose to reveal ${targetName}'s role.`)
}

continueResolveVotesAfterSpirit()
}

function continueResolveVotesAfterSpirit(){

let eliminated = state.pendingVoteEliminated
let resultsHTML = state.pendingVoteResultsHTML || ""

let player = state.players.find(p => p.name === eliminated)
if(!player) return

let executionerWinner = state.players.find(p => {

  if(p.role !== "executioner") return false
  if(state.executionerTargets[p.name] !== eliminated) return false
  if(!state.executionerWinIfDead && !p.alive) return false

  return true
})

let mafiaAliveAfterVote = state.players.filter(p => p.alive && p.role === "mafia").length

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

${renderSpiritPublicReveal()}

<button onclick="window.nextNight()">Next Night</button>

</div>

`)
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

if(player.role === "spirit" && state.spiritActivation === "any_death"){
  state.pendingSpiritVoteReveal = player.name
  state.pendingVoteEliminated = eliminated
  state.pendingVoteResultsHTML = resultsHTML
  showSpiritVoteRevealPrompt(player)
  return
}

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

function renderSpiritPublicReveal(){

if(!state.spiritReveal) return ""

let revealedPlayer = state.players.find(p => p.name === state.spiritReveal)
if(!revealedPlayer) return ""

let revealLabel = ""
let revealColor = "white"

if(state.spiritRevealType === "team"){
  if(roles[revealedPlayer.role]?.team === "mafia"){
    revealLabel = "MAFIA"
    revealColor = roleColors.mafia
  }else if(roles[revealedPlayer.role]?.team === "neutral"){
    revealLabel = "NEUTRAL"
    revealColor = roleColors.executioner
  }else{
    revealLabel = "TOWN"
    revealColor = roleColors.villager
  }
}else{
  revealLabel = revealedPlayer.role.toUpperCase()
  revealColor = roleColors[revealedPlayer.role] || "white"
}

return `
<div class="night-result night-result-spirit">
  The Spirit reveals that <strong>${revealedPlayer.name}</strong> is
  <span style="
    color:${revealColor};
    font-weight:bold;
    text-shadow:0 0 8px ${revealColor};
  ">
    ${revealLabel}
  </span>
</div>
`
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