import {state, resetNightActions} from "./state.js"
import {render, passPhone} from "./ui.js"
import {roles} from "./roles.js"
import {addLogEntry} from "./state.js"

function roleDisplayName(role){
  const names = {
    schrodingers_cat: "Schrödinger's Cat"
  }

  return names[role] || (role.charAt(0).toUpperCase() + role.slice(1))
}

function setDay() {
    document.body.classList.remove("night", "holy-night", "holy-night-flash");
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
      ${roleDisplayName(player.role)}
    </span>

  </div>

</div>
`
}

window.forceNextPhase = function(){

  if(state.phase === "night"){
  const endedGame = resolveNightSelections()
  if(endedGame) return

  state.nightStep = "results"
  state.nightResultIndex = 0
  showNightTurn()
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
vigilante: "#3b48ff",
priest: "#f6df8f",
schrodingers_cat: "#6d6d6d",
traitor: "#c44f4f",
}

function getEffectiveTeam(player){
  if(!player) return null

  if(player.role === "schrodingers_cat" && player.catAlignment){
    return player.catAlignment
  }

  return roles[player.role]?.team || null
}

function getPlayerByName(name){
  return state.players.find(p => p.name === name)
}

function isPlayerAlive(name){
  const player = getPlayerByName(name)
  return !!(player && player.alive)
}

function getPlayerTeam(player){
  return getEffectiveTeam(player)
}

function getExecutionerNewRole(){
  return state.executionerBecomes || "jester"
}

function hasExecutionerCompletedTarget(executioner){
  if(!executioner || executioner.role !== "executioner") return false

  const targetName = state.executionerTargets?.[executioner.name]
  if(!targetName) return false

  const target = getPlayerByName(targetName)
  return !!(target && !target.alive)
}

function convertExecutionerAfterTargetDeath(targetName, privateResults){
  state.players.forEach(player => {
    if(player.role !== "executioner") return
    if(state.executionerTargets?.[player.name] !== targetName) return

    const newRole = getExecutionerNewRole()

    player.wasExecutioner = true
player.executionerConvertedTo = newRole
player.role = newRole

    addLogEntry(`${player.name} became a ${roleDisplayName(newRole)} after their target ${targetName} died.`)

    privateResults.push({
      type: "executioner_converted",
      playerName: player.name,
      newRole
    })
  })
}

function canExecutionerWin(executioner){
  if(!executioner || executioner.role !== "executioner") return false
  if(state.executionerWinIfDead) return true
  return executioner.alive
}

function getExecutionerWinnerForTarget(targetName){
  return state.players.find(player => {
    if(player.role !== "executioner") return false
    if(state.executionerTargets[player.name] !== targetName) return false
    return canExecutionerWin(player)
  }) || null
}

function addSpiritChoiceIfNeeded(playerName, privateResults){
  const player = getPlayerByName(playerName)
  if(!player) return

  if(
    player.role === "spirit" &&
    (state.spiritActivation === "night_only" || state.spiritActivation === "any_death")
  ){
    privateResults.push({
      type: "spirit_reveal_choice",
      playerName: player.name
    })
  }
}

function killPlayer(playerName, reasonText, privateResults, options = {}){
  const player = getPlayerByName(playerName)
  if(!player || !player.alive) return false

  player.alive = false

  if(!state.nightDeaths.includes(player.name)){
    state.nightDeaths.push(player.name)
  }

  if(reasonText){
    addLogEntry(reasonText)
  }

  if(options.warnPrivately){
    privateResults.push({
      type: "vigilante_incoming_death",
      playerName: player.name
    })
  }

  addSpiritChoiceIfNeeded(player.name, privateResults)
  return true
}

function renderSimpleWinScreen(bodyClass, cardClass, title, lines){
  document.body.className = bodyClass

  render(`
    <div class="card ${cardClass}">
      <h1 class="role-title">${title}</h1>

      ${lines.map(line => `<p>${line}</p>`).join("")}

      <button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
      <button onclick="location.reload()">Restart Game</button>
    </div>
  `)
}

function renderVengefulLunaticWin(playerName){
  document.body.className = "win-executioner-to-jester"

  render(`

    <div class="card special-exejes-win">

      <h1 class="role-title" style="
        color:${roleColors.jester};
        text-shadow:
          0 0 10px ${roleColors.jester},
          0 0 22px ${roleColors.jester},
          0 0 36px rgba(255,62,165,0.45);
        letter-spacing:2px;
      ">
        VENGEFUL LUNATIC
      </h1>

      <p style="
        color:#ffd9f0;
        font-size:18px;
        margin-top:8px;
      ">
        The Executioner lost their purpose... and their mind!
      </p>

      <div style="
        margin:24px 0 14px 0;
        padding:18px;
        border-radius:18px;
        background:linear-gradient(
          135deg,
          rgba(122,47,111,0.20),
          rgba(255,62,165,0.18),
          rgba(255,255,255,0.05)
        );
        border:1px solid rgba(255,255,255,0.10);
        box-shadow:
          0 0 24px rgba(255,62,165,0.14),
          0 0 22px rgba(122,47,111,0.10);
      ">
        <p style="
          margin:0;
          color:${roleColors.jester};
          font-weight:700;
          text-shadow:0 0 10px ${roleColors.jester};
          font-size:22px;
        ">
          ${playerName} wins after turning from Executioner into Jester
        </p>
      </div>

      <p class="role-description" style="
        color:#ffeaf7;
        max-width:520px;
        margin:0 auto 8px auto;
      ">
        Their original target died in the night, their role changed, and the town still
        fell for the act.
      </p>

      <p style="
        color:${roleColors.executioner};
        opacity:0.95;
        font-weight:600;
        text-shadow:0 0 8px ${roleColors.executioner};
        margin-top:16px;
      ">
        First revenge. Then madness.
      </p>

      <div style="margin-top:24px;">
        <button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
        <button onclick="location.reload()">Restart Game</button>
      </div>

    </div>

  `)
}

function renderTwistedJusticeWin(jesterName, executionerName){
  document.body.className = "win-jester-executioner-vigilante"

  render(`
    <div class="card special-chaos-win">

      <h1 class="role-title" style="
        color:${roleColors.vigilante};
        text-shadow:
          0 0 10px ${roleColors.vigilante},
          0 0 22px ${roleColors.vigilante},
          0 0 36px rgba(59,72,255,0.45);
        letter-spacing:2px;
      ">
        TWISTED JUSTICE
      </h1>

      <p style="
        color:#d9dcff;
        font-size:18px;
        margin-top:8px;
      ">
        The Vigilante struck the wrong target...
      </p>

      <div style="
        margin:24px 0 14px 0;
        padding:18px;
        border-radius:18px;
        background:linear-gradient(
          135deg,
          rgba(255,62,165,0.16),
          rgba(122,47,111,0.18),
          rgba(59,72,255,0.16)
        );
        border:1px solid rgba(255,255,255,0.10);
        box-shadow:
          0 0 24px rgba(59,72,255,0.14),
          0 0 22px rgba(255,62,165,0.10);
      ">
        <p style="
          margin:0 0 10px 0;
          color:${roleColors.jester};
          font-weight:700;
          text-shadow:0 0 10px ${roleColors.jester};
        ">
          ${jesterName} wins as the Jester
        </p>

        <p style="
          margin:0;
          color:${roleColors.executioner};
          font-weight:700;
          text-shadow:0 0 10px ${roleColors.executioner};
        ">
          ${executionerName} wins as the Executioner
        </p>
      </div>

      <p class="role-description" style="
        color:#e7e9ff;
        max-width:520px;
        margin:0 auto 8px auto;
      ">
        ${jesterName} was the Executioner’s target — and when the Vigilante killed the Jester,
        fate handed victory to them both.
      </p>

      <p style="
        color:${roleColors.vigilante};
        opacity:0.95;
        font-weight:600;
        text-shadow:0 0 8px ${roleColors.vigilante};
        margin-top:16px;
      ">
        A single blade. Two winners.
      </p>

      <div style="margin-top:24px;">
        <button onclick="window.showRoleRevealEnd()">Reveal Roles</button>
        <button onclick="location.reload()">Restart Game</button>
      </div>

    </div>
  `)
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
  let progress = `${state.nightResultIndex + 1} / ${resultPlayers.length}`

  function renderNightResultCard({
    roleClass = "",
    kicker = "Night Results",
    title = player.name,
    subtitle = "What happened to you tonight",
    bodyHTML = "",
    buttonText = "Continue"
  }){
    render(`
      <div class="card reveal-role-card ${roleClass ? `role-${roleClass}` : ""}">

        <div class="reveal-role-topbar">
          <div class="reveal-role-kicker">${kicker}</div>
          <div class="reveal-role-progress">${progress}</div>
        </div>

        <div class="reveal-role-header">
          <div class="reveal-role-player">${title}</div>
          <div class="reveal-role-hint">${subtitle}</div>
        </div>

        ${bodyHTML}

        <div class="reveal-role-actions">
          <button onclick="window.nextNightResultTurn()">${buttonText}</button>
        </div>

        ${renderHostControls()}

      </div>
    `)
  }

  if(item && item.type === "investigate"){
    renderNightResultCard({
      roleClass: "sheriff",
      kicker: "Night Results",
      title: player.name,
      subtitle: "Your investigation is complete",
      bodyHTML: `
        <div class="night-action-role-box sheriff-result-box">
          <div class="night-action-role-kicker">Investigation Result</div>
          <div class="night-result-line">${item.targetName} is</div>
          <div class="night-action-role-name" style="
            color:${item.resultColor};
            text-shadow:
              0 0 10px ${item.resultColor},
              0 0 20px ${item.resultColor};
          ">
            ${item.result}
          </div>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "executioner_converted"){
    const newColor = roleColors[item.newRole] || "white"

    renderNightResultCard({
      roleClass: item.newRole,
      kicker: "Role Changed",
      title: player.name,
      subtitle: "Your purpose has ended",
      bodyHTML: `
        <div class="night-action-role-box executioner-convert-box">
          <div class="night-action-role-kicker">New Role</div>
          <p class="role-description">Your target died.</p>
          <p class="role-description">You are no longer the Executioner.</p>

          <div class="night-action-role-name" style="
            color:${newColor};
            text-shadow:
              0 0 10px ${newColor},
              0 0 20px ${newColor};
          ">
            ${roleDisplayName(item.newRole).toUpperCase()}
          </div>

          <p class="role-description">Play as your new role from now on.</p>
        </div>
      `
    })
    return
  }

  if(item && item.type === "cat_converted"){
    const joinedColor = item.joinedTeam === "mafia"
      ? roleColors.mafia
      : roleColors.villager

    const joinedLabel = item.joinedTeam === "mafia"
      ? "MAFIA"
      : "TOWN"

    renderNightResultCard({
      roleClass: "schrodingers_cat",
      kicker: "Secret Fate",
      title: player.name,
      subtitle: "You did not die tonight",
      bodyHTML: `
        <div class="night-action-role-box cat-result-box">
          <div class="night-action-role-kicker">Schrödinger's Cat</div>
          <p class="role-description">You were attacked... but you were just too cute.</p>

          <div class="night-result-panel">
            <p class="role-description" style="margin:0 0 8px 0;">
              Because you were attacked by the <strong>${item.killerRoleLabel}</strong>,
              you secretly joined the
            </p>

            <div class="night-action-role-name" style="
              color:${joinedColor};
              text-shadow:0 0 8px ${joinedColor};
            ">
              ${joinedLabel}
            </div>
          </div>

          ${
            item.mafiaNames?.length
              ? `
                <div class="night-result-panel mafia-ally-panel">
                  <div class="night-action-role-kicker">Your New Ally</div>
                  <div class="night-result-big-list" style="
                    color:${roleColors.mafia};
                    text-shadow:0 0 8px ${roleColors.mafia};
                  ">
                    ${item.mafiaNames.join("<br>")}
                  </div>
                </div>
              `
              : `
                <p class="role-description">Your fate has changed. Play your new role wisely.</p>
              `
          }
        </div>
      `
    })
    return
  }

  if(item && item.type === "cat_conversion_killer"){
    const joinedColor = item.joinedTeam === "mafia"
      ? roleColors.mafia
      : roleColors.villager

    const joinedLabel = item.joinedTeam === "mafia"
      ? "MAFIA"
      : "TOWN"

    renderNightResultCard({
      roleClass: "schrodingers_cat",
      kicker: "Secret Outcome",
      title: player.name,
      subtitle: "Your target did not die publicly",
      bodyHTML: `
        <div class="night-action-role-box cat-result-box">
          <div class="night-action-role-kicker">A Cat Joins You</div>
          <p class="role-description">
            Your target, <strong>${item.targetName}</strong>, was Schrödinger's Cat.
          </p>

          <div class="night-result-panel">
            <p class="role-description" style="margin:0 0 8px 0;">They did not die publicly.</p>
            <p class="role-description" style="margin:0;">They have secretly joined the</p>

            <div class="night-action-role-name" style="
              color:${joinedColor};
              text-shadow:0 0 8px ${joinedColor};
            ">
              ${joinedLabel}
            </div>
          </div>

          <p class="role-description">Keep this information secret.</p>
        </div>
      `
    })
    return
  }

  if(item && item.type === "priest_result"){
    const blockedText = item.blockedRoles.length
      ? item.blockedRoles.join(" and ")
      : "No attacks"

    renderNightResultCard({
      roleClass: "priest",
      kicker: "Holy Result",
      title: player.name,
      subtitle: "Your blessing protected the town",
      bodyHTML: `
        <div class="night-action-role-box priest-result-box">
          <div class="night-action-role-kicker">Holy Spirit Outcome</div>

          <div class="night-action-role-name" style="
            color:${roleColors.priest};
            text-shadow:
              0 0 10px ${roleColors.priest},
              0 0 20px ${roleColors.priest};
          ">
            ${blockedText.toUpperCase()}
          </div>

          <p class="role-description">were blocked by the Holy Spirit.</p>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "framer_success"){
    renderNightResultCard({
      roleClass: "framer",
      kicker: "Night Results",
      title: player.name,
      subtitle: "Your deception worked",
      bodyHTML: `
        <div class="night-action-role-box framer-result-box">
          <div class="night-action-role-kicker">Framed Successfully</div>
          <p class="role-description">You successfully framed</p>

          <div class="night-action-role-name" style="
            color:${roleColors.framer};
            text-shadow:
              0 0 10px ${roleColors.framer},
              0 0 20px ${roleColors.framer};
          ">
            ${item.targetName.toUpperCase()}
          </div>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "doctor_save_success"){
    renderNightResultCard({
      roleClass: "doctor",
      kicker: "Night Results",
      title: player.name,
      subtitle: "You saved someone tonight",
      bodyHTML: `
        <div class="night-action-role-box doctor-result-box">
          <div class="night-action-role-kicker">Save Successful</div>
          <p class="role-description">You successfully saved your patient!</p>

          <div class="night-action-role-name" style="
            color:${roleColors.doctor};
            text-shadow:
              0 0 10px ${roleColors.doctor},
              0 0 20px ${roleColors.doctor};
          ">
            ${item.targetName.toUpperCase()}
          </div>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "mafia_kill_blocked"){
    renderNightResultCard({
      roleClass: "mafia",
      kicker: "Night Results",
      title: player.name,
      subtitle: "Your attack failed",
      bodyHTML: `
        <div class="night-action-role-box mafia-result-box">
          <div class="night-action-role-kicker">Attack Failed</div>
          <p class="role-description">Your attack on</p>

          <div class="night-action-role-name" style="
            color:${roleColors.mafia};
            text-shadow:
              0 0 10px ${roleColors.mafia},
              0 0 20px ${roleColors.mafia};
          ">
            ${item.targetName.toUpperCase()}
          </div>

          <p class="role-description">was stopped by the Doctor!</p>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "mafia_kill_blocked_priest"){
    renderNightResultCard({
      roleClass: "priest",
      kicker: "Night Results",
      title: player.name,
      subtitle: "Holy power stopped the attack",
      bodyHTML: `
        <div class="night-action-role-box priest-result-box">
          <div class="night-action-role-kicker">Holy Shield Held</div>
          <p class="role-description">The attack on</p>

          <div class="night-action-role-name" style="
            color:${roleColors.priest};
            text-shadow:
              0 0 10px ${roleColors.priest},
              0 0 20px ${roleColors.priest};
          ">
            ${item.targetName.toUpperCase()}
          </div>

          <p class="role-description">was stopped by the Holy Spirit.</p>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "vigilante_blocked"){
    renderNightResultCard({
      roleClass: "vigilante",
      kicker: "Night Results",
      title: player.name,
      subtitle: "Your attack failed",
      bodyHTML: `
        <div class="night-action-role-box vigilante-result-box">
          <div class="night-action-role-kicker">Attack Failed</div>
          <p class="role-description">Your attack on</p>

          <div class="night-action-role-name" style="
            color:${roleColors.vigilante};
            text-shadow:
              0 0 10px ${roleColors.vigilante},
              0 0 20px ${roleColors.vigilante};
          ">
            ${item.targetName.toUpperCase()}
          </div>

          <p class="role-description">was stopped by the Doctor!</p>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "vigilante_blocked_priest"){
    renderNightResultCard({
      roleClass: "priest",
      kicker: "Night Results",
      title: player.name,
      subtitle: "Holy power stopped the attack",
      bodyHTML: `
        <div class="night-action-role-box priest-result-box">
          <div class="night-action-role-kicker">Holy Shield Held</div>
          <p class="role-description">Your attack on</p>

          <div class="night-action-role-name" style="
            color:${roleColors.priest};
            text-shadow:
              0 0 10px ${roleColors.priest},
              0 0 20px ${roleColors.priest};
          ">
            ${item.targetName.toUpperCase()}
          </div>

          <p class="role-description">was stopped by the Holy Spirit.</p>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "vigilante_outcome"){
    renderNightResultCard({
      roleClass: "vigilante",
      kicker: "Night Results",
      title: player.name,
      subtitle: "You carried out your attack",
      bodyHTML: `
        <div class="night-action-role-box vigilante-result-box">
          <div class="night-action-role-kicker">Vigilante Outcome</div>

          <p class="role-description">You headed to slash <strong>${item.targetName}</strong>.</p>

          <div class="night-result-panel">
            <p class="role-description">
              ${
                item.blocked
                  ? "But the Doctor protected them. Your attack failed."
                  : !item.targetDied && !item.vigilanteDies
                    ? "But when you got there, they were already dead."
                    : item.wrongTarget
                      ? item.vigilanteDies && item.targetDied
                        ? `${item.targetName} was a ${item.targetRole?.toUpperCase() || "TOWN"}. How could this have happened? You slash yourself and both of you die.`
                        : item.vigilanteDies && !item.targetDied
                          ? `${item.targetName} was a ${item.targetRole?.toUpperCase() || "TOWN"}. You realise fast enough but cannot believe your decision, and end your own life.`
                          : !item.vigilanteDies && item.targetDied
                            ? `${item.targetName} was a ${item.targetRole?.toUpperCase() || "TOWN"}. You cannot believe your eyes, but you're determined to correct your mistakes...`
                            : "You attacked the wrong person."
                      : `${item.targetName} was a ${item.targetRole?.toUpperCase() || "MAFIA"}, and you stand proudly over the body.`
              }
            </p>
          </div>
        </div>
      `,
      buttonText: "Hide"
    })
    return
  }

  if(item && item.type === "vigilante_incoming_death"){
    renderNightResultCard({
      roleClass: player.role,
      kicker: "Night Results",
      title: player.name,
      subtitle: "Something feels wrong tonight",
      bodyHTML: `
        <div class="night-action-role-box">
          <div class="night-action-role-kicker">A Bad Feeling</div>
          <div class="night-action-role-name" style="
            color:${roleColors[player.role] || "white"};
            text-shadow:0 0 10px ${roleColors[player.role] || "white"};
          ">
            ${roleDisplayName(player.role)}
          </div>

          <p class="role-description">
            You have an eerie feeling that justice will be served tonight.
          </p>
        </div>
      `,
      buttonText: "Hide"
    })
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
      <div class="card reveal-role-card role-spirit">

        <div class="reveal-role-topbar">
          <div class="reveal-role-kicker">Night Results</div>
          <div class="reveal-role-progress">${progress}</div>
        </div>

        <div class="reveal-role-header">
          <div class="reveal-role-player">${player.name}</div>
          <div class="reveal-role-hint">You may reveal one player before morning</div>
        </div>

        <div class="night-action-role-box spirit-result-box">
          <div class="night-action-role-kicker">You Were Killed</div>
          <p class="role-description">
            Before morning, expose a player and show the world who they truly are.
          </p>
        </div>

        <div class="night-action-buttons">
          ${targets}
        </div>

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

  renderNightResultCard({
    roleClass: player.role,
    kicker: "Night Results",
    title: player.name,
    subtitle: "Nothing special reached you tonight",
    bodyHTML: `
      <div class="night-action-role-box">
        <div class="night-action-role-kicker">Your Role</div>
        <div class="night-action-role-name" style="
          color:${roleColor};
          text-shadow:0 0 10px ${roleColor};
        ">
          ${roleDisplayName(player.role)}
        </div>

        <p class="role-description">
          ${noResultText}
        </p>
      </div>
    `,
    buttonText: "Hide"
  })
}

function convertSchrodingersCat(target, joinedTeam, killerRoleLabel, killerName, privateResults){
  if(!target || !target.alive) return false
  if(target.role !== "schrodingers_cat") return false
  if(target.catAlignment) return false // already converted once

  target.catAlignment = joinedTeam

  addLogEntry(
    `${target.name} was attacked by the ${killerRoleLabel} and secretly joined the ${joinedTeam}.`
  )

  privateResults.push({
    type: "cat_converted",
    playerName: target.name,
    joinedTeam,
    killerRoleLabel,
    mafiaNames: joinedTeam === "mafia"
      ? state.players
          .filter(p => getEffectiveTeam(p) === "mafia" && p.name !== target.name)
          .map(p => p.name)
      : []
  })

  if(killerName){
    privateResults.push({
      type: "cat_conversion_killer",
      playerName: killerName,
      targetName: target.name,
      joinedTeam
    })
  }

  return true
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
  const alivePlayers = state.players.filter(p => p.alive)
  const currentNightPlayerNumber =
    alivePlayers.findIndex(p => p.name === player.name) + 1

  if(!role.nightAction){
    let roleKey = player.role.toLowerCase()
    let color = roleColors[roleKey] || "white"

    render(`

      <div class="card reveal-role-card role-${roleKey}" style="--reveal-role-color:${color};">

        <div class="reveal-role-topbar">
          <div class="reveal-role-kicker">Night Role Reveal</div>
          <div class="reveal-role-progress">
            ${state.nightTurnIndex + 1} / ${state.players.filter(p => p.alive).length}
          </div>
        </div>

        <div class="reveal-role-header">
          <div class="reveal-role-player">${player.name}</div>
          <div class="reveal-role-hint">Sleep peacefully tonight</div>
        </div>

        <div class="role-card reveal-role-flip revealed" id="roleCard">
          <div class="role-inner">

            <div class="role-front reveal-role-front">
              <div class="reveal-role-front-shimmer"></div>

              <div class="reveal-role-front-inner">
                <div class="reveal-role-front-icon">✦</div>
                <div class="reveal-role-front-label">Your Role</div>
                <div class="reveal-role-front-text">${roleDisplayName(player.role)}</div>
              </div>
            </div>

            <div class="role-back reveal-role-back" style="color:${color}">
              <div class="reveal-role-back-inner">
                <div class="reveal-role-back-kicker">Your Role</div>
                <div class="reveal-role-name">${roleDisplayName(player.role)}</div>
              </div>
            </div>

          </div>
        </div>

        <div class="reveal-role-description-wrap">
          <p class="role-description reveal-role-description">
            ${role.description || ""}
          </p>
        </div>

        <div class="reveal-role-actions">
          <button onclick="window.nextNightTurn()">Continue</button>
        </div>

        ${renderHostControls()}

      </div>

    `)

    return
  }

  showNightAction(player, role)
}

function showNightAction(player){

  let roleClass = player.role.toLowerCase()
  const alivePlayers = state.players.filter(p => p.alive)
  const currentNightPlayerNumber =
    alivePlayers.findIndex(p => p.name === player.name) + 1

  const actionText = {
    mafia: "Choose someone to eliminate under cover of darkness.",
    doctor: "Choose one player to protect tonight.",
    sheriff: "Choose one player to investigate.",
    framer: "Choose someone to frame before the Sheriff investigates.",
    vigilante: "Serve justice carefully — or stand down.",
    priest: "Call upon the Holy Spirit to shield the town tonight?"
  }

  if(player.role === "priest"){
    const usesLeft = player.priestUsesLeft ?? state.priestUsesPerGame
    const canUse = usesLeft > 0

    render(`

      <div class="card reveal-role-card role-priest night-action-shell" style="--reveal-role-color:${roleColors.priest};">

        <div class="reveal-role-topbar">
          <div class="reveal-role-kicker">Night Action</div>
          <div class="reveal-role-progress">
            ${currentNightPlayerNumber} / ${alivePlayers.length}
          </div>
        </div>

        <div class="reveal-role-header">
          <div class="reveal-role-player">${player.name}</div>
          <div class="reveal-role-hint">A blessing can change the whole night</div>
        </div>

        <div class="role-card reveal-role-flip revealed">
          <div class="role-inner">
            <div class="role-front reveal-role-front">
              <div class="reveal-role-front-shimmer"></div>
              <div class="reveal-role-front-inner">
                <div class="reveal-role-front-icon">✦</div>
                <div class="reveal-role-front-label">Your Role</div>
                <div class="reveal-role-front-text">${roleDisplayName(player.role)}</div>
              </div>
            </div>

            <div class="role-back reveal-role-back" style="color:${roleColors.priest}">
              <div class="reveal-role-back-inner">
                <div class="reveal-role-back-kicker">Your Role</div>
                <div class="reveal-role-name">${roleDisplayName(player.role)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="night-action-panel">
          <div class="night-action-label">Decision</div>
          <div class="night-action-text">
            ${actionText.priest}
          </div>

          <div class="night-action-note">
            Holy Spirit uses left: <strong>${usesLeft}</strong>
          </div>
        </div>

        <div class="night-action-target-grid">
          ${
            canUse
              ? `<button onclick="window.performNightAction('__use__')">Use Holy Spirit</button>`
              : `<button disabled>No Uses Left</button>`
          }

          <button class="skip-btn" onclick="window.performNightAction('__skip__')">Skip Holy Spirit</button>
        </div>

        ${renderHostControls()}

      </div>

    `)
    return
  }

  let targets = ""

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
      if(player.role === "mafia"){
        return p.name !== player.name && getEffectiveTeam(p) !== "mafia"
      }

      return p.name !== player.name
    })
    .forEach(p => {
      targets += `
        <button onclick="window.performNightAction('${p.name}')">
          ${p.name === player.name ? `${p.name} <span style="opacity:0.6">(You)</span>` : p.name}
        </button>
      `
    })

  if(player.role === "vigilante"){
    targets += `<button class="skip-btn" onclick="window.performNightAction('__skip__')">Skip Attack</button>`
  }

  render(`

    <div class="card reveal-role-card role-${roleClass} night-action-shell" style="--reveal-role-color:${roleColors[player.role] || "white"};">

      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Night Action</div>
        <div class="reveal-role-progress">
          ${currentNightPlayerNumber} / ${alivePlayers.length}
        </div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${player.name}</div>
        <div class="reveal-role-hint">
          ${
            player.role === "mafia" ? "Move in secret" :
            player.role === "doctor" ? "Protect wisely" :
            player.role === "sheriff" ? "Seek the truth" :
            player.role === "framer" ? "Plant suspicion" :
            player.role === "vigilante" ? "Justice has a cost" :
            "Choose your action"
          }
        </div>
      </div>

      <div class="role-card reveal-role-flip revealed">
        <div class="role-inner">
          <div class="role-front reveal-role-front">
            <div class="reveal-role-front-shimmer"></div>
            <div class="reveal-role-front-inner">
              <div class="reveal-role-front-icon">✦</div>
              <div class="reveal-role-front-label">Your Role</div>
              <div class="reveal-role-front-text">${roleDisplayName(player.role)}</div>
            </div>
          </div>

          <div class="role-back reveal-role-back" style="color:${roleColors[player.role] || "white"}">
            <div class="reveal-role-back-inner">
              <div class="reveal-role-back-kicker">Your Role</div>
              <div class="reveal-role-name">${roleDisplayName(player.role)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="night-action-panel">
        <div class="night-action-label">Decision</div>
        <div class="night-action-text">
          ${actionText[player.role] || "Choose your target."}
        </div>
      </div>

      <div class="night-action-target-grid">
        ${targets}
      </div>

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

if(role.nightAction === "holy_shield"){

  if(targetName === "__use__"){

    if((player.priestUsesLeft ?? 0) <= 0){
      addLogEntry(`${player.name} tried to use Holy Spirit but had no uses left.`)

      render(`
        <div class="card role-priest">
          <h2 class="role-title">NO HOLY SPIRIT LEFT</h2>

          <p class="role-description">
            You have already used all of your Holy Spirit charges this game.
          </p>

          <button onclick="window.nextNightTurn()">Continue</button>

          ${renderHostControls()}
        </div>
      `)
      return
    }

    player.priestUsesLeft--

    state.nightActions.push({
      actor: player.name,
      role: player.role,
      action: role.nightAction,
      target: "__use__"
    })

    addLogEntry(`Priest used Holy Spirit. (${player.priestUsesLeft} uses left)`)

if(!document.querySelector(".holy-pulse")){
  const pulse = document.createElement("div")
  pulse.className = "holy-pulse"
  document.body.appendChild(pulse)
}

document.body.classList.remove("holy-night-flash")
void document.body.offsetWidth
document.body.classList.add("holy-night-flash")

setTimeout(() => {
  document.body.classList.remove("holy-night-flash")
}, 700)

  }else{
    addLogEntry(`Priest did not use Holy Spirit.`)
  }

  nextNightTurn()
  return
}

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

let mafia = alive.filter(p => getEffectiveTeam(p) === "mafia").length
let villagers = alive.filter(p => getEffectiveTeam(p) !== "mafia").length

// Mafia win
if(mafia >= villagers){

let mafiaPlayers = state.players
.filter(p => getEffectiveTeam(p) === "mafia")
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
.filter(p => getEffectiveTeam(p) === "mafia")
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

function resolveNightSelections(){

  const kills = state.nightActions.filter(a => a.action === "kill")
  const saves = state.nightActions.filter(a => a.action === "save")
  const investigations = state.nightActions.filter(a => a.action === "investigate")
  const frames = state.nightActions.filter(a => a.action === "frame")
  const vigilanteShots = state.nightActions.filter(a => a.action === "vigilante_kill")
  const priestShields = state.nightActions.filter(a => a.action === "holy_shield")

  const holyShieldActive = priestShields.length > 0
  state.priestShieldActive = holyShieldActive
  state.priestBlockedAttacks = []
  state.priestPublicShield = false

  state.vigilanteOutcomeToShow = null

  const protectedTargets = saves.map(a => a.target)
  const framedTargets = frames.map(a => a.target)

  const publicResults = []
  const privateResults = []

  
  // Sheriff results
  investigations.forEach(investigation => {
    const sheriff = getPlayerByName(investigation.actor)
    const target = getPlayerByName(investigation.target)

    if(!sheriff || !target) return

    const isFramed = framedTargets.includes(target.name)
    const sheriffData = buildSheriffResult(target, isFramed)

    privateResults.push({
      type: "investigate",
      playerName: sheriff.name,
      targetName: target.name,
      result: sheriffData.result,
      resultColor: sheriffData.resultColor
    })
  })

  // Framer success feedback
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

  // Resolve vigilante first
  let instantNightWin = false

  vigilanteShots.forEach(shot => {
    if(instantNightWin) return

    const shooter = getPlayerByName(shot.actor)
    const target = getPlayerByName(shot.target)

    if(!shooter || !shooter.alive) return

    // target already dead
    if(!target || !target.alive){
      state.vigilanteOutcomeToShow = {
        shooter: shot.actor,
        target: shot.target,
        targetRole: null,
        targetDied: false,
        vigilanteDies: false,
        blocked: false,
        wrongTarget: false
      }

      state.vigilantePublicReveal = state.vigilanteOutcomeToShow
      return
    }

   if(holyShieldActive){
  addLogEntry(`Holy Spirit blocked the Vigilante's attack on ${target.name}.`)

  state.priestBlockedAttacks.push("Vigilante")

  privateResults.push({
    type: "vigilante_blocked_priest",
    playerName: shooter.name,
    targetName: target.name
  })

  state.vigilanteOutcomeToShow = {
    shooter: shooter.name,
    target: target.name,
    targetRole: target.role,
    targetDied: false,
    vigilanteDies: false,
    blocked: true,
    wrongTarget: false,
    blockedByHolySpirit: true
  }

  state.vigilantePublicReveal = state.vigilanteOutcomeToShow
  state.priestPublicShield = true

  return
}

    // doctor blocks vigilante
    if(protectedTargets.includes(target.name)){
      addLogEntry(`Vigilante's attack on ${target.name} was stopped by the Doctor.`)

      state.vigilanteOutcomeToShow = {
        shooter: shooter.name,
        target: target.name,
        targetRole: target.role,
        targetDied: false,
        vigilanteDies: false,
        blocked: true,
        wrongTarget: false
      }

      state.vigilantePublicReveal = state.vigilanteOutcomeToShow

      privateResults.push({
        type: "vigilante_blocked",
        playerName: shooter.name,
        targetName: target.name
      })

      return
    }

        if(
      target.role === "schrodingers_cat" &&
      !target.catAlignment
    ){
      const converted = convertSchrodingersCat(
        target,
        "village",
        "Vigilante",
        shooter.name,
        privateResults
      )

      if(converted){
        state.vigilanteOutcomeToShow = null
        state.vigilantePublicReveal = null
        return
      }
    }

    const targetTeam = getPlayerTeam(target)
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

    if(targetDies){
      killPlayer(
        target.name,
        `${target.name} was slashed by the Vigilante.`,
        privateResults,
        { warnPrivately: true }
      )

      // Jester special win from Vigilante
      if(target.role === "jester" && state.jesterWinIfVigilanteKilled){
        const executionerWinner = state.executionerWinIfVigilanteKillsTarget
          ? getExecutionerWinnerForTarget(target.name)
          : null

        if(executionerWinner){
          addLogEntry(`${target.name} won as the Jester.`)
          addLogEntry(`${executionerWinner.name} won as the Executioner because the Vigilante killed their target, ${target.name}.`)
          addLogEntry(`TWISTED JUSTICE: ${target.name} won as the Jester, and ${executionerWinner.name} won as the Executioner after the Vigilante killed the target.`)

          renderTwistedJusticeWin(target.name, executionerWinner.name)
          instantNightWin = true
          return
        }

        addLogEntry(`${target.name} won as the Jester.`)

        renderSimpleWinScreen(
          "win-jester",
          "role-jester",
          "JESTER WINS",
          [`${target.name} was killed by the Vigilante and wins as the Jester!`]
        )

        instantNightWin = true
        return
      }

      // Executioner special win from Vigilante
      if(state.executionerWinIfVigilanteKillsTarget){
        const executionerWinner = getExecutionerWinnerForTarget(target.name)

        if(executionerWinner){
          addLogEntry(`${executionerWinner.name} won as the Executioner because the Vigilante killed ${target.name}.`)

          renderSimpleWinScreen(
            "win-executioner",
            "role-executioner",
            "EXECUTIONER WINS",
            [`${executionerWinner.name} succeeded because the Vigilante killed their target, ${target.name}.`]
          )

          instantNightWin = true
          return
        }
      }

      convertExecutionerAfterTargetDeath(target.name, privateResults)
    }

    if(vigilanteDies && shooter.alive){
      killPlayer(
        shooter.name,
        `${shooter.name} died after attacking the wrong person.`,
        privateResults
      )
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

  // Resolve mafia kill after vigilante
  const killTarget = resolveMafiaKillTarget(kills)
  const holyShieldStoppedMafia = !!(holyShieldActive && killTarget)
  const saveSucceeded = !!(!holyShieldStoppedMafia && killTarget && protectedTargets.includes(killTarget))

  if(holyShieldStoppedMafia){
    addLogEntry(`Holy Spirit blocked the Mafia's attack on ${killTarget}.`)
    state.priestBlockedAttacks.push("Mafia")
    state.priestPublicShield = true

    let mafiaKillerName = null

    if(state.mafiaKillMethod === "leader"){
      const leader = getPlayerByName(state.currentMafiaLeader)
      if(leader && leader.alive){
        mafiaKillerName = state.currentMafiaLeader
      }
    }else{
      const aliveKills = kills.filter(k => isPlayerAlive(k.actor))
      if(aliveKills.length){
        const killAction = aliveKills.find(k => k.target === killTarget) || aliveKills[0]
        mafiaKillerName = killAction.actor
      }
    }

    if(mafiaKillerName){
      privateResults.push({
        type: "mafia_kill_blocked_priest",
        playerName: mafiaKillerName,
        targetName: killTarget
      })
    }

    publicResults.push({
      type: "priest_shield",
      text: "A holy spirit shield protected the town last night."
    })

  }else if(killTarget && saveSucceeded){

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
      const leader = getPlayerByName(state.currentMafiaLeader)
      if(leader && leader.alive){
        mafiaKillerName = state.currentMafiaLeader
      }
    }else{
      const aliveKills = kills.filter(k => isPlayerAlive(k.actor))
      if(aliveKills.length){
        const killAction = aliveKills.find(k => k.target === killTarget) || aliveKills[0]
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

  }else if(killTarget){

    const victim = getPlayerByName(killTarget)

    let mafiaKillerName = null

    if(state.mafiaKillMethod === "leader"){
      const leader = getPlayerByName(state.currentMafiaLeader)
      if(leader && leader.alive){
        mafiaKillerName = state.currentMafiaLeader
      }
    }else{
      const aliveKills = kills.filter(k => isPlayerAlive(k.actor))
      if(aliveKills.length){
        const killAction = aliveKills.find(k => k.target === killTarget) || aliveKills[0]
        mafiaKillerName = killAction.actor
      }
    }

    if(
      victim &&
      victim.alive &&
      victim.role === "schrodingers_cat" &&
      !victim.catAlignment
    ){
      convertSchrodingersCat(
        victim,
        "mafia",
        "Mafia",
        mafiaKillerName,
        privateResults
      )
    }else{
      addLogEntry(`${killTarget} was killed during the night.`)

      if(victim && victim.alive){
        victim.alive = false

        if(!state.nightDeaths.includes(victim.name)){
          state.nightDeaths.push(victim.name)
        }

convertExecutionerAfterTargetDeath(victim.name, privateResults)

        let deathText = `${killTarget} was killed during the night.`

        if(shouldRevealOnNightDeath()){
          deathText += `<br>${revealedRoleText(victim)}`
        }

        publicResults.push({
          type: "death",
          text: deathText
        })

        addSpiritChoiceIfNeeded(victim.name, privateResults)
      }
    }

  }else{
    addLogEntry(`The night was quiet.`)

    publicResults.push({
      type: "peace",
      text: "The night was quiet."
    })
  }

  if(!publicResults.length){
    publicResults.push({
      type: "peace",
      text: "The night was quiet."
    })
  }
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

  if(holyShieldActive){
    document.body.classList.add("holy-night")
    priestShields.forEach(action => {
      privateResults.push({
        type: "priest_result",
        playerName: action.actor,
        blockedRoles: [...new Set(state.priestBlockedAttacks)]
      })
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
      if(v.blockedByHolySpirit){
        text = `The Vigilante tried to slash <strong>${v.target}</strong>, but a holy spirit shield protected the town.`
      }else{
        text = `The Vigilante tried to slash <strong>${v.target}</strong>, but the Doctor protected them.`
      }

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
    let label = "Night Event"

    if(r.type === "priest_shield"){
      cls = "night-result-priest"
      label = "Holy Protection"
    }
    if(r.type === "vigilante"){
      cls = "night-result-vigilante"
      label = "Vigilante"
    }
    if(r.type === "death"){
      cls = "night-result-death"
      label = "Death"
    }
    if(r.type === "save"){
      cls = "night-result-save"
      label = "Saved"
    }
    if(r.type === "peace"){
      cls = "night-result-peace"
      label = "Quiet Night"
    }
    if(r.type === "spirit_reveal"){
      cls = "night-result-spirit"
      label = "Spirit Reveal"
    }

    return `
      <div class="morning-result-card ${cls}">
        <div class="morning-result-kicker">${label}</div>
        <div class="morning-result-text">${r.text}</div>
      </div>
    `
  }).join("")

  render(`
    <div class="card morning-card">

      <div class="morning-hero">
        <div class="morning-kicker">Daybreak</div>
        <h2 class="morning-title">Morning</h2>
        <div class="morning-subtitle">
          The town wakes up to learn what happened during the night.
        </div>
      </div>

      <div class="morning-results-wrap">
        ${resultsHTML}
      </div>

      <div class="morning-status-wrap">
        ${renderPlayerStatus()}
      </div>

      <div class="morning-actions">
        <button class="morning-btn" onclick="window.startVoting()">Start Voting</button>
      </div>

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

  let alivePlayers = state.players.filter(p => p.alive)
  let currentVoter = alivePlayers[state.voteTurnIndex]

  let buttons = ""

  alivePlayers.forEach(p => {
    buttons += `
      <button class="vote-player-btn" onclick="window.castVote('${p.name}')">
        <span class="vote-player-name">${p.name}</span>
        <span class="vote-player-label">Vote</span>
      </button>
    `
  })

  buttons += `
    <button class="skip-btn vote-skip-btn" onclick="window.castVote('skip')">
      <span class="vote-player-name">Skip Vote</span>
      <span class="vote-player-label">No elimination</span>
    </button>
  `

  render(`

  <div class="card voting-card morning-vote-card">

    <div class="voting-hero">
      <div class="voting-kicker">Town Judgment</div>
      <h2 class="voting-title">Cast Your Vote</h2>
      <div class="voting-subtitle">
        Choose who should be eliminated before night falls.
      </div>

      ${
        currentVoter
          ? `
            <div class="current-voter-pill">
              <span class="current-voter-dot"></span>
              <strong>${currentVoter.name}</strong> is currently voting
            </div>
          `
          : ""
      }
    </div>

    <div class="voting-grid">
      ${buttons}
    </div>

    <div class="voting-status-wrap">
      ${renderPlayerStatus()}
    </div>

    ${renderHostControls()}

  </div>

  `)
}

function renderStandardVoteResult(resultsHTML, eliminated, player, includeSpiritReveal = false){
  render(`
    <div class="card morning-card voting-results-card">

      <div class="morning-header voting-results-header">
        <div class="morning-kicker">Day Resolution</div>
        <h2 class="morning-title">Voting Results</h2>
        <p class="morning-subtitle">
          The town has chosen who to cast out.
        </p>
      </div>

      <div class="vote-results-panel">
        ${resultsHTML}
      </div>

      <div class="vote-outcome-banner vote-outcome-elimination">
        <div class="vote-outcome-kicker">Eliminated</div>
        <div class="vote-outcome-title">${eliminated}</div>
        <div class="vote-outcome-subtitle">The town has voted them out.</div>
      </div>

      ${player && shouldRevealOnVoteDeath() ? `
        <div class="vote-reveal-wrap">
          ${revealedRoleText(player)}
        </div>
      ` : ""}

      ${includeSpiritReveal ? renderSpiritPublicReveal() : ""}

      ${renderPlayerStatus()}

      <button class="primary-btn" onclick="window.nextNight()">Next Night</button>

      ${renderHostControls()}
    </div>
  `)
}

function handleExecutionerAndJesterVoteWins(player, eliminated, mafiaAliveAfterVote){
  const executionerWinner = getExecutionerWinnerForTarget(eliminated)

  if(player.role === "jester" && executionerWinner){
    addLogEntry(`${player.name} won as the Jester.`)
    addLogEntry(`${executionerWinner.name} won as the Executioner by getting ${eliminated} voted out.`)

    renderSimpleWinScreen(
      "win-jester-executioner",
      "role-jester",
      "JESTER & EXECUTIONER WIN",
      [
        `${player.name} was voted out and wins as the Jester.`,
        `${executionerWinner.name} also wins because ${player.name} was their target.`
      ]
    )
    return true
  }

  if(player.role === "jester"){
  if(player.wasExecutioner && player.executionerConvertedTo === "jester"){
    addLogEntry(`${player.name} won as the Jester after turning from the Executioner.`)

    renderVengefulLunaticWin(player.name)
    return true
  }

  addLogEntry(`${player.name} won as the Jester.`)

  renderSimpleWinScreen(
    "win-jester",
    "role-jester",
    "JESTER WINS",
    [`${player.name} tricked the town into voting them out!`]
  )
  return true
}

  if(executionerWinner && player.role === "mafia" && mafiaAliveAfterVote === 0){
    addLogEntry(`${executionerWinner.name} won as the Executioner by getting ${eliminated} voted out.`)
    addLogEntry(`The village also won because ${eliminated} was the last mafia.`)

    renderSimpleWinScreen(
      "win-village-executioner",
      "role-executioner",
      "VILLAGE & EXECUTIONER WIN",
      [
        `${executionerWinner.name} succeeded in getting ${eliminated} voted out!`,
        `The village also wins because ${eliminated} was a part of the mafia.`
      ]
    )
    return true
  }

  if(executionerWinner){
    addLogEntry(`${executionerWinner.name} won as the Executioner by getting ${eliminated} voted out.`)

    renderSimpleWinScreen(
      "win-executioner",
      "role-executioner",
      "EXECUTIONER WINS",
      [`${executionerWinner.name} succeeded in getting ${eliminated} voted out!`]
    )
    return true
  }

  return false
}

export function castVote(targetName){

let alivePlayers = state.players.filter(p=>p.alive)
let voter = alivePlayers[state.voteTurnIndex]

if(voter){
let voteText = voter.role === "mayor"
  ? `${voter.name} voted for ${targetName} with ${state.mayorVotePower} votes as Mayor.`
  : `${voter.name} voted for ${targetName}.`

addLogEntry(voteText)
}

state.gameStats.votesCast++

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

  let mafiaAliveAfterVote = state.players.filter(p => p.alive && p.role === "mafia").length

  if(handleExecutionerAndJesterVoteWins(player, eliminated, mafiaAliveAfterVote)) return
  if(checkWin()) return

  renderStandardVoteResult(resultsHTML, eliminated, player, true)
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

    const isSkip = name === "skip"

    resultsHTML += `
      <div class="vote-row ${isSkip ? "vote-row-skip" : ""}">
        <div class="vote-label-row">
          <div class="vote-label-main">${label}</div>
          <div class="vote-label-count">${count}</div>
        </div>

        <div class="vote-bar-bg">
          <div class="vote-bar-fill ${isSkip ? "vote-bar-fill-skip" : ""}" style="width:${percent}%"></div>
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
      <div class="card morning-card voting-results-card">

        <div class="morning-header voting-results-header">
          <div class="morning-kicker">Day Resolution</div>
          <h2 class="morning-title">Voting Results</h2>
          <p class="morning-subtitle">
            The town could not agree on a single target.
          </p>
        </div>

        <div class="vote-results-panel">
          ${resultsHTML}
        </div>

        <div class="vote-outcome-banner vote-outcome-tie">
          <div class="vote-outcome-kicker">Outcome</div>
          <div class="vote-outcome-title">It's a tie</div>
          <div class="vote-outcome-subtitle">Nobody was eliminated.</div>
        </div>

        ${renderPlayerStatus()}

        <button class="primary-btn" onclick="window.nextNight()">Next Night</button>

        ${renderHostControls()}
      </div>
    `)
    return
  }

  if(eliminated === "skip"){
    addLogEntry(`The town skipped the vote.`)

    render(`
      <div class="card morning-card voting-results-card">

        <div class="morning-header voting-results-header">
          <div class="morning-kicker">Day Resolution</div>
          <h2 class="morning-title">Voting Results</h2>
          <p class="morning-subtitle">
            The town chose caution over elimination.
          </p>
        </div>

        <div class="vote-results-panel">
          ${resultsHTML}
        </div>

        <div class="vote-outcome-banner vote-outcome-skip">
          <div class="vote-outcome-kicker">Outcome</div>
          <div class="vote-outcome-title">Vote Skipped</div>
          <div class="vote-outcome-subtitle">No one was eliminated today.</div>
        </div>

        ${renderPlayerStatus()}

        <button class="primary-btn" onclick="window.nextNight()">Next Night</button>

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

      let mafiaAliveAfterVote = state.players.filter(p => p.alive && p.role === "mafia").length

      if(handleExecutionerAndJesterVoteWins(player, eliminated, mafiaAliveAfterVote)) return
      if(checkWin()) return

      render(`
        <div class="card morning-card voting-results-card">

          <div class="morning-header voting-results-header">
            <div class="morning-kicker">Day Resolution</div>
            <h2 class="morning-title">Voting Results</h2>
            <p class="morning-subtitle">
              The town has chosen who to cast out.
            </p>
          </div>

          <div class="vote-results-panel">
            ${resultsHTML}
          </div>

          <div class="vote-outcome-banner vote-outcome-elimination">
            <div class="vote-outcome-kicker">Eliminated</div>
            <div class="vote-outcome-title">${eliminated}</div>
            <div class="vote-outcome-subtitle">The town has voted them out.</div>
          </div>

          ${player && shouldRevealOnVoteDeath() ? `
            <div class="vote-reveal-wrap">
              ${revealedRoleText(player)}
            </div>
          ` : ""}

          ${renderPlayerStatus()}

          <button class="primary-btn" onclick="window.nextNight()">Next Night</button>

          ${renderHostControls()}
        </div>
      `)
      return
    }
  }

  render(`
    <div class="card morning-card voting-results-card">

      <div class="morning-header voting-results-header">
        <div class="morning-kicker">Day Resolution</div>
        <h2 class="morning-title">Voting Results</h2>
      </div>

      <div class="vote-results-panel">
        ${resultsHTML}
      </div>

      <div class="vote-outcome-banner vote-outcome-neutral">
        <div class="vote-outcome-kicker">Outcome</div>
        <div class="vote-outcome-title">No Elimination</div>
      </div>

      <button class="primary-btn" onclick="window.nextNight()">Next Night</button>
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
    revealLabel = roleDisplayName(revealedPlayer.role).toUpperCase()
    revealColor = roleColors[revealedPlayer.role] || "white"
  }

  return `
    <div class="night-result night-result-spirit spirit-public-reveal">
      <div class="spirit-public-kicker">Spirit Revelation</div>

      <div class="spirit-public-text">
        The Spirit reveals that <strong>${revealedPlayer.name}</strong> is
      </div>

      <div class="spirit-public-role"
        style="
          color:${revealColor};
          text-shadow:0 0 10px ${revealColor}, 0 0 20px ${revealColor};
          border-color:${revealColor}33;
          background:${revealColor}12;
        ">
        ${revealLabel}
      </div>
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

function getFinalWinnerBanner(){
  const bodyClass = document.body.className || ""

  if(bodyClass.includes("win-jester-executioner-vigilante")){
    return {
      label: "Special Ending",
      title: "Twisted Justice",
      subtitle: "The Vigilante’s mistake gave victory to both the Jester and the Executioner.",
      className: "final-banner-chaos"
    }
  }

  if(bodyClass.includes("win-jester-executioner")){
    return {
      label: "Dual Victory",
      title: "Jester & Executioner Win",
      subtitle: "The town’s vote fulfilled two win conditions at once.",
      className: "final-banner-jester-executioner"
    }
  }

  if(bodyClass.includes("win-village-executioner")){
    return {
      label: "Split Victory",
      title: "Village & Executioner Win",
      subtitle: "The town eliminated the final mafia, while the Executioner also succeeded.",
      className: "final-banner-village-executioner"
    }
  }

  if(bodyClass.includes("win-mafia")){
    return {
      label: "Winning Team",
      title: "Mafia Victory",
      subtitle: "The mafia took control of the town.",
      className: "final-banner-mafia"
    }
  }

  if(bodyClass.includes("win-village")){
    return {
      label: "Winning Team",
      title: "Village Victory",
      subtitle: "The town eliminated every mafia member.",
      className: "final-banner-village"
    }
  }

  if(bodyClass.includes("win-executioner-to-jester")){
  return {
    label: "Special Ending",
    title: "Vengeful Lunatic",
    subtitle: "A fallen Executioner became the Jester — and still fooled the town.",
    className: "final-banner-jester-executioner"
    }
  }

  if(bodyClass.includes("win-jester")){
    return {
      label: "Winning Role",
      title: "Jester Victory",
      subtitle: "The town was manipulated into voting out the Jester.",
      className: "final-banner-jester"
    }
  }

  if(bodyClass.includes("win-executioner")){
    return {
      label: "Winning Role",
      title: "Executioner Victory",
      subtitle: "The Executioner succeeded in getting their target eliminated.",
      className: "final-banner-executioner"
    }
  }

  return {
    label: "Game Complete",
    title: "Final Roles",
    subtitle: "Review every team, special role, and the full game log.",
    className: "final-banner-default"
  }
}

function showRoleRevealEnd(){

  let logHTML = state.gameLog.length
    ? state.gameLog.map(entry => {
        let isHeader = entry.startsWith("Night ") || entry.startsWith("Day ")
        return `<p class="log-entry ${isHeader ? "log-header" : ""}">${entry}</p>`
      }).join("")
    : `<p style="opacity:0.7;">No log entries recorded.</p>`

  let mafia = state.players.filter(p => getEffectiveTeam(p) === "mafia")
  let town = state.players.filter(p => getEffectiveTeam(p) === "village")
  let neutral = state.players.filter(p => getEffectiveTeam(p) === "neutral")
const winnerBanner = getFinalWinnerBanner()
  function renderRoleList(list){
    if(!list.length){
      return `<div class="final-empty-state">None</div>`
    }

    return list.map(p => {
      let color = roleColors[p.role] || "white"
      let target = state.executionerTargets?.[p.name]

      if(p.role === "executioner" || p.wasExecutioner){
  const color = roleColors.executioner
  const target = state.executionerTargets?.[p.name]
  const turnedInto = p.wasExecutioner && p.executionerConvertedTo
    ? roleDisplayName(p.executionerConvertedTo)
    : null

  return `
    <div class="final-player-card executioner-row"
         style="--final-role-color:${color};"
         onclick="window.toggleExecutionerReveal('${p.name}')">

      <div class="final-player-main">
        <div class="final-player-name">${p.name}</div>
        <div class="final-player-role" style="color:${color}">
          <span class="executioner-arrow" id="executioner-arrow-${p.name}">▸</span>
          Executioner
          ${
            turnedInto
              ? `<span class="final-role-tag"
                   style="
                     color:${roleColors[p.executionerConvertedTo] || "white"};
                     border-color:${(roleColors[p.executionerConvertedTo] || "white")}33;
                     background:${(roleColors[p.executionerConvertedTo] || "white")}14;
                   ">
                   turned ${turnedInto}
                 </span>`
              : ""
          }
        </div>
      </div>

    </div>

    ${target ? `
      <div class="executioner-target-reveal final-target-reveal" id="executioner-target-${p.name}">
        <span class="executioner-target-reveal-label">Target:</span>
        <span class="executioner-target-reveal-name">${target}</span>
      </div>
    ` : ""}
  `
}

      if(p.role === "schrodingers_cat" && p.catAlignment){
        const alignColor = p.catAlignment === "mafia" ? roleColors.mafia : roleColors.villager
        const alignLabel = p.catAlignment === "mafia" ? "Joined Mafia" : "Joined Town"

        return `
          <div class="final-player-card" style="--final-role-color:${roleColors.schrodingers_cat};">
            <div class="final-player-main">
              <div class="final-player-name">${p.name}</div>
              <div class="final-player-role" style="color:${roleColors.schrodingers_cat}">
                Schrödinger's Cat
                <span class="final-role-tag" style="color:${alignColor}; border-color:${alignColor}33; background:${alignColor}14;">
                  ${alignLabel}
                </span>
              </div>
            </div>
          </div>
        `
      }

      return `
        <div class="final-player-card" style="--final-role-color:${color};">
          <div class="final-player-main">
            <div class="final-player-name">${p.name}</div>
            <div class="final-player-role" style="color:${color}">
              ${roleDisplayName(p.role)}
            </div>
          </div>
        </div>
      `
    }).join("")
  }

  render(`
<div class="final-results-centered">
  <div class="card final-results-card final-results-shell">

    <div class="final-results-hero ${winnerBanner.className}">
    <div class="final-results-kicker">${winnerBanner.label}</div>
    <h2 class="final-results-title">${winnerBanner.title}</h2>
    <div class="final-results-subtitle">
      ${winnerBanner.subtitle}
    </div>
  </div>

  <div class="final-summary-grid">
    <div class="final-summary-stat">
      <div class="final-summary-value">${state.gameStats.nights}</div>
      <div class="final-summary-label">Nights</div>
    </div>

    <div class="final-summary-stat">
      <div class="final-summary-value">${state.gameStats.votesCast}</div>
      <div class="final-summary-label">Votes Cast</div>
    </div>

    <div class="final-summary-stat">
      <div class="final-summary-value">${state.gameStats.eliminations}</div>
      <div class="final-summary-label">Deaths</div>
    </div>

    <div class="final-summary-stat">
      <div class="final-summary-value">${state.players.length}</div>
      <div class="final-summary-label">Players</div>
    </div>
  </div>

  <div class="final-team-sections">

    <div class="final-team-card final-team-mafia">
      <div class="final-team-header">
        <div>
          <div class="final-team-kicker">Team</div>
          <h3 class="final-team-title mafia-win">Mafia</h3>
        </div>
        <div class="final-team-count">${mafia.length}</div>
      </div>

      <div class="final-team-list">
        ${renderRoleList(mafia)}
      </div>
    </div>

    <div class="final-team-card final-team-town">
      <div class="final-team-header">
        <div>
          <div class="final-team-kicker">Team</div>
          <h3 class="final-team-title village-win">Town</h3>
        </div>
        <div class="final-team-count">${town.length}</div>
      </div>

      <div class="final-team-list">
        ${renderRoleList(town)}
      </div>
    </div>

    <div class="final-team-card final-team-neutral">
      <div class="final-team-header">
        <div>
          <div class="final-team-kicker">Team</div>
          <h3 class="final-team-title neutral-team">Neutral</h3>
        </div>
        <div class="final-team-count">${neutral.length}</div>
      </div>

      <div class="final-team-list">
        ${renderRoleList(neutral)}
      </div>
    </div>

  </div>

  <div class="final-log-card">
    <div class="final-log-header">
      <div>
        <div class="final-team-kicker">Timeline</div>
        <h3 class="final-log-title">Game Log</h3>
      </div>
    </div>

    <div class="game-log-box final-log-box">
      ${logHTML}
    </div>
  </div>

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