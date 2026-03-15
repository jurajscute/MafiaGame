import {state} from "./state.js"
import {addLogEntry} from "./state.js"
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
framer: "#8b0000"
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

window.toggleRolesSection = function(){

state.rolesSectionOpen = !state.rolesSectionOpen

let panel = document.getElementById("roles-section-content")
let arrow = document.querySelector("#roles-section-wrap .section-arrow")

if(panel){
panel.classList.toggle("show", state.rolesSectionOpen)
}

if(arrow){
arrow.style.transform = state.rolesSectionOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.toggleGlobalSettingsSection = function(){

state.globalSettingsOpen = !state.globalSettingsOpen

let panel = document.getElementById("global-settings-content")
let arrow = document.querySelector("#global-settings-wrap .section-arrow")

if(panel){
panel.classList.toggle("show", state.globalSettingsOpen)
}

if(arrow){
arrow.style.transform = state.globalSettingsOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.togglePresetsSection = function(){

state.presetsSectionOpen = !state.presetsSectionOpen

let panel = document.getElementById("presets-section-content")
let arrow = document.querySelector("#presets-section-wrap .section-arrow")

if(panel){
panel.classList.toggle("show", state.presetsSectionOpen)
}

if(arrow){
arrow.style.transform = state.presetsSectionOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.resetSettings = function(){

state.rolesEnabled = {
doctor: false,
sheriff: false,
jester: false,
executioner: false,
mayor: false,
spirit: false,
framer: false
}

state.roleWeights = {
doctor: 100,
sheriff: 100,
jester: 100,
executioner: 100,
mayor: 100,
spirit: 100,
framer: 100
}

state.roleCounts = {
doctor: 1,
sheriff: 1,
jester: 1,
executioner: 1,
mayor: 1,
spirit: 1,
framer: 1
}

state.executionerTargetRule = "neither"

state.mayorVotePower = 2

state.doctorRevealSave = false
state.sheriffExactReveal = false
state.mafiaCountOverride = 0

state.revealRolesOnElimination = "none"
state.executionerWinIfDead = false

state.framerExtraOpen = false
state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true

state.globalSettingsOpen = false
state.executionerExtraOpen = false
state.mayorExtraOpen = false
state.doctorExtraOpen = false
state.sheriffExtraOpen = false
state.jesterExtraOpen = false

state.rolesSectionOpen = false
state.presetsSectionOpen = false
state.mafiaRolesOpen = false
state.townRolesOpen = false
state.neutralRolesOpen = false

state.spiritExtraOpen = false
state.spiritRevealType = "exact"
state.spiritActivation = "night_only"
state.spiritCanSkipReveal = true

state.sheriffJesterResult = "not_innocent"
state.sheriffExecutionerResult = "not_innocent"

state.mafiaKillMethod = "leader"
state.currentMafiaLeader = null
state.mafiaLeaderRotationIndex = 0

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

window.toggleSpiritExtras = function(){

state.spiritExtraOpen = !state.spiritExtraOpen

let panel = document.getElementById("spirit-extra-settings")
let arrow = document.querySelector("#spirit-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.spiritExtraOpen)
}

if(arrow){
arrow.style.transform = state.spiritExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

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

window.toggleMafiaRolesGroup = function(){

  state.mafiaRolesOpen = !state.mafiaRolesOpen

  let panel = document.getElementById("mafia-roles-content")
  let arrow = document.querySelector("#mafia-roles-wrap .section-arrow")

  if(panel){
    panel.classList.toggle("show", state.mafiaRolesOpen)
  }

  if(arrow){
    arrow.style.transform = state.mafiaRolesOpen ? "rotate(180deg)" : "rotate(0deg)"
  }

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

  modal.querySelectorAll('.role-weight input[type="range"]').forEach(slider => {
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
  const modal = document.getElementById("infoModal");
let mafiaRolesContent = ""
let townRolesContent = ""
let neutralRolesContent = ""

const mafiaRoles = ["framer"]
const townRoles = ["doctor", "sheriff", "mayor", "spirit"]
const neutralRoles = ["jester", "executioner"]

  let content = `
    <div class="modal-content">
      <h2 class="settings-title">Game Settings</h2>
${state.gameStarted ? `
<div class="settings-locked">
🔒 Settings locked during game
</div>
` : ""}
  `;

content += `

<div class="role-toggle">
  <span>Host Mode</span>
  <label class="switch">
    <input type="checkbox"
      ${state.hostMode ? "checked" : ""}
      onchange="toggleHostMode(this.checked)">
    <span class="slider"></span>
  </label>
</div>

`

  content += `

<div class="settings-section-wrap" id="presets-section-wrap">

  <div class="settings-section-bar" onclick="togglePresetsSection()">
    <span>Presets</span>
    <span class="section-arrow" style="transform:${state.presetsSectionOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="settings-section-content ${state.presetsSectionOpen ? "show" : ""}" id="presets-section-content">
    <div class="preset-grid">
      <button type="button" onclick="applyPreset('classic')">Classic</button>
      <button type="button" onclick="applyPreset('beginner')">Beginner</button>
      <button type="button" onclick="applyPreset('chaotic')">Chaotic</button>
    </div>
  </div>

</div>

`

const playerCount = state.players.length
const mafiaMax = maxAllowedMafia(playerCount)
const autoMafia = playerCount > 0 ? mafiaCount(playerCount) : 1

let mafiaOptions = `<option value="0" ${state.mafiaCountOverride === 0 ? "selected" : ""}>Auto (${autoMafia})</option>`

for(let i = 1; i <= mafiaMax; i++){
let label = i === 1 ? "1 Mafia Member" : `${i} Mafia`
mafiaOptions += `<option value="${i}" ${state.mafiaCountOverride === i ? "selected" : ""}>${label}</option>`
}

content += `

<div class="settings-section-wrap" id="global-settings-wrap">

  <div class="settings-section-bar" onclick="toggleGlobalSettingsSection()">
    <span>Global Settings</span>
    <span class="section-arrow" style="transform:${state.globalSettingsOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="settings-section-content ${state.globalSettingsOpen ? "show" : ""}" id="global-settings-content">

    <div class="global-setting-card">

      <div class="global-setting-top">
        <span class="global-setting-title">
          Role Reveal
        </span>
        <span class="global-setting-badge">Global</span>
      </div>

      <div class="global-setting-row reveal-setting-row">
        <label for="revealRolesSelect">Reveal roles on elimination?</label>

        <select id="revealRolesSelect" onchange="setRevealRolesOnElimination(this.value)">
          <option value="none" ${state.revealRolesOnElimination === "none" ? "selected" : ""}>Never</option>
          <option value="death" ${state.revealRolesOnElimination === "death" ? "selected" : ""}>Night kill only</option>
          <option value="vote_only" ${state.revealRolesOnElimination === "vote_only" ? "selected" : ""}>Vote only</option>
          <option value="death_and_vote" ${state.revealRolesOnElimination === "death_and_vote" ? "selected" : ""}>Night kill and vote</option>
        </select>
      </div>

    </div>

    <div class="global-setting-card mafia-setting-card">

      <div class="global-setting-top">
        <span class="global-setting-title" style="color:${roleColors.mafia}">
          Mafia Settings
        </span>
        <span class="global-setting-badge">Global</span>
      </div>

      <div class="global-setting-row mafia-setting-row">
        <label for="mafiaCountSelect">How many mafia?</label>

        <select id="mafiaCountSelect" onchange="window.updateMafiaCountOverride(this.value)">
          ${mafiaOptions}
        </select>
      </div>

      <div class="global-setting-divider"></div>

      <div class="global-setting-row mafia-setting-row">
        <label for="mafiaKillMethodSelect">How is the mafia target chosen?</label>

        <select id="mafiaKillMethodSelect" onchange="setMafiaKillMethod(this.value)">
          <option value="leader" ${state.mafiaKillMethod === "leader" ? "selected" : ""}>Leader chooses (rotating)</option>
          <option value="vote" ${state.mafiaKillMethod === "vote" ? "selected" : ""}>Mafia vote</option>
        </select>
      </div>

      <div class="global-setting-divider"></div>

      <div class="global-setting-row mafia-setting-row">
        <label>Mafia know who the Framer is</label>

        <label class="switch">
          <input type="checkbox"
            ${state.mafiaKnowsFramer ? "checked" : ""}
            onchange="toggleMafiaKnowsFramer(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

      <p class="global-setting-note">
        Recommended in Auto mode: <strong>${autoMafia}</strong><br>
        Max allowed with ${playerCount} player${playerCount === 1 ? "" : "s"}: <strong>${mafiaMax}</strong><br><br>
        Leader chooses: one mafia picks the kill, and the leader rotates each night.<br>
        Mafia vote: all mafia vote, and ties are broken randomly among tied targets.
      </p>

    </div>

  </div>

</div>

`

   ;[...mafiaRoles, ...townRoles, ...neutralRoles].forEach(role => {
  const enabled = state.rolesEnabled[role];
  const weight = state.roleWeights[role] || 0;
  const color = roleColors[role] || "#fff";

  let roleBlock = `
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

    <div class="role-count ${enabled ? "show" : ""}" id="${role}-count">
      <label>Maximum amount:</label>
      <input type="number"
        min="1"
        max="10"
        value="${state.roleCounts[role] || 1}"
        onchange="window.updateRoleCount('${role}', this.value)">
    </div>
  `

  if(role === "doctor" && enabled){
  roleBlock += `
    <div class="doctor-extra-wrap show" id="doctor-extra-wrap">
      <div class="additional-settings-bar" onclick="toggleDoctorExtras()">
        <span>Additional Settings</span>
        <span class="additional-arrow" style="transform:${state.doctorExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
      </div>

      <div class="doctor-extra-settings ${state.doctorExtraOpen ? "show" : ""}" id="doctor-extra-settings">
        <div class="doctor-settings-card">
          <div class="doctor-setting-row">
            <span class="doctor-setting-label">Reveal Saved Player</span>

            <label class="switch">
              <input type="checkbox"
                ${state.doctorRevealSave ? "checked" : ""}
                onchange="toggleDoctorReveal(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `
}

if(role === "mayor" && enabled){
roleBlock += `

<div class="mayor-extra-wrap show" id="mayor-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleMayorExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.mayorExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="mayor-extra-settings ${state.mayorExtraOpen ? "show" : ""}" id="mayor-extra-settings">

    <div class="mayor-settings-card">

      <div class="mayor-setting-row">
        <span class="mayor-setting-label">Vote Power</span>

        <select class="mayor-setting-select" onchange="setMayorVotePower(this.value)">
          <option value="1.5" ${state.mayorVotePower == 1.5 ? "selected" : ""}>1.5 votes</option>
          <option value="2" ${state.mayorVotePower == 2 ? "selected" : ""}>2 votes</option>
          <option value="2.5" ${state.mayorVotePower == 2.5 ? "selected" : ""}>2.5 votes</option>
          <option value="3" ${state.mayorVotePower == 3 ? "selected" : ""}>3 votes</option>
        </select>
      </div>

    </div>

  </div>

</div>

`
}

if(role === "jester" && enabled){
roleBlock += `

<div class="jester-extra-wrap show" id="jester-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleJesterExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.jesterExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="jester-extra-settings ${state.jesterExtraOpen ? "show" : ""}" id="jester-extra-settings">

    <div class="jester-settings-card">

      <div class="jester-setting-row">
        <span class="jester-setting-label">Sheriff sees Jester as...</span>

        <select class="jester-setting-select" onchange="setSheriffJesterResult(this.value)">
          <option value="innocent" ${state.sheriffJesterResult === "innocent" ? "selected" : ""}>Innocent</option>
          <option value="not_innocent" ${state.sheriffJesterResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
          <option value="exact" ${state.sheriffJesterResult === "exact" ? "selected" : ""}>Exact Role</option>
        </select>
      </div>

    </div>

  </div>

</div>

`
}

  if(role === "sheriff" && enabled){
  roleBlock += `
    <div class="sheriff-extra-wrap show" id="sheriff-extra-wrap">
      <div class="additional-settings-bar" onclick="toggleSheriffExtras()">
        <span>Additional Settings</span>
        <span class="additional-arrow" style="transform:${state.sheriffExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
      </div>

      <div class="sheriff-extra-settings ${state.sheriffExtraOpen ? "show" : ""}" id="sheriff-extra-settings">
        <div class="sheriff-settings-card">
          <div class="sheriff-setting-row">
            <span class="sheriff-setting-label">Reveal Exact Role</span>

            <label class="switch">
              <input type="checkbox"
                ${state.sheriffExactReveal ? "checked" : ""}
                onchange="toggleSheriffExactReveal(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `
}

if(role === "spirit" && enabled){
roleBlock += `

<div class="spirit-extra-wrap show" id="spirit-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleSpiritExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.spiritExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="spirit-extra-settings ${state.spiritExtraOpen ? "show" : ""}" id="spirit-extra-settings">

    <div class="spirit-settings-card">

      <div class="spirit-setting-row">
        <span class="spirit-setting-label">Reveal type</span>

        <select class="spirit-setting-select" onchange="setSpiritRevealType(this.value)">
          <option value="exact" ${state.spiritRevealType === "exact" ? "selected" : ""}>Exact Role</option>
          <option value="team" ${state.spiritRevealType === "team" ? "selected" : ""}>Team Only</option>
        </select>
      </div>

      <div class="spirit-setting-divider"></div>

      <div class="spirit-setting-row">
        <span class="spirit-setting-label">Activates on</span>

        <select class="spirit-setting-select" onchange="setSpiritActivation(this.value)">
          <option value="night_only" ${state.spiritActivation === "night_only" ? "selected" : ""}>Night Death Only</option>
          <option value="any_death" ${state.spiritActivation === "any_death" ? "selected" : ""}>Any Death</option>
        </select>
      </div>

      <div class="spirit-setting-divider"></div>

      <div class="spirit-setting-row">
        <span class="spirit-setting-label">Can skip reveal</span>

        <label class="switch">
          <input type="checkbox"
            ${state.spiritCanSkipReveal ? "checked" : ""}
            onchange="toggleSpiritCanSkipReveal(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

    </div>

  </div>

</div>

`
}

if(role === "framer" && enabled){
roleBlock += `

<div class="framer-extra-wrap show" id="framer-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleFramerExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.framerExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="framer-extra-settings ${state.framerExtraOpen ? "show" : ""}" id="framer-extra-settings">

    <div class="framer-settings-card">

      <div class="framer-setting-row">
        <span class="framer-setting-label">Knows if frame was successful</span>

        <label class="switch">
          <input type="checkbox"
            ${state.framerKnowsSuccess ? "checked" : ""}
            onchange="toggleFramerKnowsSuccess(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

      <div class="framer-setting-divider"></div>

      <div class="framer-setting-row">
        <span class="framer-setting-label">Knows who the mafia are</span>

        <label class="switch">
          <input type="checkbox"
            ${state.framerKnowsMafia ? "checked" : ""}
            onchange="toggleFramerKnowsMafia(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

    </div>

  </div>

</div>

`
}

  if(role === "executioner" && enabled){
  roleBlock += `
      <div class="executioner-extra-wrap show" id="executioner-extra-wrap">
        <div class="additional-settings-bar" onclick="toggleExecutionerExtras()">
          <span>Additional Settings</span>
          <span class="additional-arrow" style="transform:${state.executionerExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
        </div>

        <div class="executioner-extra-settings ${state.executionerExtraOpen ? "show" : ""}" id="executioner-extra-settings">
          <div class="executioner-settings-card">

            <div class="executioner-setting-row">
              <span class="executioner-setting-label">Can target Jester or Mafia?</span>

              <select class="executioner-setting-select" onchange="setExecutionerTargetRule(this.value)">
                <option value="neither" ${state.executionerTargetRule === "neither" ? "selected" : ""}>Neither</option>
                <option value="mafia" ${state.executionerTargetRule === "mafia" ? "selected" : ""}>Mafia</option>
                <option value="jester" ${state.executionerTargetRule === "jester" ? "selected" : ""}>Jester</option>
                <option value="both" ${state.executionerTargetRule === "both" ? "selected" : ""}>Both</option>
              </select>
            </div>

            <div class="executioner-setting-divider"></div>

            <div class="executioner-setting-row">
              <span class="executioner-setting-label">Sheriff sees Executioner as</span>

              <select class="executioner-setting-select" onchange="setSheriffExecutionerResult(this.value)">
                <option value="innocent" ${state.sheriffExecutionerResult === "innocent" ? "selected" : ""}>Innocent</option>
                <option value="not_innocent" ${state.sheriffExecutionerResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
                <option value="exact" ${state.sheriffExecutionerResult === "exact" ? "selected" : ""}>Exact Role</option>
              </select>
            </div>

            <div class="executioner-setting-divider"></div>

            <div class="executioner-setting-row">
              <span class="executioner-setting-label">Can win while dead</span>

              <label class="switch">
                <input type="checkbox"
                  ${state.executionerWinIfDead ? "checked" : ""}
                  onchange="toggleExecutionerWinIfDead(this.checked)">
                <span class="slider"></span>
              </label>
            </div>

          </div>
        </div>
      </div>
    `
}

  if(mafiaRoles.includes(role)){
  mafiaRolesContent += roleBlock
}else if(townRoles.includes(role)){
  townRolesContent += roleBlock
}else{
  neutralRolesContent += roleBlock
}
})
content += `

<div class="settings-section-wrap" id="roles-section-wrap">

  <div class="settings-section-bar" onclick="toggleRolesSection()">
    <span>Roles</span>
    <span class="section-arrow" style="transform:${state.rolesSectionOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="settings-section-content ${state.rolesSectionOpen ? "show" : ""}" id="roles-section-content">

    <div class="settings-section-wrap" id="mafia-roles-wrap">
      <div class="settings-section-bar" onclick="toggleMafiaRolesGroup()">
        <span>Mafia Roles</span>
        <span class="section-arrow" style="transform:${state.mafiaRolesOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
      </div>

      <div class="settings-section-content ${state.mafiaRolesOpen ? "show" : ""}" id="mafia-roles-content">
        ${mafiaRolesContent || `<p style="opacity:0.7;">No mafia roles available.</p>`}
      </div>
    </div>

    <div class="settings-section-wrap" id="town-roles-wrap">
      <div class="settings-section-bar" onclick="toggleTownRolesGroup()">
        <span>Town Roles</span>
        <span class="section-arrow" style="transform:${state.townRolesOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
      </div>

      <div class="settings-section-content ${state.townRolesOpen ? "show" : ""}" id="town-roles-content">
        ${townRolesContent}
      </div>
    </div>

    <div class="settings-section-wrap" id="neutral-roles-wrap">
      <div class="settings-section-bar" onclick="toggleNeutralRolesGroup()">
        <span>Neutral Roles</span>
        <span class="section-arrow" style="transform:${state.neutralRolesOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
      </div>

      <div class="settings-section-content ${state.neutralRolesOpen ? "show" : ""}" id="neutral-roles-content">
        ${neutralRolesContent}
      </div>
    </div>

  </div>

</div>

`


content += `

<button type="button" class="reset-settings-btn" onclick="confirmResetSettings()">
Reset Settings
</button>

`

  content += `<button class="close-settings-btn" onclick="closeInfo()">Close</button></div>`;

if(modal.classList.contains("show")){
  swapModalContent(content, initSettingsModal)
}else{
  openModal(content, initSettingsModal)
}
}

function assignCurrentMafiaLeader(){

let aliveMafia = state.players
  .filter(p => p.alive && p.role === "mafia")
  .map(p => p.name)

if(!aliveMafia.length){
  state.currentMafiaLeader = null
  return
}

// Remove dead mafia from the stored order
state.mafiaLeaderOrder = state.mafiaLeaderOrder.filter(name =>
  aliveMafia.includes(name)
)

// If somehow empty (edge case), rebuild it
if(!state.mafiaLeaderOrder.length){
  state.mafiaLeaderOrder = shuffle([...aliveMafia])
  state.mafiaLeaderIndex = 0
}

state.currentMafiaLeader =
  state.mafiaLeaderOrder[state.mafiaLeaderIndex % state.mafiaLeaderOrder.length]

state.mafiaLeaderIndex++
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

window.toggleJesterExtras = function(){

state.jesterExtraOpen = !state.jesterExtraOpen

let panel = document.getElementById("jester-extra-settings")
let arrow = document.querySelector("#jester-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.jesterExtraOpen)
}

if(arrow){
arrow.style.transform = state.jesterExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.toggleMayorExtras = function(){

state.mayorExtraOpen = !state.mayorExtraOpen

let panel = document.getElementById("mayor-extra-settings")
let arrow = document.querySelector("#mayor-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.mayorExtraOpen)
}

if(arrow){
arrow.style.transform = state.mayorExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.toggleExecutionerExtras = function(){

state.executionerExtraOpen = !state.executionerExtraOpen

let panel = document.getElementById("executioner-extra-settings")
let arrow = document.querySelector("#executioner-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.executionerExtraOpen)
}

if(arrow){
arrow.style.transform = state.executionerExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

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

window.toggleTownRolesGroup = function(){
  state.townRolesOpen = !state.townRolesOpen

  const panel = document.getElementById("town-roles-content")
  const arrow = document.querySelector("#town-roles-wrap .section-arrow")

  if(panel){
    panel.classList.toggle("show", state.townRolesOpen)
  }

  if(arrow){
    arrow.style.transform = state.townRolesOpen ? "rotate(180deg)" : "rotate(0deg)"
  }
}

window.toggleNeutralRolesGroup = function(){
  state.neutralRolesOpen = !state.neutralRolesOpen

  const panel = document.getElementById("neutral-roles-content")
  const arrow = document.querySelector("#neutral-roles-wrap .section-arrow")

  if(panel){
    panel.classList.toggle("show", state.neutralRolesOpen)
  }

  if(arrow){
    arrow.style.transform = state.neutralRolesOpen ? "rotate(180deg)" : "rotate(0deg)"
  }
}

window.showSettings = showSettings

window.toggleDoctorExtras = function(){

state.doctorExtraOpen = !state.doctorExtraOpen

let panel = document.getElementById("doctor-extra-settings")
let arrow = document.querySelector("#doctor-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.doctorExtraOpen)
}

if(arrow){
arrow.style.transform = state.doctorExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

}

window.toggleRole = function(role, enabled){

let slider = document.getElementById(role + "SliderContainer")
let count = document.getElementById(role + "-count")

if(role === "doctor"){
  let extraWrap = document.getElementById("doctor-extra-wrap")

  if(!enabled){
    state.doctorExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("doctor-count")

    count.insertAdjacentHTML("afterend", `
<div class="doctor-extra-wrap" id="doctor-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleDoctorExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.doctorExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="doctor-extra-settings ${state.doctorExtraOpen ? "show" : ""}" id="doctor-extra-settings">
    <div class="doctor-settings-card">
      <div class="doctor-setting-row">
        <span class="doctor-setting-label">Reveal Saved Player</span>

        <label class="switch">
          <input type="checkbox"
            ${state.doctorRevealSave ? "checked" : ""}
            onchange="toggleDoctorReveal(this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>

</div>
`)

    requestAnimationFrame(() => {
      let inserted = document.getElementById("doctor-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "jester"){
  let extraWrap = document.getElementById("jester-extra-wrap")

  if(!enabled){
    state.jesterExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("jester-count")

    count.insertAdjacentHTML("afterend", `

<div class="jester-extra-wrap" id="jester-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleJesterExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow">▾</span>
  </div>

  <div class="jester-extra-settings" id="jester-extra-settings">

    <div class="jester-settings-card">

      <div class="jester-setting-row">
        <span class="jester-setting-label">Sheriff sees Jester as</span>

        <select class="jester-setting-select" onchange="setSheriffJesterResult(this.value)">
          <option value="innocent" ${state.sheriffJesterResult === "innocent" ? "selected" : ""}>Innocent</option>
          <option value="not_innocent" ${state.sheriffJesterResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
          <option value="exact" ${state.sheriffJesterResult === "exact" ? "selected" : ""}>Exact Role</option>
        </select>
      </div>

    </div>

  </div>

</div>

`)

    requestAnimationFrame(() => {
      let inserted = document.getElementById("jester-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "sheriff"){
  let extraWrap = document.getElementById("sheriff-extra-wrap")

  if(!enabled){
    state.sheriffExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("sheriff-count")

    count.insertAdjacentHTML("afterend", `
<div class="sheriff-extra-wrap" id="sheriff-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleSheriffExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.sheriffExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="sheriff-extra-settings ${state.sheriffExtraOpen ? "show" : ""}" id="sheriff-extra-settings">
    <div class="sheriff-settings-card">
      <div class="sheriff-setting-row">
        <span class="sheriff-setting-label">Reveal Exact Role</span>

        <label class="switch">
          <input type="checkbox"
            ${state.sheriffExactReveal ? "checked" : ""}
            onchange="toggleSheriffExactReveal(this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>

</div>
`)

    requestAnimationFrame(() => {
      let inserted = document.getElementById("sheriff-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "spirit"){
  let extraWrap = document.getElementById("spirit-extra-wrap")

  if(!enabled){
    state.spiritExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("spirit-count")

    count.insertAdjacentHTML("afterend", `

<div class="spirit-extra-wrap" id="spirit-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleSpiritExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.spiritExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="spirit-extra-settings ${state.spiritExtraOpen ? "show" : ""}" id="spirit-extra-settings">

    <div class="spirit-settings-card">

      <div class="spirit-setting-row">
        <span class="spirit-setting-label">Reveal type</span>

        <select class="spirit-setting-select" onchange="setSpiritRevealType(this.value)">
          <option value="exact" ${state.spiritRevealType === "exact" ? "selected" : ""}>Exact Role</option>
          <option value="team" ${state.spiritRevealType === "team" ? "selected" : ""}>Team Only</option>
        </select>
      </div>

      <div class="spirit-setting-divider"></div>

      <div class="spirit-setting-row">
        <span class="spirit-setting-label">Activates on</span>

        <select class="spirit-setting-select" onchange="setSpiritActivation(this.value)">
          <option value="night_only" ${state.spiritActivation === "night_only" ? "selected" : ""}>Night Death Only</option>
          <option value="any_death" ${state.spiritActivation === "any_death" ? "selected" : ""}>Any Death</option>
        </select>
      </div>

      <div class="spirit-setting-divider"></div>

      <div class="spirit-setting-row">
        <span class="spirit-setting-label">Can skip reveal</span>

        <label class="switch">
          <input type="checkbox"
            ${state.spiritCanSkipReveal ? "checked" : ""}
            onchange="toggleSpiritCanSkipReveal(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

    </div>

  </div>

</div>

`)

    requestAnimationFrame(() => {
      let inserted = document.getElementById("spirit-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "framer"){
  let extraWrap = document.getElementById("framer-extra-wrap")

  if(!enabled){
    state.framerExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("framer-count")

    count.insertAdjacentHTML("afterend", `

<div class="framer-extra-wrap" id="framer-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleFramerExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow" style="transform:${state.framerExtraOpen ? "rotate(180deg)" : "rotate(0deg)"}">▾</span>
  </div>

  <div class="framer-extra-settings ${state.framerExtraOpen ? "show" : ""}" id="framer-extra-settings">

    <div class="framer-settings-card">

      <div class="framer-setting-row">
        <span class="framer-setting-label">Knows if frame was successful</span>

        <label class="switch">
          <input type="checkbox"
            ${state.framerKnowsSuccess ? "checked" : ""}
            onchange="toggleFramerKnowsSuccess(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

      <div class="framer-setting-divider"></div>

      <div class="framer-setting-row">
        <span class="framer-setting-label">Knows who the mafia are</span>

        <label class="switch">
          <input type="checkbox"
            ${state.framerKnowsMafia ? "checked" : ""}
            onchange="toggleFramerKnowsMafia(this.checked)">
          <span class="slider"></span>
        </label>
      </div>

    </div>

  </div>

</div>

`)
    requestAnimationFrame(() => {
      let inserted = document.getElementById("framer-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "mayor"){
  let extraWrap = document.getElementById("mayor-extra-wrap")

  if(!enabled){
    state.mayorExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("mayor-count")

    count.insertAdjacentHTML("afterend", `

<div class="mayor-extra-wrap" id="mayor-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleMayorExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow">▾</span>
  </div>

  <div class="mayor-extra-settings" id="mayor-extra-settings">

    <div class="mayor-settings-card">

      <div class="mayor-setting-row">
        <span class="mayor-setting-label">Vote Power</span>

        <select class="mayor-setting-select" onchange="setMayorVotePower(this.value)">
          <option value="1.5" ${state.mayorVotePower == 1.5 ? "selected" : ""}>1.5 votes</option>
          <option value="2" ${state.mayorVotePower == 2 ? "selected" : ""}>2 votes</option>
          <option value="2.5" ${state.mayorVotePower == 2.5 ? "selected" : ""}>2.5 votes</option>
          <option value="3" ${state.mayorVotePower == 3 ? "selected" : ""}>3 votes</option>
        </select>
      </div>

    </div>

  </div>

</div>

`)

    requestAnimationFrame(() => {
      let inserted = document.getElementById("mayor-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "executioner"){
  let extraWrap = document.getElementById("executioner-extra-wrap")

  if(!enabled){
    state.executionerExtraOpen = false

    if(extraWrap){
      extraWrap.classList.remove("show")
      setTimeout(() => {
        extraWrap.remove()
      }, 300)
    }
  }

  if(enabled && !extraWrap){
    let count = document.getElementById("executioner-count")

    count.insertAdjacentHTML("afterend", `

<div class="executioner-extra-wrap" id="executioner-extra-wrap">

  <div class="additional-settings-bar" onclick="toggleExecutionerExtras()">
    <span>Additional Settings</span>
    <span class="additional-arrow">▾</span>
  </div>

  <div class="executioner-extra-settings" id="executioner-extra-settings">

    <div class="executioner-settings-card">

  <div class="executioner-setting-row">
    <span class="executioner-setting-label">Can target Jester or Mafia?</span>

    <select class="executioner-setting-select" onchange="setExecutionerTargetRule(this.value)">
      <option value="neither" ${state.executionerTargetRule === "neither" ? "selected" : ""}>Neither</option>
      <option value="mafia" ${state.executionerTargetRule === "mafia" ? "selected" : ""}>Mafia</option>
      <option value="jester" ${state.executionerTargetRule === "jester" ? "selected" : ""}>Jester</option>
      <option value="both" ${state.executionerTargetRule === "both" ? "selected" : ""}>Both</option>
    </select>
  </div>

  <div class="executioner-setting-divider"></div>

  <div class="executioner-setting-row">
    <span class="executioner-setting-label">Sheriff sees Executioner as</span>

    <select class="executioner-setting-select" onchange="setSheriffExecutionerResult(this.value)">
      <option value="innocent" ${state.sheriffExecutionerResult === "innocent" ? "selected" : ""}>Innocent</option>
      <option value="not_innocent" ${state.sheriffExecutionerResult === "not_innocent" ? "selected" : ""}>Not Innocent</option>
      <option value="exact" ${state.sheriffExecutionerResult === "exact" ? "selected" : ""}>Exact Role</option>
    </select>
  </div>

  <div class="executioner-setting-divider"></div>

  <div class="executioner-setting-row">
    <span class="executioner-setting-label">Can win while dead</span>

    <label class="switch">
      <input type="checkbox"
        ${state.executionerWinIfDead ? "checked" : ""}
        onchange="toggleExecutionerWinIfDead(this.checked)">
      <span class="slider"></span>
    </label>
  </div>

</div>

`)

    requestAnimationFrame(() => {
      let inserted = document.getElementById("executioner-extra-wrap")
      if(inserted){
        inserted.classList.add("show")
      }
    })
  }
}

if(role === "spirit" && !enabled) state.spiritExtraOpen = false
if(role === "framer" && !enabled) state.framerExtraOpen = false
if(role === "doctor" && !enabled) state.doctorExtraOpen = false
if(role === "jester" && !enabled) state.jesterExtraOpen = false
if(role === "sheriff" && !enabled) state.sheriffExtraOpen = false
if(role === "mayor" && !enabled) state.mayorExtraOpen = false
if(role === "executioner" && !enabled) state.executionerExtraOpen = false

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

window.toggleFramerExtras = function(){

state.framerExtraOpen = !state.framerExtraOpen

let panel = document.getElementById("framer-extra-settings")
let arrow = document.querySelector("#framer-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.framerExtraOpen)
}

if(arrow){
arrow.style.transform = state.framerExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

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

window.toggleSheriffExtras = function(){

state.sheriffExtraOpen = !state.sheriffExtraOpen

let panel = document.getElementById("sheriff-extra-settings")
let arrow = document.querySelector("#sheriff-extra-wrap .additional-arrow")

if(panel){
panel.classList.toggle("show", state.sheriffExtraOpen)
}

if(arrow){
arrow.style.transform = state.sheriffExtraOpen ? "rotate(180deg)" : "rotate(0deg)"
}

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

let mafia = state.mafiaCountOverride || mafiaCount(players.length)
mafia = Math.min(mafia, maxAllowedMafia(players.length))

for(let i=0;i<mafia;i++){
pool.push("mafia")
}

["doctor","sheriff","jester","executioner","mayor","spirit","framer"].forEach(role=>{

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

window.confirmStartGame = function(){

state.gameStarted = true

assignRoles()

revealIndex = 0

showRoleReveal()

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
  let mafiaPlayers = state.players.filter(p => p.role === "mafia")

  if(!mafiaPlayers.length) return null

  let index = state.mafiaLeaderRotationIndex % mafiaPlayers.length
  return mafiaPlayers[index].name
}

function revealRole(){

let player = state.players[revealIndex]
let color = roleColors[player.role] || "white"
let role = roles[player.role]
let extraInfo = ""

if(player.role === "mafia" && state.mafiaKillMethod === "leader"){
  let leaderName = state.players.find(p => p.role === "mafia") ? getInitialMafiaLeaderName() : null

  if(leaderName){
    extraInfo += `
      <div class="framer-target-box">
        <div class="framer-target-label">Night 1 Leader</div>
        <div class="framer-target-name">
          ${leaderName}${leaderName === player.name ? " (You)" : ""}
        </div>
      </div>
    `
  }
}

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

if(player.role === "mafia" && state.mafiaKillMethod === "leader" && player.name === state.currentMafiaLeader){
  extraInfo += `
    <div class="framer-target-box">
      <div class="framer-target-label">Tonight</div>
      <div class="framer-target-name">You are the Mafia Leader</div>
    </div>
  `
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


window.applyPreset = function(preset){

state.doctorExtraOpen = false
state.sheriffExtraOpen = false

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

state.mafiaCountOverride = 0
state.revealRolesOnElimination = "none"
}

resetPresetRoles()

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

state.mafiaCountOverride = 0
state.revealRolesOnElimination = "death_and_vote"
}

resetPresetRoles()

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

state.mafiaCountOverride = 0
state.revealRolesOnElimination = "death_and_vote"
}

saveSettingsToStorage()
showSettings()

}

function saveSettingsToStorage(){

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