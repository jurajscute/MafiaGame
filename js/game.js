import {state, addLogEntry, resetGameTracking} from "./state.js"
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
executioner: "#7a2f6f",
mayor: "#1d8161",
spirit: "#e6aafd",
framer: "#8b0000",
vigilante: "#3b48ff"
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

window.toggleHostMode = function(enabled){
  state.hostMode = enabled

  localStorage.setItem(
    "mafiaHostMode",
    JSON.stringify(enabled)
  )
}

window.resetSettings = function(){

state.rolesEnabled = {
doctor: false,
sheriff: false,
jester: false,
executioner: false,
mayor: false,
spirit: false,
framer: false,
vigilante: false
}

state.roleWeights = {
doctor: 100,
sheriff: 100,
jester: 100,
executioner: 100,
mayor: 100,
spirit: 100,
framer: 100,
vigilante: 100
}

state.roleCounts = {
doctor: 1,
sheriff: 1,
jester: 1,
executioner: 1,
mayor: 1,
spirit: 1,
framer: 1,
vigilante: 1
}

state.vigilanteOutcomeToShow = null
state.vigilantePublicReveal = null

state.executionerTargetRule = "neither"

state.mayorVotePower = 2

state.doctorRevealSave = false
state.sheriffExactReveal = false
state.mafiaCountOverride = 0

state.revealRolesOnElimination = "none"
state.executionerWinIfDead = false

state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true

state.spiritRevealType = "exact"
state.spiritActivation = "night_only"
state.spiritCanSkipReveal = true

state.sheriffJesterResult = "not_innocent"
state.sheriffExecutionerResult = "not_innocent"

state.mafiaKillMethod = "leader"
state.currentMafiaLeader = null
state.mafiaLeaderIndex = 0
state.mafiaKnowsFirstLeader = false

state.vigilanteCanKillNeutrals = true
state.vigilanteWrongKillOutcome = "both_die"

state.jesterWinIfVigilanteKilled = false
state.executionerWinIfVigilanteKillsTarget = false

localStorage.setItem("mafiaExecutionerVigilanteWin",JSON.stringify(state.executionerWinIfVigilanteKillsTarget))
localStorage.setItem("mafiaJesterVigilanteWin",JSON.stringify(state.jesterWinIfVigilanteKilled))
localStorage.setItem("mafiaVigilanteCanKillNeutrals", JSON.stringify(state.vigilanteCanKillNeutrals))
localStorage.setItem("mafiaVigilanteWrongKillOutcome", JSON.stringify(state.vigilanteWrongKillOutcome))
localStorage.setItem("mafiaKnowsFirstLeader", JSON.stringify(state.mafiaKnowsFirstLeader))
localStorage.setItem("mafiaSpiritRevealType", JSON.stringify(state.spiritRevealType))
localStorage.setItem("mafiaSpiritActivation", JSON.stringify(state.spiritActivation))
localStorage.setItem("mafiaSpiritCanSkipReveal", JSON.stringify(state.spiritCanSkipReveal))
localStorage.setItem("mafiaFramerKnowsSuccess", JSON.stringify(state.framerKnowsSuccess))
localStorage.setItem("mafiaFramerKnowsMafia", JSON.stringify(state.framerKnowsMafia))
localStorage.setItem("mafiaMafiaKnowsFramer", JSON.stringify(state.mafiaKnowsFramer))
localStorage.setItem("mafiaRoles", JSON.stringify(state.rolesEnabled))
localStorage.setItem("mafiaRoleWeights", JSON.stringify(state.roleWeights))
localStorage.setItem("mafiaRoleCounts", JSON.stringify(state.roleCounts))
localStorage.setItem("mafiaDoctorReveal", JSON.stringify(state.doctorRevealSave))
localStorage.setItem("mafiaSheriffExactReveal", JSON.stringify(state.sheriffExactReveal))
localStorage.setItem("mafiaCountOverride", JSON.stringify(state.mafiaCountOverride))
localStorage.setItem("mafiaExecutionerTargetRule", JSON.stringify(state.executionerTargetRule))
localStorage.setItem("mafiaRevealRolesOnElimination", JSON.stringify(state.revealRolesOnElimination))
localStorage.setItem("mafiaExecutionerWinIfDead", JSON.stringify(state.executionerWinIfDead))
localStorage.setItem("mafiaSheriffJesterResult", JSON.stringify(state.sheriffJesterResult))
localStorage.setItem("mafiaSheriffExecutionerResult", JSON.stringify(state.sheriffExecutionerResult))
localStorage.setItem("mafiaMayorVotePower", JSON.stringify(state.mayorVotePower))

showSettings()

}

window.setSpiritRevealType = function(value){

state.spiritRevealType = value

localStorage.setItem(
"mafiaSpiritRevealType",
JSON.stringify(value)
)

}

window.setSpiritActivation = function(value){

state.spiritActivation = value

localStorage.setItem(
"mafiaSpiritActivation",
JSON.stringify(value)
)

}

window.toggleSpiritCanSkipReveal = function(enabled){

state.spiritCanSkipReveal = enabled

localStorage.setItem(
"mafiaSpiritCanSkipReveal",
JSON.stringify(enabled)
)

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

  modal.querySelectorAll('input[type="range"]').forEach(slider => {
    let role = slider.id.replace("Slider", "")
    updateSlider(slider, role)
  })
}

window.forceRevealRoles = function(){
addLogEntry("Host revealed final roles early.")
showRoleRevealEnd()
}

window.confirmStartGame = function(){
  state.openExecutionerReveal = null
  state.gameStarted = true
  resetGameTracking()
  assignRoles()
  revealIndex = 0
  showRoleReveal()
}

function showSettings() {
  const modal = document.getElementById("infoModal")

  const playerCount = state.players.length
  const mafiaMax = maxAllowedMafia(playerCount)
  const autoMafia = playerCount > 0 ? mafiaCount(playerCount) : 1

  const mafiaRoles = ["framer"]
  const townRoles = ["doctor", "sheriff", "mayor", "spirit", "vigilante"]
  const neutralRoles = ["jester", "executioner"]

  let mafiaOptions = `<option value="0" ${state.mafiaCountOverride === 0 ? "selected" : ""}>Auto (${autoMafia})</option>`
  for(let i = 1; i <= mafiaMax; i++){
    let label = i === 1 ? "1 Mafia Member" : `${i} Mafia`
    mafiaOptions += `<option value="${i}" ${state.mafiaCountOverride === i ? "selected" : ""}>${label}</option>`
  }

  function roleTeamText(role){
    if(mafiaRoles.includes(role)) return "Mafia role"
    if(neutralRoles.includes(role)) return "Neutral role"
    return "Town role"
  }

  function roleDisplayName(role){
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  function renderRoleCard(role){
    const enabled = state.rolesEnabled[role]
    const weight = state.roleWeights[role] || 0
    const count = state.roleCounts[role] || 1
    const color = roleColors[role] || "#fff"

    let advancedHTML = ""

    if(role === "doctor"){
      advancedHTML = `
        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Reveal saved player</span>
            <label class="switch">
              <input type="checkbox"
                ${state.doctorRevealSave ? "checked" : ""}
                onchange="toggleDoctorReveal(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
    }

    if(role === "sheriff"){
      advancedHTML = `
        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Reveal exact role</span>
            <label class="switch">
              <input type="checkbox"
                ${state.sheriffExactReveal ? "checked" : ""}
                onchange="toggleSheriffExactReveal(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
    }

    if(role === "mayor"){
      advancedHTML = `
        <div class="settings-field">
          <label class="settings-field-label">Vote power</label>
          <select class="settings-modern-select" onchange="setMayorVotePower(this.value)">
            <option value="1.5" ${state.mayorVotePower == 1.5 ? "selected" : ""}>1.5 votes</option>
            <option value="2" ${state.mayorVotePower == 2 ? "selected" : ""}>2 votes</option>
            <option value="2.5" ${state.mayorVotePower == 2.5 ? "selected" : ""}>2.5 votes</option>
            <option value="3" ${state.mayorVotePower == 3 ? "selected" : ""}>3 votes</option>
          </select>
        </div>
      `
    }

    if(role === "spirit"){
      advancedHTML = `
        <div class="settings-field">
          <label class="settings-field-label">Reveal type</label>
          <select class="settings-modern-select" onchange="setSpiritRevealType(this.value)">
            <option value="exact" ${state.spiritRevealType === "exact" ? "selected" : ""}>Exact Role</option>
            <option value="team" ${state.spiritRevealType === "team" ? "selected" : ""}>Team Only</option>
          </select>
        </div>

        <div class="settings-field">
          <label class="settings-field-label">Activates on</label>
          <select class="settings-modern-select" onchange="setSpiritActivation(this.value)">
            <option value="night_only" ${state.spiritActivation === "night_only" ? "selected" : ""}>Night Death Only</option>
            <option value="any_death" ${state.spiritActivation === "any_death" ? "selected" : ""}>Any Death</option>
          </select>
        </div>

        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Can skip reveal</span>
            <label class="switch">
              <input type="checkbox"
                ${state.spiritCanSkipReveal ? "checked" : ""}
                onchange="toggleSpiritCanSkipReveal(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
    }

    if(role === "framer"){
      advancedHTML = `
        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Knows if frame was successful</span>
            <label class="switch">
              <input type="checkbox"
                ${state.framerKnowsSuccess ? "checked" : ""}
                onchange="toggleFramerKnowsSuccess(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Knows who the mafia are</span>
            <label class="switch">
              <input type="checkbox"
                ${state.framerKnowsMafia ? "checked" : ""}
                onchange="toggleFramerKnowsMafia(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
    }

    if(role === "jester"){
      advancedHTML = `
        <div class="settings-field">
          <label class="settings-field-label">Sheriff sees Jester as...</label>
          <select class="settings-modern-select" onchange="setSheriffJesterResult(this.value)">
            <option value="innocent" ${state.sheriffJesterResult === "innocent" ? "selected" : ""}>Innocent</option>
            <option value="not_innocent" ${state.sheriffJesterResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
            <option value="exact" ${state.sheriffJesterResult === "exact" ? "selected" : ""}>Exact Role</option>
          </select>
        </div>

        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Win if killed by Vigilante</span>
            <label class="switch">
              <input type="checkbox"
                ${state.jesterWinIfVigilanteKilled ? "checked" : ""}
                onchange="toggleJesterVigilanteWin(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
    }

    if(role === "executioner"){
      advancedHTML = `
        <div class="settings-field">
          <label class="settings-field-label">Can target Jester or Mafia?</label>
          <select class="settings-modern-select" onchange="setExecutionerTargetRule(this.value)">
            <option value="neither" ${state.executionerTargetRule === "neither" ? "selected" : ""}>Neither</option>
            <option value="mafia" ${state.executionerTargetRule === "mafia" ? "selected" : ""}>Mafia</option>
            <option value="jester" ${state.executionerTargetRule === "jester" ? "selected" : ""}>Jester</option>
            <option value="both" ${state.executionerTargetRule === "both" ? "selected" : ""}>Both</option>
          </select>
        </div>

        <div class="settings-field">
          <label class="settings-field-label">Sheriff sees Executioner as</label>
          <select class="settings-modern-select" onchange="setSheriffExecutionerResult(this.value)">
            <option value="innocent" ${state.sheriffExecutionerResult === "innocent" ? "selected" : ""}>Innocent</option>
            <option value="not_innocent" ${state.sheriffExecutionerResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
            <option value="exact" ${state.sheriffExecutionerResult === "exact" ? "selected" : ""}>Exact Role</option>
          </select>
        </div>

        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Can win while dead</span>
            <label class="switch">
              <input type="checkbox"
                ${state.executionerWinIfDead ? "checked" : ""}
                onchange="toggleExecutionerWinIfDead(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Wins if Vigilante kills target</span>
            <label class="switch">
              <input type="checkbox"
                ${state.executionerWinIfVigilanteKillsTarget ? "checked" : ""}
                onchange="toggleExecutionerVigilanteWin(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `
    }

    if(role === "vigilante"){
      advancedHTML = `
        <div class="settings-field">
          <div class="settings-field-inline">
            <span class="settings-field-label-inline">Can kill neutrals</span>
            <label class="switch">
              <input type="checkbox"
                ${state.vigilanteCanKillNeutrals ? "checked" : ""}
                onchange="toggleVigilanteCanKillNeutrals(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-field">
          <label class="settings-field-label">Wrong target result</label>
          <select class="settings-modern-select" onchange="setVigilanteWrongKillOutcome(this.value)">
            <option value="both_die" ${state.vigilanteWrongKillOutcome === "both_die" ? "selected" : ""}>Both die</option>
            <option value="only_vigilante_dies" ${state.vigilanteWrongKillOutcome === "only_vigilante_dies" ? "selected" : ""}>Only Vigilante dies</option>
            <option value="only_target_dies" ${state.vigilanteWrongKillOutcome === "only_target_dies" ? "selected" : ""}>Only target dies</option>
          </select>
        </div>
      `
    }

    return `
  <div class="settings-role-card ${enabled ? "role-enabled" : ""}" data-role="${role}" style="--role-accent:${color}">
        <div class="settings-role-header">
          <div class="settings-role-meta">
            <div class="settings-role-name" style="color:${color}">${roleDisplayName(role)}</div>
            <div class="settings-role-subtitle">${roleTeamText(role)}</div>
          </div>

          <div class="settings-role-actions">
            <span class="settings-role-state">${enabled ? "ON" : "OFF"}</span>
            <label class="switch">
              <input type="checkbox" ${enabled ? "checked" : ""}
                onchange="toggleRole('${role}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        ${enabled ? `
          <div class="settings-role-panel show">
            <div class="settings-field">
              <label class="settings-field-label">Role chance</label>
              <div class="settings-slider-row">
                <input type="range"
                  id="${role}Slider"
                  min="0"
                  max="100"
                  value="${weight}"
                  oninput="updateSlider(this,'${role}'); setRoleWeight('${role}', this.value)">
                <span class="settings-slider-value">${weight}%</span>
              </div>
            </div>

            <div class="settings-field">
              <label class="settings-field-label">Maximum amount</label>
              <input class="settings-modern-number"
                type="number"
                min="1"
                max="10"
                value="${count}"
                onchange="window.updateRoleCount('${role}', this.value)">
            </div>

            ${advancedHTML ? `
              <div class="settings-advanced-label">Additional Settings</div>
              ${advancedHTML}
            ` : ""}
          </div>
        ` : ""}
      </div>
    `
  }

  const content = `
    <div class="modal-content settings-modal-shell">
      <div class="settings-header">
        <div class="settings-header-main">
          <div>
            <h2 class="settings-title-modern">Game Settings</h2>
            <div class="settings-subtitle-modern">
              ${state.gameStarted ? "Settings are locked during the game" : "Configure roles, rules, and special conditions"}
            </div>
          </div>

          ${state.gameStarted ? `
            <div class="settings-lock-badge">🔒 Locked</div>
          ` : ""}
        </div>
      </div>

      <div class="settings-scroll">

        <div class="settings-section-modern">
          <div class="settings-section-title-modern">Quick Setup</div>

          <div class="settings-grid-two">
            <div class="settings-quick-card">
              <label class="settings-field-label">Host Mode</label>
              <div class="settings-field-inline">
                <span class="settings-field-label-inline">Enable host controls</span>
                <label class="switch">
                  <input type="checkbox"
                    ${state.hostMode ? "checked" : ""}
                    onchange="toggleHostMode(this.checked)">
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-quick-card">
              <label class="settings-field-label">Reveal roles on elimination</label>
              <select class="settings-modern-select" onchange="setRevealRolesOnElimination(this.value)">
                <option value="none" ${state.revealRolesOnElimination === "none" ? "selected" : ""}>Never</option>
                <option value="death" ${state.revealRolesOnElimination === "death" ? "selected" : ""}>Night kill only</option>
                <option value="vote_only" ${state.revealRolesOnElimination === "vote_only" ? "selected" : ""}>Vote only</option>
                <option value="death_and_vote" ${state.revealRolesOnElimination === "death_and_vote" ? "selected" : ""}>Night kill and vote</option>
              </select>
            </div>

            <div class="settings-quick-card">
              <label class="settings-field-label">How many mafia?</label>
              <select class="settings-modern-select" onchange="window.updateMafiaCountOverride(this.value)">
                ${mafiaOptions}
              </select>
              <div class="settings-help-text">
                Auto recommends <strong>${autoMafia}</strong>. Max with ${playerCount} player${playerCount === 1 ? "" : "s"}: <strong>${mafiaMax}</strong>
              </div>
            </div>

            <div class="settings-quick-card">
              <label class="settings-field-label">Mafia kill method</label>
              <select class="settings-modern-select" onchange="setMafiaKillMethod(this.value)">
                <option value="leader" ${state.mafiaKillMethod === "leader" ? "selected" : ""}>Leader chooses</option>
                <option value="vote" ${state.mafiaKillMethod === "vote" ? "selected" : ""}>Mafia vote</option>
              </select>
              <div class="settings-help-text">
                Leader rotates nightly. Vote breaks ties randomly.
              </div>
            </div>
          </div>

          <div class="settings-quick-card settings-full-width-card">
            <label class="settings-field-label">Presets</label>
            <div class="settings-preset-row">
              <button type="button" onclick="applyPreset('classic')">Classic</button>
              <button type="button" onclick="applyPreset('beginner')">Beginner</button>
              <button type="button" onclick="applyPreset('chaotic')">Chaotic</button>
            </div>
          </div>
        </div>

        <div class="settings-section-modern">
          <div class="settings-section-title-modern">Global Mafia Settings</div>

          <div class="settings-grid-two">
            <div class="settings-quick-card">
              <div class="settings-field-inline">
                <span class="settings-field-label-inline">Mafia know who the Framer is</span>
                <label class="switch">
                  <input type="checkbox"
                    ${state.mafiaKnowsFramer ? "checked" : ""}
                    onchange="toggleMafiaKnowsFramer(this.checked)">
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-quick-card">
              <div class="settings-field-inline">
                <span class="settings-field-label-inline">Mafia know the first leader</span>
                <label class="switch">
                  <input type="checkbox"
                    ${state.mafiaKnowsFirstLeader ? "checked" : ""}
                    onchange="toggleMafiaKnowsFirstLeader(this.checked)">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section-modern">
          <div class="settings-section-title-modern">Roles</div>

          <div class="settings-role-group-title">Town</div>
          ${townRoles.map(renderRoleCard).join("")}

          <div class="settings-role-group-title">Neutral</div>
          ${neutralRoles.map(renderRoleCard).join("")}

          <div class="settings-role-group-title">Mafia</div>
          ${mafiaRoles.map(renderRoleCard).join("")}
        </div>
      </div>

      <div class="settings-footer">
        <button type="button" class="reset-settings-btn" onclick="confirmResetSettings()">Reset Settings</button>
        <button class="close-settings-btn" onclick="closeInfo()">Close</button>
      </div>
    </div>
  `

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

window.toggleJesterVigilanteWin = function(enabled){

state.jesterWinIfVigilanteKilled = enabled

localStorage.setItem(
"mafiaJesterVigilanteWin",
JSON.stringify(enabled)
)

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

window.toggleRole = function(role, enabled){
  state.rolesEnabled[role] = enabled

  localStorage.setItem(
    "mafiaRoles",
    JSON.stringify(state.rolesEnabled)
  )

  const checkbox = document.querySelector(
    `.settings-role-card[data-role="${role}"] .settings-role-actions input[type="checkbox"]`
  )

  const card = document.querySelector(`.settings-role-card[data-role="${role}"]`)
  if(!card) return

if(enabled){
  card.classList.add("role-enabled")
}else{
  card.classList.remove("role-enabled")
}

  const stateLabel = card.querySelector(".settings-role-state")
  let panel = card.querySelector(".settings-role-panel")

  if(stateLabel){
    stateLabel.textContent = enabled ? "ON" : "OFF"
  }

  if(enabled){
    card.classList.add("role-enabled")

    if(!panel){
      panel = document.createElement("div")
      panel.className = "settings-role-panel"
      panel.innerHTML = buildRolePanelHTML(role)
      card.insertAdjacentElement("beforeend", panel)

      requestAnimationFrame(() => {
        panel.classList.add("show")
        initRolePanel(card, role)
      })
    }else{
      panel.classList.add("show")
      initRolePanel(card, role)
    }
  }else{
    card.classList.remove("role-enabled")

    if(panel){
      panel.classList.remove("show")

      setTimeout(() => {
        if(panel && !panel.classList.contains("show")){
          panel.remove()
        }
      }, 280)
    }
  }

  if(checkbox){
    checkbox.checked = enabled
  }
}

function buildRolePanelHTML(role){
  const weight = state.roleWeights[role] || 0
  const count = state.roleCounts[role] || 1

  let advancedHTML = ""

  if(role === "doctor"){
    advancedHTML = `
      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Reveal saved player</span>
          <label class="switch">
            <input type="checkbox"
              ${state.doctorRevealSave ? "checked" : ""}
              onchange="toggleDoctorReveal(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if(role === "sheriff"){
    advancedHTML = `
      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Reveal exact role</span>
          <label class="switch">
            <input type="checkbox"
              ${state.sheriffExactReveal ? "checked" : ""}
              onchange="toggleSheriffExactReveal(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if(role === "mayor"){
    advancedHTML = `
      <div class="settings-field">
        <label class="settings-field-label">Vote power</label>
        <select class="settings-modern-select" onchange="setMayorVotePower(this.value)">
          <option value="1.5" ${state.mayorVotePower == 1.5 ? "selected" : ""}>1.5 votes</option>
          <option value="2" ${state.mayorVotePower == 2 ? "selected" : ""}>2 votes</option>
          <option value="2.5" ${state.mayorVotePower == 2.5 ? "selected" : ""}>2.5 votes</option>
          <option value="3" ${state.mayorVotePower == 3 ? "selected" : ""}>3 votes</option>
        </select>
      </div>
    `
  }

  if(role === "spirit"){
    advancedHTML = `
      <div class="settings-field">
        <label class="settings-field-label">Reveal type</label>
        <select class="settings-modern-select" onchange="setSpiritRevealType(this.value)">
          <option value="exact" ${state.spiritRevealType === "exact" ? "selected" : ""}>Exact Role</option>
          <option value="team" ${state.spiritRevealType === "team" ? "selected" : ""}>Team Only</option>
        </select>
      </div>

      <div class="settings-field">
        <label class="settings-field-label">Activates on</label>
        <select class="settings-modern-select" onchange="setSpiritActivation(this.value)">
          <option value="night_only" ${state.spiritActivation === "night_only" ? "selected" : ""}>Night Death Only</option>
          <option value="any_death" ${state.spiritActivation === "any_death" ? "selected" : ""}>Any Death</option>
        </select>
      </div>

      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Can skip reveal</span>
          <label class="switch">
            <input type="checkbox"
              ${state.spiritCanSkipReveal ? "checked" : ""}
              onchange="toggleSpiritCanSkipReveal(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if(role === "framer"){
    advancedHTML = `
      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Knows if frame was successful</span>
          <label class="switch">
            <input type="checkbox"
              ${state.framerKnowsSuccess ? "checked" : ""}
              onchange="toggleFramerKnowsSuccess(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Knows who the mafia are</span>
          <label class="switch">
            <input type="checkbox"
              ${state.framerKnowsMafia ? "checked" : ""}
              onchange="toggleFramerKnowsMafia(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if(role === "jester"){
    advancedHTML = `
      <div class="settings-field">
        <label class="settings-field-label">Sheriff sees Jester as...</label>
        <select class="settings-modern-select" onchange="setSheriffJesterResult(this.value)">
          <option value="innocent" ${state.sheriffJesterResult === "innocent" ? "selected" : ""}>Innocent</option>
          <option value="not_innocent" ${state.sheriffJesterResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
          <option value="exact" ${state.sheriffJesterResult === "exact" ? "selected" : ""}>Exact Role</option>
        </select>
      </div>

      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Win if killed by Vigilante</span>
          <label class="switch">
            <input type="checkbox"
              ${state.jesterWinIfVigilanteKilled ? "checked" : ""}
              onchange="toggleJesterVigilanteWin(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if(role === "executioner"){
    advancedHTML = `
      <div class="settings-field">
        <label class="settings-field-label">Can target Jester or Mafia?</label>
        <select class="settings-modern-select" onchange="setExecutionerTargetRule(this.value)">
          <option value="neither" ${state.executionerTargetRule === "neither" ? "selected" : ""}>Neither</option>
          <option value="mafia" ${state.executionerTargetRule === "mafia" ? "selected" : ""}>Mafia</option>
          <option value="jester" ${state.executionerTargetRule === "jester" ? "selected" : ""}>Jester</option>
          <option value="both" ${state.executionerTargetRule === "both" ? "selected" : ""}>Both</option>
        </select>
      </div>

      <div class="settings-field">
        <label class="settings-field-label">Sheriff sees Executioner as</label>
        <select class="settings-modern-select" onchange="setSheriffExecutionerResult(this.value)">
          <option value="innocent" ${state.sheriffExecutionerResult === "innocent" ? "selected" : ""}>Innocent</option>
          <option value="not_innocent" ${state.sheriffExecutionerResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
          <option value="exact" ${state.sheriffExecutionerResult === "exact" ? "selected" : ""}>Exact Role</option>
        </select>
      </div>

      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Can win while dead</span>
          <label class="switch">
            <input type="checkbox"
              ${state.executionerWinIfDead ? "checked" : ""}
              onchange="toggleExecutionerWinIfDead(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Wins if Vigilante kills target</span>
          <label class="switch">
            <input type="checkbox"
              ${state.executionerWinIfVigilanteKillsTarget ? "checked" : ""}
              onchange="toggleExecutionerVigilanteWin(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if(role === "vigilante"){
    advancedHTML = `
      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">Can kill neutrals</span>
          <label class="switch">
            <input type="checkbox"
              ${state.vigilanteCanKillNeutrals ? "checked" : ""}
              onchange="toggleVigilanteCanKillNeutrals(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-field">
        <label class="settings-field-label">Wrong target result</label>
        <select class="settings-modern-select" onchange="setVigilanteWrongKillOutcome(this.value)">
          <option value="both_die" ${state.vigilanteWrongKillOutcome === "both_die" ? "selected" : ""}>Both die</option>
          <option value="only_vigilante_dies" ${state.vigilanteWrongKillOutcome === "only_vigilante_dies" ? "selected" : ""}>Only Vigilante dies</option>
          <option value="only_target_dies" ${state.vigilanteWrongKillOutcome === "only_target_dies" ? "selected" : ""}>Only target dies</option>
        </select>
      </div>
    `
  }

  return `
    <div class="settings-field">
      <label class="settings-field-label">Role chance</label>
      <div class="settings-slider-row">
        <input type="range"
          id="${role}Slider"
          min="0"
          max="100"
          value="${weight}"
          oninput="updateSlider(this,'${role}'); setRoleWeight('${role}', this.value)">
        <span class="settings-slider-value">${weight}%</span>
      </div>
    </div>

    <div class="settings-field">
      <label class="settings-field-label">Maximum amount</label>
      <input class="settings-modern-number"
        type="number"
        min="1"
        max="10"
        value="${count}"
        onchange="window.updateRoleCount('${role}', this.value)">
    </div>

    ${advancedHTML ? `
      <div class="settings-advanced-label">Additional Settings</div>
      ${advancedHTML}
    ` : ""}
  `
}

function initRolePanel(card, role){
  const slider = card.querySelector(`#${role}Slider`)
  if(slider){
    updateSlider(slider, role)
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

let savedExecutionerTargetRule = localStorage.getItem("mafiaExecutionerTargetRule")

let savedRevealRolesOnElimination = localStorage.getItem("mafiaRevealRolesOnElimination")

let savedExecutionerWinIfDead = localStorage.getItem("mafiaExecutionerWinIfDead")

let savedSheriffJesterResult = localStorage.getItem("mafiaSheriffJesterResult")

let savedMayorVotePower = localStorage.getItem("mafiaMayorVotePower")

let savedSheriffExecutionerResult = localStorage.getItem("mafiaSheriffExecutionerResult")

let savedFramerKnowsSuccess = localStorage.getItem("mafiaFramerKnowsSuccess")

let savedFramerKnowsMafia = localStorage.getItem("mafiaFramerKnowsMafia")

let savedMafiaKnowsFramer = localStorage.getItem("mafiaMafiaKnowsFramer")

let savedSpiritRevealType = localStorage.getItem("mafiaSpiritRevealType")

let savedSpiritActivation = localStorage.getItem("mafiaSpiritActivation")

let savedSpiritCanSkipReveal = localStorage.getItem("mafiaSpiritCanSkipReveal")

let savedMafiaKillMethod = localStorage.getItem("mafiaKillMethod")

let savedMafiaKnowsFirstLeader = localStorage.getItem("mafiaKnowsFirstLeader")

let savedVigilanteCanKillNeutrals = localStorage.getItem("mafiaVigilanteCanKillNeutrals")

let savedVigilanteWrongKillOutcome = localStorage.getItem("mafiaVigilanteWrongKillOutcome")

let savedJesterVigWin = localStorage.getItem("mafiaJesterVigilanteWin")

let savedExecutionerVigilanteWin = localStorage.getItem("mafiaExecutionerVigilanteWin")

if(savedExecutionerVigilanteWin){
state.executionerWinIfVigilanteKillsTarget = JSON.parse(savedExecutionerVigilanteWin)
}

if(savedJesterVigWin){
  state.jesterWinIfVigilanteKilled = JSON.parse(savedJesterVigWin)
}

if(savedVigilanteCanKillNeutrals){
  state.vigilanteCanKillNeutrals = JSON.parse(savedVigilanteCanKillNeutrals)
}

if(savedVigilanteWrongKillOutcome){
  state.vigilanteWrongKillOutcome = JSON.parse(savedVigilanteWrongKillOutcome)
}

if(savedMafiaKnowsFirstLeader){
state.mafiaKnowsFirstLeader = JSON.parse(savedMafiaKnowsFirstLeader)
}

if(savedMafiaKillMethod){
state.mafiaKillMethod = JSON.parse(savedMafiaKillMethod)
}

if(savedSpiritRevealType){
state.spiritRevealType = JSON.parse(savedSpiritRevealType)
}

if(savedSpiritActivation){
state.spiritActivation = JSON.parse(savedSpiritActivation)
}

if(savedSpiritCanSkipReveal){
state.spiritCanSkipReveal = JSON.parse(savedSpiritCanSkipReveal)
}

if(savedFramerKnowsSuccess){
state.framerKnowsSuccess = JSON.parse(savedFramerKnowsSuccess)
}

if(savedFramerKnowsMafia){
state.framerKnowsMafia = JSON.parse(savedFramerKnowsMafia)
}

if(savedMafiaKnowsFramer){
state.mafiaKnowsFramer = JSON.parse(savedMafiaKnowsFramer)
}

if(savedSheriffExecutionerResult){
state.sheriffExecutionerResult = JSON.parse(savedSheriffExecutionerResult)
}

if(savedMayorVotePower){
state.mayorVotePower = JSON.parse(savedMayorVotePower)
}

if(savedSheriffJesterResult){
state.sheriffJesterResult = JSON.parse(savedSheriffJesterResult)
}

if(savedExecutionerWinIfDead){
state.executionerWinIfDead = JSON.parse(savedExecutionerWinIfDead)
}

if(savedRevealRolesOnElimination){
state.revealRolesOnElimination = JSON.parse(savedRevealRolesOnElimination)
}

if(savedExecutionerTargetRule){
state.executionerTargetRule = JSON.parse(savedExecutionerTargetRule)
}

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

window.toggleMafiaKnowsFirstLeader = function(enabled){

state.mafiaKnowsFirstLeader = enabled

localStorage.setItem(
"mafiaKnowsFirstLeader",
JSON.stringify(enabled)
)

}

window.toggleFramerKnowsSuccess = function(enabled){

state.framerKnowsSuccess = enabled

localStorage.setItem(
"mafiaFramerKnowsSuccess",
JSON.stringify(enabled)
)

}

window.toggleFramerKnowsMafia = function(enabled){

state.framerKnowsMafia = enabled

localStorage.setItem(
"mafiaFramerKnowsMafia",
JSON.stringify(enabled)
)

}

window.toggleMafiaKnowsFramer = function(enabled){

state.mafiaKnowsFramer = enabled

localStorage.setItem(
"mafiaMafiaKnowsFramer",
JSON.stringify(enabled)
)

}

window.setMafiaKillMethod = function(value){

state.mafiaKillMethod = value

localStorage.setItem(
"mafiaKillMethod",
JSON.stringify(value)
)

}

window.setMayorVotePower = function(value){

state.mayorVotePower = Number(value)

localStorage.setItem(
"mafiaMayorVotePower",
JSON.stringify(state.mayorVotePower)
)

}

window.setSheriffExecutionerResult = function(value){

state.sheriffExecutionerResult = value

localStorage.setItem(
"mafiaSheriffExecutionerResult",
JSON.stringify(value)
)

}

window.setSheriffJesterResult = function(value){

state.sheriffJesterResult = value

localStorage.setItem(
"mafiaSheriffJesterResult",
JSON.stringify(value)
)

}

window.setRevealRolesOnElimination = function(value){

state.revealRolesOnElimination = value

localStorage.setItem(
"mafiaRevealRolesOnElimination",
JSON.stringify(value)
)

}

window.toggleExecutionerWinIfDead = function(enabled){

state.executionerWinIfDead = enabled

localStorage.setItem(
"mafiaExecutionerWinIfDead",
JSON.stringify(enabled)
)

}

window.setExecutionerTargetRule = function(value){

state.executionerTargetRule = value

localStorage.setItem(
"mafiaExecutionerTargetRule",
JSON.stringify(value)
)

}

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

window.toggleDoctorReveal = function(enabled){

state.doctorRevealSave = enabled

localStorage.setItem(
"mafiaDoctorReveal",
JSON.stringify(enabled)
)

}

window.toggleSheriffExactReveal = function(enabled){

state.sheriffExactReveal = enabled

localStorage.setItem(
"mafiaSheriffExactReveal",
JSON.stringify(enabled)
)

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

function assignRoles(){

let players = state.players
let pool = []

let mafia = state.mafiaCountOverride || mafiaCount(players.length)
mafia = Math.min(mafia, maxAllowedMafia(players.length))

for(let i=0;i<mafia;i++){
pool.push("mafia")
}

["doctor","sheriff","jester","executioner","mayor","spirit","framer","vigilante"].forEach(role=>{

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

let mafiaPlayers = players
  .filter(p => p.role === "mafia")
  .map(p => p.name)

state.mafiaLeaderOrder = shuffle([...mafiaPlayers])
state.mafiaLeaderIndex = 0
state.currentMafiaLeader = state.mafiaLeaderOrder[0] || null

state.executionerTargets = {}

let executioners = players.filter(p => p.role === "executioner")

executioners.forEach(executioner => {

  let possibleTargets = players.filter(p => {
    if(p.name === executioner.name) return false
    if(p.role === "executioner") return false

    if(state.executionerTargetRule === "neither"){
      return p.role !== "mafia" && p.role !== "jester"
    }

    if(state.executionerTargetRule === "mafia"){
      return p.role !== "jester"
    }

    if(state.executionerTargetRule === "jester"){
      return p.role !== "mafia"
    }

    return true // both
  })

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

if(role === "jester"){
let jesterRuleText = {
  innocent: "innocent to Sheriff",
  not_innocent: "not innocent to Sheriff",
  exact: "revealed exactly by Sheriff"
}

extras = ` <span style="opacity:0.7;">• ${jesterRuleText[state.sheriffJesterResult]}</span>`

if(state.jesterWinIfVigilanteKilled){
  extras += ` <span style="opacity:0.7;">• wins if Vigilante kills them</span>`
}
}

if(role === "vigilante"){
  extras = ` <span style="opacity:0.7;">• ${state.vigilanteCanKillNeutrals ? "can kill neutrals" : "cannot kill neutrals"}</span>`

  let wrongKillText = {
    both_die: "wrong target: both die",
    only_vigilante_dies: "wrong target: only Vigilante dies",
    only_target_dies: "wrong target: only target dies"
  }

  extras += ` <span style="opacity:0.7;">• ${wrongKillText[state.vigilanteWrongKillOutcome]}</span>`
}

if(role === "mayor"){
extras = ` <span style="opacity:0.7;">• ${state.mayorVotePower} vote power</span>`
}

if(role === "sheriff"){
extras = state.sheriffExactReveal
? ` <span style="opacity:0.7;">• exact role</span>`
: ` <span style="opacity:0.7;">• innocent / not innocent</span>`
}

if(role === "executioner"){

let executionerRuleText = {
  neither: "targets only town",
  mafia: "targets mafia",
  jester: "targets jester",
  both: "targets mafia or jester"
}

let executionerSheriffText = {
  innocent: "innocent to Sheriff",
  not_innocent: "not innocent to Sheriff",
  exact: "revealed exactly by Sheriff"
}

extras = ` <span style="opacity:0.7;">• ${executionerRuleText[state.executionerTargetRule]}</span>`
extras += ` <span style="opacity:0.7;">• ${executionerSheriffText[state.sheriffExecutionerResult]}</span>`

if(state.executionerWinIfDead){
  extras += ` <span style="opacity:0.7;">• wins even if dead</span>`
}

if(state.executionerWinIfVigilanteKillsTarget){
  extras += ` <span style="opacity:0.7;">• wins if Vigilante kills target</span>`
}

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


function getBalanceWarnings(){

let playerCount = state.players.length
let mafia = state.mafiaCountOverride || mafiaCount(playerCount)
mafia = Math.min(mafia, maxAllowedMafia(playerCount))

let specialRoles = 0

Object.keys(state.rolesEnabled).forEach(role => {
if(state.rolesEnabled[role]){
specialRoles += state.roleCounts[role] || 1
}
})

const hasDoctor = state.rolesEnabled.doctor
const hasSheriff = state.rolesEnabled.sheriff
const hasMayor = state.rolesEnabled.mayor
const hasJester = state.rolesEnabled.jester
const hasExecutioner = state.rolesEnabled.executioner

// Most specific combo warnings first
if(hasMayor && hasSheriff && hasDoctor && playerCount < 7){
return ["Mayor + Sheriff + Doctor may be too strong in a medium lobby."]
}

if(hasMayor && hasSheriff && playerCount < 6){
return ["Mayor + Sheriff may be too strong in a smaller lobby."]
}

if(hasDoctor && hasMayor && playerCount < 6){
return ["Doctor + Mayor together may be too strong in a very small lobby."]
}

if(hasDoctor && hasSheriff && playerCount < 6){
return ["Doctor + Sheriff together may be too strong in a very small lobby."]
}

// Then broader setup warnings
if(mafia >= Math.ceil(playerCount / 2)){
return ["Too many mafia for this player count."]
}

if(playerCount <= 5 && mafia >= 2){
return ["2 mafia with 5 or fewer players may end the game very quickly."]
}

if(specialRoles > playerCount - mafia){
return ["There may be more special roles than available non-mafia players."]
}

// Then single-role warnings
if(hasMayor && playerCount < 5){
return ["Mayor can be very strong in smaller games."]
}

if(hasExecutioner && playerCount < 6){
return ["Executioner can be very strong in smaller games."]
}

if(hasJester && playerCount < 6){
return ["Jester can feel very swingy in smaller games."]
}

return []

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

function getInitialMafiaLeaderName(){
  if(!state.mafiaLeaderOrder || !state.mafiaLeaderOrder.length){
    return null
  }

  return state.mafiaLeaderOrder[0]
}

function revealRole(){

let player = state.players[revealIndex]
let color = roleColors[player.role] || "white"
let role = roles[player.role]
let extraInfo = ""

if(player.role === "executioner"){
  let target = state.executionerTargets[player.name]
  if(target){
    extraInfo = `
      <div class="executioner-target-box">
        <div class="executioner-target-label">Your target is</div>
        <div class="executioner-target-name">${target}</div>
      </div>
    `
  }
}

if(player.role === "framer" && state.framerKnowsMafia){
  let mafiaNames = state.players
    .filter(p => p.role === "mafia")
    .map(p => p.name)

  if(mafiaNames.length){
    extraInfo += `
      <div class="framer-target-box">
        <div class="framer-target-label">Mafia Members</div>
        <div class="framer-target-name">${mafiaNames.join("<br>")}</div>
      </div>
    `
  }
}

if(player.role === "mafia" && state.mafiaKnowsFramer){
  let framerNames = state.players
    .filter(p => p.role === "framer")
    .map(p => p.name)

  if(framerNames.length){
    extraInfo += `
      <div class="framer-target-box">
        <div class="framer-target-label">Framer</div>
        <div class="framer-target-name">${framerNames.join("<br>")}</div>
      </div>
    `
  }
}

if(player.role === "mafia" && state.mafiaKillMethod === "leader"){
  const leaderName = getInitialMafiaLeaderName()

  if(leaderName){
    if(player.name === leaderName){
      extraInfo += `
        <div class="framer-target-box">
          <div class="framer-target-label">Tonights killing is done by</div>
          <div class="framer-target-name">YOU!</div>
        </div>
      `
    }else if(state.mafiaKnowsFirstLeader){
      extraInfo += `
        <div class="framer-target-box">
          <div class="framer-target-label">Tonights killing is done by</div>
          <div class="framer-target-name">${leaderName}</div>
        </div>
      `
    }
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

function resetPresetRoles(){
  state.rolesEnabled.doctor = false
  state.rolesEnabled.sheriff = false
  state.rolesEnabled.jester = false
  state.rolesEnabled.executioner = false
  state.rolesEnabled.mayor = false
  state.rolesEnabled.spirit = false
  state.rolesEnabled.framer = false
  state.rolesEnabled.vigilante = false

  state.roleWeights.doctor = 100
  state.roleWeights.sheriff = 100
  state.roleWeights.jester = 100
  state.roleWeights.executioner = 100
  state.roleWeights.mayor = 100
  state.roleWeights.spirit = 100
  state.roleWeights.framer = 100
  state.roleWeights.vigilante = 100

  state.roleCounts.doctor = 1
  state.roleCounts.sheriff = 1
  state.roleCounts.jester = 1
  state.roleCounts.executioner = 1
  state.roleCounts.mayor = 1
  state.roleCounts.spirit = 1
  state.roleCounts.framer = 1
  state.roleCounts.vigilante = 1
}

window.applyPreset = function(preset){
resetPresetRoles()

if(preset === "classic"){
state.rolesEnabled.doctor = true
state.rolesEnabled.sheriff = true
state.rolesEnabled.jester = false
state.rolesEnabled.executioner = false
state.rolesEnabled.mayor = false
state.rolesEnabled.spirit = false
state.rolesEnabled.framer = false

state.roleWeights.doctor = 100
state.roleWeights.sheriff = 100
state.roleWeights.jester = 0
state.roleWeights.executioner = 0
state.roleWeights.mayor = 0
state.roleWeights.spirit = 0
state.roleWeights.framer = 0

state.roleCounts.doctor = 1
state.roleCounts.sheriff = 1
state.roleCounts.jester = 1
state.roleCounts.executioner = 1
state.roleCounts.mayor = 1
state.roleCounts.spirit = 1
state.roleCounts.framer = 1

state.doctorRevealSave = false
state.sheriffExactReveal = false
state.executionerTargetRule = "neither"
state.executionerWinIfDead = false
state.sheriffJesterResult = "not_innocent"
state.sheriffExecutionerResult = "not_innocent"
state.mayorVotePower = 2

state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true
state.mafiaKillMethod = "leader"

state.rolesEnabled.vigilante = false
state.roleWeights.vigilante = 0
state.roleCounts.vigilante = 1

state.jesterWinIfVigilanteKilled = false
state.executionerWinIfVigilanteKillsTarget = false
state.vigilanteCanKillNeutrals = true
state.vigilanteWrongKillOutcome = "both_die"

state.mafiaCountOverride = 0
state.revealRolesOnElimination = "none"
}

if(preset === "beginner"){
state.rolesEnabled.doctor = true
state.rolesEnabled.sheriff = false
state.rolesEnabled.jester = false
state.rolesEnabled.executioner = false
state.rolesEnabled.mayor = false
state.rolesEnabled.spirit = true
state.rolesEnabled.framer = false

state.roleWeights.doctor = 100
state.roleWeights.sheriff = 0
state.roleWeights.jester = 0
state.roleWeights.executioner = 0
state.roleWeights.mayor = 0
state.roleWeights.spirit = 100
state.roleWeights.framer = 0

state.roleCounts.doctor = 1
state.roleCounts.sheriff = 1
state.roleCounts.jester = 1
state.roleCounts.executioner = 1
state.roleCounts.mayor = 1
state.roleCounts.spirit = 1
state.roleCounts.framer = 1

state.rolesEnabled.vigilante = false
state.roleWeights.vigilante = 0
state.roleCounts.vigilante = 1

state.doctorRevealSave = true
state.sheriffExactReveal = false
state.executionerTargetRule = "neither"
state.executionerWinIfDead = false
state.sheriffJesterResult = "not_innocent"
state.sheriffExecutionerResult = "not_innocent"
state.mayorVotePower = 2

state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true
state.mafiaKillMethod = "leader"

state.jesterWinIfVigilanteKilled = false
state.executionerWinIfVigilanteKillsTarget = false
state.vigilanteCanKillNeutrals = true
state.vigilanteWrongKillOutcome = "both_die"

state.mafiaCountOverride = 0
state.revealRolesOnElimination = "death_and_vote"
}

if(preset === "chaotic"){
state.rolesEnabled.doctor = true
state.rolesEnabled.sheriff = true
state.rolesEnabled.jester = true
state.rolesEnabled.executioner = true
state.rolesEnabled.mayor = true
state.rolesEnabled.spirit = true
state.rolesEnabled.framer = true

state.roleWeights.doctor = 100
state.roleWeights.sheriff = 100
state.roleWeights.jester = 100
state.roleWeights.executioner = 100
state.roleWeights.mayor = 100
state.roleWeights.spirit = 100
state.roleWeights.framer = 100

state.roleCounts.doctor = 1
state.roleCounts.sheriff = 1
state.roleCounts.jester = 1
state.roleCounts.executioner = 1
state.roleCounts.mayor = 1
state.roleCounts.spirit = 1
state.roleCounts.framer = 1

state.doctorRevealSave = true
state.sheriffExactReveal = true
state.executionerTargetRule = "both"
state.executionerWinIfDead = true
state.sheriffJesterResult = "exact"
state.sheriffExecutionerResult = "exact"
state.mayorVotePower = 2.5

state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true
state.mafiaKillMethod = "vote"

state.rolesEnabled.vigilante = true
state.roleWeights.vigilante = 100
state.roleCounts.vigilante = 1

state.jesterWinIfVigilanteKilled = true
state.executionerWinIfVigilanteKillsTarget = true
state.vigilanteCanKillNeutrals = true
state.vigilanteWrongKillOutcome = "both_die"

state.mafiaCountOverride = 0
state.revealRolesOnElimination = "death_and_vote"
}

saveSettingsToStorage()
showSettings()

}

window.toggleExecutionerVigilanteWin = function(enabled){

state.executionerWinIfVigilanteKillsTarget = enabled

localStorage.setItem(
"mafiaExecutionerVigilanteWin",
JSON.stringify(enabled)
)

}

function saveSettingsToStorage(){

localStorage.setItem("mafiaExecutionerVigilanteWin",JSON.stringify(state.executionerWinIfVigilanteKillsTarget))
localStorage.setItem("mafiaJesterVigilanteWin",JSON.stringify(state.jesterWinIfVigilanteKilled))
localStorage.setItem("mafiaVigilanteCanKillNeutrals", JSON.stringify(state.vigilanteCanKillNeutrals))
localStorage.setItem("mafiaVigilanteWrongKillOutcome", JSON.stringify(state.vigilanteWrongKillOutcome))
localStorage.setItem("mafiaKnowsFirstLeader", JSON.stringify(state.mafiaKnowsFirstLeader))
localStorage.setItem("mafiaKillMethod", JSON.stringify(state.mafiaKillMethod))
localStorage.setItem("mafiaSpiritRevealType", JSON.stringify(state.spiritRevealType))
localStorage.setItem("mafiaSpiritActivation", JSON.stringify(state.spiritActivation))
localStorage.setItem("mafiaSpiritCanSkipReveal", JSON.stringify(state.spiritCanSkipReveal))
localStorage.setItem("mafiaFramerKnowsSuccess", JSON.stringify(state.framerKnowsSuccess))
localStorage.setItem("mafiaFramerKnowsMafia", JSON.stringify(state.framerKnowsMafia))
localStorage.setItem("mafiaMafiaKnowsFramer", JSON.stringify(state.mafiaKnowsFramer))
localStorage.setItem("mafiaSheriffExecutionerResult", JSON.stringify(state.sheriffExecutionerResult))
localStorage.setItem("mafiaMayorVotePower", JSON.stringify(state.mayorVotePower))
localStorage.setItem("mafiaSheriffJesterResult", JSON.stringify(state.sheriffJesterResult))
localStorage.setItem("mafiaExecutionerTargetRule", JSON.stringify(state.executionerTargetRule))
localStorage.setItem("mafiaRoles", JSON.stringify(state.rolesEnabled))
localStorage.setItem("mafiaRoleWeights", JSON.stringify(state.roleWeights))
localStorage.setItem("mafiaRoleCounts", JSON.stringify(state.roleCounts))
localStorage.setItem("mafiaDoctorReveal", JSON.stringify(state.doctorRevealSave))
localStorage.setItem("mafiaSheriffExactReveal", JSON.stringify(state.sheriffExactReveal))
localStorage.setItem("mafiaCountOverride", JSON.stringify(state.mafiaCountOverride))
localStorage.setItem("mafiaRevealRolesOnElimination", JSON.stringify(state.revealRolesOnElimination))

}

window.toggleVigilanteCanKillNeutrals = function(enabled){
  state.vigilanteCanKillNeutrals = enabled

  localStorage.setItem(
    "mafiaVigilanteCanKillNeutrals",
    JSON.stringify(enabled)
  )
}

window.setVigilanteWrongKillOutcome = function(value){
  state.vigilanteWrongKillOutcome = value

  localStorage.setItem(
    "mafiaVigilanteWrongKillOutcome",
    JSON.stringify(value)
  )
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