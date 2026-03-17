import { state, addLogEntry, resetGameTracking } from "./state.js"
import { roles } from "../core/roles.js"
import { shuffle, mafiaCount } from "../core/utils.js"
import { roleColors, roleDisplayName } from "../core/gameData.js"
import { maxAllowedMafia, getResolvedMafiaCount } from "../core/setupLogic.js"
import { assignRolesToPlayers } from "../core/roleAssignment.js"
import { render } from "./ui.js"
import {
  startNight,
  startVoting,
  nextNightTurn,
  revealNightRole,
  performNightAction,
  showVoteOptions,
  castVote
} from "./phases.js"

window.updateRoleCount = function(role,value){

state.roleCounts[role] = Number(value)

localStorage.setItem(
"mafiaRoleCounts",
JSON.stringify(state.roleCounts)
)

}

function showInfo(){
  const modal = document.getElementById("infoModal")

  const townRoles = ["villager", "doctor", "sheriff", "mayor", "spirit", "vigilante", "priest"]
  const neutralRoles = ["jester", "executioner", "schrodingers_cat"]
  const mafiaRoles = ["mafia", "framer", "traitor"]

  const allRoles = [...townRoles, ...neutralRoles, ...mafiaRoles]

  function roleTeam(role){
    if(mafiaRoles.includes(role)) return "Mafia"
    if(neutralRoles.includes(role)) return "Neutral"
    return "Town"
  }

  function isRoleActive(role){
    if(role === "villager" || role === "mafia") return true
    return !!state.rolesEnabled[role]
  }

  function roleStatus(role){
    if(role === "villager" || role === "mafia") return "Core"
    if(state.rolesEnabled[role]){
      const count = state.roleCounts[role] || 1
      return `Enabled · Up to ${count}`
    }
    return "Disabled"
  }

  function roleTags(role){
    const tags = []

    if(role === "villager") tags.push("Town", "Core")
    if(role === "mafia") tags.push("Mafia", "Killing", "Core")
    if(role === "doctor") tags.push("Town", "Protection")
    if(role === "sheriff") tags.push("Town", "Info")
    if(role === "mayor") tags.push("Town", "Voting")
    if(role === "spirit") tags.push("Town", "Info", "After Death")
    if(role === "vigilante") tags.push("Town", "Killing", "Chaos")
    if(role === "priest") tags.push("Town", "Protection", "Rare")
    if(role === "jester") tags.push("Neutral", "Chaos", "Win Condition")
    if(role === "executioner") tags.push("Neutral", "Target", "Win Condition")
    if(role === "schrodingers_cat") tags.push("Neutral", "Chaos", "Conversion")
    if(role === "framer") tags.push("Mafia", "Deception", "Info")
    if(role === "traitor") tags.push("Mafia", "Hidden")

    return tags
  }

  function roleRulesText(role){
    if(role === "mafia"){
      return `
        Chooses one player to eliminate each night.
        ${
          state.mafiaKillMethod === "leader"
            ? `The kill is chosen by a rotating leader.`
            : `The mafia vote on who to kill.`
        }
        ${
          state.mafiaKnowsFirstLeader
            ? `The mafia know who the first leader is.`
            : `The first leader is hidden.`
        }
      `
    }

    if(role === "villager"){
      return `
        No special power. Your job is to discuss, vote, and figure out who the mafia are before they take over the town.
      `
    }

    if(role === "doctor"){
      return `
        Protects one player each night from being killed.
        ${
          state.doctorRevealSave
            ? `If a save happens, the saved player is revealed.`
            : `Saves stay hidden from the town.`
        }
      `
    }

    if(role === "sheriff"){
      return `
        Investigates one player each night.
        ${
          state.sheriffExactReveal
            ? `Gets the exact role as the result.`
            : `Gets an innocent / not innocent style result instead of the exact role.`
        }
      `
    }

    if(role === "mayor"){
      return `
        Has stronger voting power during the day.
        Current setting: ${state.mayorVotePower} votes.
      `
    }

    if(role === "spirit"){
      return `
        After dying, can reveal ${
          state.spiritRevealType === "team" ? "a player's team" : "a player's exact role"
        }.
        Activates on ${
          state.spiritActivation === "any_death" ? "any death" : "night deaths only"
        }.
        ${
          state.spiritCanSkipReveal
            ? `Can skip the reveal.`
            : `Must choose someone to reveal.`
        }
      `
    }

    if(role === "vigilante"){
      return `
        Chooses someone to attack at night.
        ${
          state.vigilanteCanKillNeutrals
            ? `Can kill neutral roles.`
            : `Cannot kill neutral roles.`
        }
        Wrong target outcome: ${
          state.vigilanteWrongKillOutcome === "both_die"
            ? "both die"
            : state.vigilanteWrongKillOutcome === "only_vigilante_dies"
              ? "only Vigilante dies"
              : "only target dies"
        }.
      `
    }

    if(role === "priest"){
      return `
        Can call upon the Holy Spirit to shield the whole town from attacks.
        Uses per game: ${state.priestUsesPerGame}.
      `
    }

    if(role === "jester"){
      return `
        Wins if voted out by the town.
        Sheriff sees Jester as ${
          state.sheriffJesterResult === "exact"
            ? "the exact role"
            : state.sheriffJesterResult === "innocent"
              ? "innocent"
              : "not innocent"
        }.
        ${
          state.jesterWinIfVigilanteKilled
            ? `Also wins if killed by the Vigilante.`
            : `Does not win if killed by the Vigilante.`
        }
      `
    }

    if(role === "executioner"){
      return `
        Wins by getting their assigned target eliminated.
        Can target ${
          state.executionerTargetRule === "both"
            ? "town, mafia, or jester"
            : state.executionerTargetRule === "mafia"
              ? "town or mafia"
              : state.executionerTargetRule === "jester"
                ? "town or jester"
                : "town only"
        }.
        ${
          state.executionerWinIfDead
            ? `Can still win while dead.`
            : `Must stay alive to win.`
        }
        ${
          state.executionerWinIfVigilanteKillsTarget
            ? `Can also win if the Vigilante kills their target.`
            : `Does not win if the Vigilante kills their target.`
        }
        After the target dies, becomes ${
          state.executionerBecomes === "jester"
            ? "Jester"
            : state.executionerBecomes === "traitor"
              ? "Traitor"
              : "Villager"
        }.
      `
    }

    if(role === "schrodingers_cat"){
      return `
        If attacked by the Mafia, joins the Mafia instead of dying.
        If attacked by the Vigilante, joins the Town instead of dying.
        This conversion happens secretly and is only revealed privately.
      `
    }

    if(role === "framer"){
      return `
        Frames a player so they appear suspicious to the Sheriff.
        ${
          state.framerKnowsSuccess
            ? `The Framer learns if the frame worked.`
            : `The Framer does not learn if the frame worked.`
        }
        ${
          state.framerKnowsMafia
            ? `The Framer knows who the mafia are.`
            : `The Framer does not know who the mafia are.`
        }
        ${
          state.mafiaKnowsFramer
            ? `The mafia know who the Framer is.`
            : `The mafia do not know who the Framer is.`
        }
      `
    }

    if(role === "traitor"){
      return `
        A hidden ally of the mafia. Works with the mafia team and helps them reach their win condition.
      `
    }

    return roles[role]?.description || "No description available."
  }

  function renderTag(tag){
    const lower = tag.toLowerCase()
    let cls = "rules-tag"

    if(lower === "town") cls += " rules-tag-town"
    else if(lower === "mafia") cls += " rules-tag-mafia"
    else if(lower === "neutral") cls += " rules-tag-neutral"
    else if(lower === "info") cls += " rules-tag-info"
    else if(lower === "killing") cls += " rules-tag-killing"
    else if(lower === "protection") cls += " rules-tag-protection"
    else if(lower === "chaos") cls += " rules-tag-chaos"
    else if(lower === "voting") cls += " rules-tag-voting"
    else if(lower === "conversion") cls += " rules-tag-conversion"
    else cls += " rules-tag-generic"

    return `<span class="${cls}">${tag}</span>`
  }

  function renderRoleCard(role){
    const color = roleColors[role] || "#ffffff"
    const enabled = isRoleActive(role)

    return `
      <div
        class="rules-role-card ${enabled ? "rules-role-enabled" : "rules-role-disabled"}"
        data-role-card="${role}"
        data-role-name="${roleDisplayName(role).toLowerCase()}"
        data-role-team="${roleTeam(role).toLowerCase()}"
        data-role-tags="${roleTags(role).join(" ").toLowerCase()}"
        data-role-active="${enabled ? "true" : "false"}"
        style="--rules-role-color:${color};"
      >
        <button
          class="rules-role-header"
          onclick="window.toggleInfoRole('${role}')"
          type="button"
        >
          <div class="rules-role-header-main">
            <div class="rules-role-name" style="color:${color}">
              ${roleDisplayName(role)}
            </div>
            <div class="rules-role-team">
              ${roleTeam(role)}
            </div>

            <div class="rules-role-tags-row">
              ${roleTags(role).map(renderTag).join("")}
            </div>
          </div>

          <div class="rules-role-header-side">
            <div class="rules-role-status">
              ${roleStatus(role)}
            </div>
            <div class="rules-role-arrow" id="rules-arrow-${role}">▾</div>
          </div>
        </button>

        <div class="rules-role-panel" id="rules-panel-${role}">
          <div class="rules-role-panel-inner">
            <div class="rules-role-description">
              ${roleRulesText(role)}
            </div>
          </div>
        </div>
      </div>
    `
  }

  function buildSection(title, rolesList, className){
    return `
      <div class="rules-section ${className}" data-rules-section="${title.toLowerCase()}">
        <div class="rules-section-bar">
          <div>
            <div class="rules-section-kicker">Role Group</div>
            <h3 class="rules-section-title">${title}</h3>
          </div>
          <div class="rules-section-count" id="rules-count-${title.toLowerCase()}">0</div>
        </div>

        <div class="rules-role-list">
          ${rolesList.map(renderRoleCard).join("")}
        </div>
      </div>
    `
  }

  const content = `
    <div class="modal-content rules-modal-shell">
      <div class="settings-header">
        <div class="settings-header-main">
          <div>
            <h2 class="settings-title-modern">Game Rules</h2>
            <div class="settings-subtitle-modern">
              Search, filter, and expand the roles in your current setup.
            </div>
          </div>
        </div>
      </div>

      <div class="settings-scroll">

        <div class="rules-hero">
          <div class="rules-kicker">Reference</div>
          <h2 class="rules-title">Role Guide</h2>
          <div class="rules-subtitle">
            Tap any card to expand it. Use search or filters to quickly find a role.
          </div>
        </div>

        <div class="rules-toolbar">
          <div class="rules-search-wrap">
            <input
              id="rulesSearchInput"
              class="rules-search-input"
              type="text"
              placeholder="Search roles, teams, or tags..."
              oninput="window.filterInfoRoles()"
            >
          </div>

          <div class="rules-toggle-row">
            <button
              type="button"
              id="rulesShowActiveBtn"
              class="rules-filter-btn rules-filter-btn-active"
              onclick="window.setInfoRoleView('active')"
            >
              Only Active
            </button>

            <button
              type="button"
              id="rulesShowAllBtn"
              class="rules-filter-btn"
              onclick="window.setInfoRoleView('all')"
            >
              Show All
            </button>
          </div>
        </div>

        <div class="rules-toolbar rules-toolbar-secondary">
          <div class="rules-chip-row">
            <button type="button" class="rules-chip active" data-filter="all" onclick="window.setInfoQuickFilter('all')">All</button>
            <button type="button" class="rules-chip" data-filter="town" onclick="window.setInfoQuickFilter('town')">Town</button>
            <button type="button" class="rules-chip" data-filter="neutral" onclick="window.setInfoQuickFilter('neutral')">Neutral</button>
            <button type="button" class="rules-chip" data-filter="mafia" onclick="window.setInfoQuickFilter('mafia')">Mafia</button>
            <button type="button" class="rules-chip" data-filter="info" onclick="window.setInfoQuickFilter('info')">Info</button>
            <button type="button" class="rules-chip" data-filter="killing" onclick="window.setInfoQuickFilter('killing')">Killing</button>
            <button type="button" class="rules-chip" data-filter="protection" onclick="window.setInfoQuickFilter('protection')">Protection</button>
            <button type="button" class="rules-chip" data-filter="chaos" onclick="window.setInfoQuickFilter('chaos')">Chaos</button>
          </div>
        </div>

        ${buildSection("Town", townRoles, "rules-section-town")}
        ${buildSection("Neutral", neutralRoles, "rules-section-neutral")}
        ${buildSection("Mafia", mafiaRoles, "rules-section-mafia")}

        <div id="rulesEmptyState" class="rules-empty-state hidden">
          <div class="rules-empty-icon">🔎</div>
          <div class="rules-empty-title">No roles found</div>
          <div class="rules-empty-text">
            Try a different search or filter.
          </div>
        </div>

      </div>

      <div class="settings-footer">
        <button class="close-settings-btn" onclick="closeInfo()">Close</button>
      </div>
    </div>
  `

  if(modal.classList.contains("show")){
    swapModalContent(content, initInfoModal)
  }else{
    openModal(content, initInfoModal)
  }
}

window.infoRoleViewMode = "active"
window.infoQuickFilter = "all"

function initInfoModal(){
  window.infoRoleViewMode = "active"
  window.infoQuickFilter = "all"
  window.filterInfoRoles()
}

window.toggleInfoRole = function(role){
  const panel = document.getElementById(`rules-panel-${role}`)
  const arrow = document.getElementById(`rules-arrow-${role}`)

  if(!panel || !arrow) return

  const isOpen = panel.classList.contains("show")

  if(isOpen){
    panel.classList.remove("show")
    arrow.style.transform = "rotate(0deg)"
  }else{
    panel.classList.add("show")
    arrow.style.transform = "rotate(180deg)"
  }
}

window.setInfoRoleView = function(mode){
  window.infoRoleViewMode = mode

  const activeBtn = document.getElementById("rulesShowActiveBtn")
  const allBtn = document.getElementById("rulesShowAllBtn")

  if(activeBtn) activeBtn.classList.toggle("rules-filter-btn-active", mode === "active")
  if(allBtn) allBtn.classList.toggle("rules-filter-btn-active", mode === "all")

  window.filterInfoRoles()
}

window.setInfoQuickFilter = function(filter){
  window.infoQuickFilter = filter

  document.querySelectorAll(".rules-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.filter === filter)
  })

  window.filterInfoRoles()
}

window.filterInfoRoles = function(){
  const searchInput = document.getElementById("rulesSearchInput")
  const search = (searchInput?.value || "").trim().toLowerCase()

  const cards = [...document.querySelectorAll("[data-role-card]")]
  const sections = [...document.querySelectorAll("[data-rules-section]")]
  const emptyState = document.getElementById("rulesEmptyState")

  let visibleCount = 0

  cards.forEach(card => {
    const name = card.dataset.roleName || ""
    const team = card.dataset.roleTeam || ""
    const tags = card.dataset.roleTags || ""
    const active = card.dataset.roleActive === "true"

    const matchesSearch =
      !search ||
      name.includes(search) ||
      team.includes(search) ||
      tags.includes(search)

    const matchesMode =
      window.infoRoleViewMode === "all" ? true : active

    const matchesQuick =
      window.infoQuickFilter === "all"
        ? true
        : team.includes(window.infoQuickFilter) || tags.includes(window.infoQuickFilter)

    const show = matchesSearch && matchesMode && matchesQuick

    card.classList.toggle("hidden", !show)

    if(show) visibleCount++
  })

  sections.forEach(section => {
    const visibleCards = section.querySelectorAll("[data-role-card]:not(.hidden)")
    const countEl = section.querySelector(".rules-section-count")

    if(countEl){
      countEl.textContent = visibleCards.length
    }

    section.classList.toggle("hidden", visibleCards.length === 0)
  })

  if(emptyState){
    emptyState.classList.toggle("hidden", visibleCount !== 0)
  }
}

window.toggleInfoRole = function(role){
  const panel = document.getElementById(`rules-panel-${role}`)
  const arrow = document.getElementById(`rules-arrow-${role}`)

  if(!panel || !arrow) return

  const isOpen = panel.classList.contains("show")

  if(isOpen){
    panel.classList.remove("show")
    arrow.style.transform = "rotate(0deg)"
  }else{
    panel.classList.add("show")
    arrow.style.transform = "rotate(180deg)"
  }
}

window.toggleHostMode = function(enabled){
  state.hostMode = enabled

  localStorage.setItem(
    "mafiaHostMode",
    JSON.stringify(enabled)
  )
  refreshPregameSummaryIfOpen()
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
vigilante: false,
priest: false,
schrodingers_cat: false,
traitor: false,
}

state.roleWeights = {
doctor: 100,
sheriff: 100,
jester: 100,
executioner: 100,
mayor: 100,
spirit: 100,
framer: 100,
vigilante: 100,
priest: 100,
schrodingers_cat: 100,
traitor: 100,
}

state.roleCounts = {
doctor: 1,
sheriff: 1,
jester: 1,
executioner: 1,
mayor: 1,
spirit: 1,
framer: 1,
vigilante: 1,
priest: 1,
schrodingers_cat: 1,
traitor: 1,
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
state.executionerBecomes = "jester"

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
state.priestShieldActive = false
state.priestBlockedAttacks = []
state.priestPublicShield = false
state.priestUsesPerGame = 1

localStorage.setItem("mafiaExecutionerBecomes", JSON.stringify(state.executionerBecomes))
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
refreshPregameSummaryIfOpen()
}

window.setSpiritActivation = function(value){

state.spiritActivation = value

localStorage.setItem(
"mafiaSpiritActivation",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

window.toggleSpiritCanSkipReveal = function(enabled){

state.spiritCanSkipReveal = enabled

localStorage.setItem(
"mafiaSpiritCanSkipReveal",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
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

  const mafiaRoles = ["framer", "traitor"]
  const townRoles = ["doctor", "sheriff", "mayor", "spirit", "vigilante", "priest"]
  const neutralRoles = ["jester", "executioner", "schrodingers_cat"]

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

        <div class="settings-field">
          <label class="settings-field-label">After target dies, becomes</label>
          <select class="settings-modern-select" onchange="setExecutionerBecomes(this.value)">
            <option value="jester" ${state.executionerBecomes === "jester" ? "selected" : ""}>Jester</option>
            <option value="villager" ${state.executionerBecomes === "villager" ? "selected" : ""}>Villager</option>
            <option value="traitor" ${state.executionerBecomes === "traitor" ? "selected" : ""}>Traitor</option>
          </select>
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

    if(role === "priest"){
  advancedHTML = `
    <div class="settings-field">
      <label class="settings-field-label">Holy Spirit uses per game</label>
      <select class="settings-modern-select"
        onchange="setPriestUsesPerGame(this.value)">
        <option value="1" ${state.priestUsesPerGame == 1 ? "selected" : ""}>1 use</option>
        <option value="2" ${state.priestUsesPerGame == 2 ? "selected" : ""}>2 uses</option>
        <option value="3" ${state.priestUsesPerGame == 3 ? "selected" : ""}>3 uses</option>
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
    <div class="settings-role-panel-inner">
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
refreshPregameSummaryIfOpen()
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
refreshPregameSummaryIfOpen()
}

window.showSettings = showSettings

window.toggleRole = function(role, enabled){
  state.rolesEnabled[role] = enabled
refreshPregameSummaryIfOpen()
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

      <div class="settings-field">
        <label class="settings-field-label">After target dies, becomes</label>
        <select class="settings-modern-select" onchange="setExecutionerBecomes(this.value)">
          <option value="jester" ${state.executionerBecomes === "jester" ? "selected" : ""}>Jester</option>
          <option value="villager" ${state.executionerBecomes === "villager" ? "selected" : ""}>Villager</option>
          <option value="traitor" ${state.executionerBecomes === "traitor" ? "selected" : ""}>Traitor</option>
        </select>
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

  if(role === "priest"){
  advancedHTML = `
    <div class="settings-field">
      <label class="settings-field-label">Holy Spirit uses per game</label>
      <select class="settings-modern-select"
        onchange="setPriestUsesPerGame(this.value)">
        <option value="1" ${state.priestUsesPerGame == 1 ? "selected" : ""}>1 use</option>
        <option value="2" ${state.priestUsesPerGame == 2 ? "selected" : ""}>2 uses</option>
        <option value="3" ${state.priestUsesPerGame == 3 ? "selected" : ""}>3 uses</option>
        <option value="4" ${state.priestUsesPerGame == 4 ? "selected" : ""}>4 uses</option>
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

window.setPriestUsesPerGame = function(value){

  state.priestUsesPerGame = Number(value)

  localStorage.setItem(
    "mafiaPriestUsesPerGame",
    JSON.stringify(state.priestUsesPerGame)
  )
refreshPregameSummaryIfOpen()
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

let savedPriestUses = localStorage.getItem("mafiaPriestUsesPerGame")

let savedExecutionerBecomes = localStorage.getItem("mafiaExecutionerBecomes")

if(savedExecutionerBecomes){
state.executionerBecomes = JSON.parse(savedExecutionerBecomes)
}

if(savedPriestUses){
  state.priestUsesPerGame = JSON.parse(savedPriestUses)
}

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
refreshPregameSummaryIfOpen()
}

window.toggleFramerKnowsSuccess = function(enabled){

state.framerKnowsSuccess = enabled

localStorage.setItem(
"mafiaFramerKnowsSuccess",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
}

window.toggleFramerKnowsMafia = function(enabled){

state.framerKnowsMafia = enabled

localStorage.setItem(
"mafiaFramerKnowsMafia",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
}

window.toggleMafiaKnowsFramer = function(enabled){

state.mafiaKnowsFramer = enabled

localStorage.setItem(
"mafiaMafiaKnowsFramer",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
}

window.setMafiaKillMethod = function(value){

state.mafiaKillMethod = value

localStorage.setItem(
"mafiaKillMethod",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

window.setMayorVotePower = function(value){

state.mayorVotePower = Number(value)

localStorage.setItem(
"mafiaMayorVotePower",
JSON.stringify(state.mayorVotePower)
)
refreshPregameSummaryIfOpen()
}

window.setSheriffExecutionerResult = function(value){

state.sheriffExecutionerResult = value

localStorage.setItem(
"mafiaSheriffExecutionerResult",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

window.setSheriffJesterResult = function(value){

state.sheriffJesterResult = value

localStorage.setItem(
"mafiaSheriffJesterResult",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

window.setRevealRolesOnElimination = function(value){

state.revealRolesOnElimination = value

localStorage.setItem(
"mafiaRevealRolesOnElimination",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

window.toggleExecutionerWinIfDead = function(enabled){

state.executionerWinIfDead = enabled

localStorage.setItem(
"mafiaExecutionerWinIfDead",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
}

window.setExecutionerTargetRule = function(value){

state.executionerTargetRule = value

localStorage.setItem(
"mafiaExecutionerTargetRule",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

window.setExecutionerBecomes = function(value){

state.executionerBecomes = value

localStorage.setItem(
"mafiaExecutionerBecomes",
JSON.stringify(value)
)
refreshPregameSummaryIfOpen()
}

export function setDay() {
    document.body.classList.remove("night", "holy-night", "holy-night-flash");
    document.body.classList.add("day");
}

export function setNight() {
    document.body.classList.remove("day");
    document.body.classList.add("night");
}

window.updateMafiaCountOverride = function(value){

state.mafiaCountOverride = Number(value)

localStorage.setItem(
"mafiaCountOverride",
JSON.stringify(state.mafiaCountOverride)
)

}

window.toggleDoctorReveal = function(enabled){

state.doctorRevealSave = enabled

localStorage.setItem(
"mafiaDoctorReveal",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
}

window.toggleSheriffExactReveal = function(enabled){

state.sheriffExactReveal = enabled

localStorage.setItem(
"mafiaSheriffExactReveal",
JSON.stringify(enabled)
)
refreshPregameSummaryIfOpen()
}

function showHome(){

render(`

<div class="card home-screen-card">

  <div class="home-hero">

    <div class="home-kicker">Party Game</div>

    <h1 class="home-title">
      Juraj's Mafia
    </h1>

    <div class="home-subtitle">
      A social deduction game of deception, accusations, and late-night betrayals.
    </div>

  </div>

  <div class="home-actions">

    <button class="primary-btn" onclick="window.showSetup()">
      Start Game
    </button>
<div class="button-row">
    <button class="skip-btn" onclick="window.showInfo()">
      Game Rules
    </button>

    <button class="skip-btn" onclick="window.showSettings()">
      Settings
    </button>
</div>
  </div>

</div>

`)

}

function showSetup(){
  renderPlayerSetup()
}

function renderPlayerSetup(){
  let list = ""

  state.players.forEach((p, i) => {
    list += `
      <li class="setup-player-card">
        <div class="setup-player-left">
          <div class="setup-player-avatar">👤</div>

          <div class="setup-player-input-wrap">
            <div class="setup-player-label">Player ${i + 1}</div>
            <input
              class="setup-player-input"
              value="${p.name}"
              oninput="window.renamePlayer(${i}, this.value)"
              placeholder="Enter player name"
            >
          </div>
        </div>

        <button class="setup-remove-btn" onclick="window.removePlayer(${i})" aria-label="Remove player">
          ✕
        </button>
      </li>
    `
  })

  const playerCount = state.players.length

  render(`
    <div class="card setup-screen-card">

      <div class="setup-hero">
        <div class="setup-kicker">Game Setup</div>
        <h2 class="setup-title">Add Players</h2>
        <div class="setup-subtitle">
          Build your lobby, rename players, and get everything ready before the game begins.
        </div>
      </div>

      <div class="setup-stat-row">
        <div class="setup-stat-pill">
          <span class="setup-stat-value">${playerCount}</span>
          <span class="setup-stat-text">Player${playerCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div class="setup-list-panel">
        ${
          state.players.length
            ? `
              <ul class="setup-player-list">
                ${list}
              </ul>
            `
            : `
              <div class="setup-empty-state">
                <div class="setup-empty-icon">🎭</div>
                <div class="setup-empty-title">No players added yet</div>
                <div class="setup-empty-text">
                  Add your first player to start building the game.
                </div>
              </div>
            `
        }
      </div>

      <div class="setup-actions">
      <div class="button-row">
        <button onclick="window.addPlayer()">Add Player</button>
        <button class="skip-btn" onclick="window.clearPlayers()">Reset Players</button>
        </div>
        <button class="primary-btn" onclick="window.startGame()" ${playerCount < 4 ? "disabled" : ""}>
          Start Game
        </button>
      </div>

      ${
        playerCount < 4
          ? `
            <div class="setup-help-note">
              You need at least <strong>4 players</strong> to start.
            </div>
          `
          : ""
      }

    </div>
  `)
}

window.renamePlayer = function(index, newName){
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

const OPTIONAL_ROLES = [
  "doctor",
  "sheriff",
  "jester",
  "executioner",
  "mayor",
  "spirit",
  "framer",
  "vigilante",
  "priest",
  "schrodingers_cat",
  "traitor"
]

function buildOptionalRolePool(state) {
  const optionalPool = []

  OPTIONAL_ROLES.forEach(role => {
    if (!state.rolesEnabled?.[role]) return

    const weight = state.roleWeights?.[role] || 0
    const max = state.roleCounts?.[role] || 1

    for (let i = 0; i < max; i++) {
      const roll = Math.random() * 100
      if (roll < weight) {
        optionalPool.push(role)
      }
    }
  })

  return shuffle(optionalPool)
}

function getExecutionerPossibleTargets(players, executioner, executionerTargetRule) {
  return players.filter(p => {
    if (p.name === executioner.name) return false
    if (p.role === "executioner") return false

    if (executionerTargetRule === "neither") {
      return p.role !== "mafia" && p.role !== "jester"
    }

    if (executionerTargetRule === "mafia") {
      return p.role !== "jester"
    }

    if (executionerTargetRule === "jester") {
      return p.role !== "mafia"
    }

    return true
  })
}

export function assignRolesToPlayers(state) {
  const players = state.players
  const mafiaCount = getResolvedMafiaCount(players.length, state.mafiaCountOverride)

  const guaranteedRoles = []
  for (let i = 0; i < mafiaCount; i++) {
    guaranteedRoles.push("mafia")
  }

  const optionalPool = buildOptionalRolePool(state)

  const slotsLeft = Math.max(0, players.length - guaranteedRoles.length)

  const finalPool = [
    ...guaranteedRoles,
    ...optionalPool.slice(0, slotsLeft)
  ]

  while (finalPool.length < players.length) {
    finalPool.push("villager")
  }

  shuffle(finalPool)

  players.forEach((player, index) => {
    player.role = finalPool[index]
    player.catAlignment = null
    player.wasExecutioner = false
    player.executionerConvertedTo = null
    player.alive = true
  })

  players.forEach(player => {
    if (player.role === "priest") {
      player.priestUsesLeft = state.priestUsesPerGame
    } else {
      delete player.priestUsesLeft
    }
  })

  const mafiaPlayers = players
    .filter(player => player.role === "mafia")
    .map(player => player.name)

  state.mafiaLeaderOrder = shuffle([...mafiaPlayers])
  state.mafiaLeaderIndex = 0
  state.currentMafiaLeader = state.mafiaLeaderOrder[0] || null

  state.executionerTargets = {}

  const executioners = players.filter(player => player.role === "executioner")

  executioners.forEach(executioner => {
    const possibleTargets = getExecutionerPossibleTargets(
      players,
      executioner,
      state.executionerTargetRule
    )

    if (possibleTargets.length) {
      const target =
        possibleTargets[Math.floor(Math.random() * possibleTargets.length)]

      state.executionerTargets[executioner.name] = target.name
    }
  })

  return state
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
  let mafia = getResolvedMafiaCount(playerCount, state.mafiaCountOverride)

  let warnings = getBalanceWarnings()

  const townRoles = ["doctor", "sheriff", "mayor", "spirit", "vigilante", "priest"]
  const neutralRoles = ["jester", "executioner", "schrodingers_cat"]
  const mafiaRoles = ["framer", "traitor"]

  function isRoleEnabled(role){
    return !!state.rolesEnabled[role]
  }

function getEnabledSpecialRoleCopies(rolesArray){
  return rolesArray.reduce((total, role) => {
    if(!state.rolesEnabled[role]) return total
    return total + (state.roleCounts[role] || 1)
  }, 0)
}

function getVillagerCountEstimate(){
  const enabledCopies =
    getEnabledSpecialRoleCopies(townRoles) +
    getEnabledSpecialRoleCopies(neutralRoles) +
    getEnabledSpecialRoleCopies(mafiaRoles)

  return Math.max(0, playerCount - mafia - enabledCopies)
}

function buildCoreRoleCard(role, count, team, description){
  const color = roleColors[role] || "#fff"

  return `
    <div class="pregame-role-card" style="--pregame-role-color:${color};">
      <div class="pregame-role-top">
        <div class="pregame-role-main">
          <div class="pregame-role-name" style="color:${color};">
            ${roleDisplayName(role)}
          </div>
          <div class="pregame-role-count">
            ${count}
          </div>
        </div>
      </div>

      <div class="pregame-role-tags">
        <span class="pregame-role-tag" style="
          color:${color};
          border-color:${color}33;
          background:${color}14;
        ">
          ${team}
        </span>
      </div>

      <p class="pregame-note" style="margin-top:12px;">
        ${description}
      </p>
    </div>
  `
}

  function buildRoleCard(role){
    let color = roleColors[role] || "white"
    let count = state.roleCounts[role] || 1
    let extras = []

    if(role === "doctor" && state.doctorRevealSave){
      extras.push("reveals saved player")
    }

    if(role === "priest"){
      extras.push("blocks all kills for the night")
      extras.push(`${state.priestUsesPerGame} use${state.priestUsesPerGame === 1 ? "" : "s"}`)
    }

    if(role === "jester"){
      let jesterRuleText = {
        innocent: "innocent to Sheriff",
        not_innocent: "not innocent to Sheriff",
        exact: "revealed exactly by Sheriff"
      }

      extras.push(jesterRuleText[state.sheriffJesterResult])

      if(state.jesterWinIfVigilanteKilled){
        extras.push("wins if Vigilante kills them")
      }
    }

    if(role === "vigilante"){
      extras.push(
        state.vigilanteCanKillNeutrals
          ? "can kill neutrals"
          : "cannot kill neutrals"
      )

      let wrongKillText = {
        both_die: "wrong target: both die",
        only_vigilante_dies: "wrong target: only Vigilante dies",
        only_target_dies: "wrong target: only target dies"
      }

      extras.push(wrongKillText[state.vigilanteWrongKillOutcome])
    }

    if(role === "mayor"){
      extras.push(`${state.mayorVotePower} vote power`)
    }

    if(role === "sheriff"){
      extras.push(
        state.sheriffExactReveal
          ? "exact role reveal"
          : "innocent / not innocent"
      )
    }

    if(role === "spirit"){
      extras.push(
        state.spiritRevealType === "exact" ? "exact reveal" : "team reveal"
      )
      extras.push(
        state.spiritActivation === "night_only" ? "night deaths only" : "any death"
      )

      if(state.spiritCanSkipReveal){
        extras.push("can skip reveal")
      }
    }

    if(role === "framer"){
      if(state.framerKnowsSuccess) extras.push("knows if frame worked")
      if(state.framerKnowsMafia) extras.push("knows mafia")
      if(state.mafiaKnowsFramer) extras.push("mafia knows framer")
    }

    if(role === "executioner"){
      let executionerRuleText = {
        neither: "targets only town",
        mafia: "can target mafia",
        jester: "can target jester",
        both: "can target mafia or jester"
      }

      let executionerSheriffText = {
        innocent: "innocent to Sheriff",
        not_innocent: "not innocent to Sheriff",
        exact: "revealed exactly by Sheriff"
      }

      let executionerBecomeText = {
        jester: "becomes Jester after target dies",
        villager: "becomes Villager after target dies",
        traitor: "becomes Traitor after target dies"
      }

      extras.push(executionerBecomeText[state.executionerBecomes]) 
      extras.push(executionerRuleText[state.executionerTargetRule])
      extras.push(executionerSheriffText[state.sheriffExecutionerResult])

      if(state.executionerWinIfDead){
        extras.push("wins even if dead")
      }

      if(state.executionerWinIfVigilanteKillsTarget){
        extras.push("wins if Vigilante kills target")
      }
    }

    return `
      <div class="pregame-role-card" style="--pregame-role-color:${color};">
        <div class="pregame-role-top">
          <div class="pregame-role-main">
            <div class="pregame-role-name" style="color:${color};">
              ${roleDisplayName(role)}
            </div>
            <div class="pregame-role-count">
              Up to ${count}
            </div>
          </div>
        </div>

        ${
          extras.length
            ? `
              <div class="pregame-role-tags">
                ${extras.map(extra => `
                  <span class="pregame-role-tag" style="
                    color:${color};
                    border-color:${color}33;
                    background:${color}14;
                  ">
                    ${extra}
                  </span>
                `).join("")}
              </div>
            `
            : ""
        }
      </div>
    `
  }

  function buildRoleSection(title, kicker, className, rolesArray){
    const enabled = rolesArray.filter(isRoleEnabled)

    if(!enabled.length){
      return ""
    }

    return `
      <div class="pregame-team-card ${className}">
        <div class="pregame-team-header">
          <div>
            <div class="pregame-team-kicker">${kicker}</div>
            <h3 class="pregame-team-title">${title}</h3>
          </div>
          <div class="pregame-team-count">${enabled.length}</div>
        </div>

        <div class="pregame-role-grid">
          ${enabled.map(buildRoleCard).join("")}
        </div>
      </div>
    `
  }

  const enabledSpecialRoleTypes =
  townRoles.filter(isRoleEnabled).length +
  neutralRoles.filter(isRoleEnabled).length +
  mafiaRoles.filter(isRoleEnabled).length

  let warningsHTML = warnings.length
    ? `
      <div class="pregame-panel pregame-warning-panel">
        <div class="pregame-section-kicker">Balance Check</div>
        <h3 class="pregame-section-title">Setup Warnings</h3>

        <div class="pregame-warning-list">
          ${warnings.map(w => `
            <div class="pregame-warning-item">
              <span class="pregame-warning-dot">!</span>
              <span>${w}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `
    : `
      <div class="pregame-panel pregame-success-panel">
        <div class="pregame-section-kicker">Balance Check</div>
        <h3 class="pregame-section-title">Setup Looks Balanced</h3>
        <p class="pregame-note">Everything looks good to start.</p>
      </div>
    `

  const villagerCount = getVillagerCountEstimate()

let townSectionCards = `
  ${buildCoreRoleCard("villager", `${villagerCount} guaranteed fill`, "Town", "No special power. Help find the mafia.")}
  ${townRoles.filter(isRoleEnabled).map(buildRoleCard).join("")}
`

let neutralSectionCards = `
  ${neutralRoles.filter(isRoleEnabled).map(buildRoleCard).join("")}
`

let mafiaSectionCards = `
  ${buildCoreRoleCard("mafia", `${mafia} guaranteed`, "Mafia", "Chooses one player to eliminate each night.")}
  ${mafiaRoles.filter(isRoleEnabled).map(buildRoleCard).join("")}
`

let roleSectionsHTML = `
  <div class="pregame-team-card pregame-team-town">
    <div class="pregame-team-header">
      <div>
        <div class="pregame-team-kicker">Town</div>
        <h3 class="pregame-team-title">Town Roles</h3>
      </div>
      <div class="pregame-team-count">${1 + townRoles.filter(isRoleEnabled).length}</div>
    </div>

    <div class="pregame-role-grid">
      ${townSectionCards}
    </div>
  </div>

  ${
    neutralRoles.some(isRoleEnabled)
      ? `
        <div class="pregame-team-card pregame-team-neutral">
          <div class="pregame-team-header">
            <div>
              <div class="pregame-team-kicker">Neutral</div>
              <h3 class="pregame-team-title">Neutral Roles</h3>
            </div>
            <div class="pregame-team-count">${neutralRoles.filter(isRoleEnabled).length}</div>
          </div>

          <div class="pregame-role-grid">
            ${neutralSectionCards}
          </div>
        </div>
      `
      : ""
  }

  <div class="pregame-team-card pregame-team-mafia">
    <div class="pregame-team-header">
      <div>
        <div class="pregame-team-kicker">Mafia</div>
        <h3 class="pregame-team-title">Mafia Roles</h3>
      </div>
      <div class="pregame-team-count">${1 + mafiaRoles.filter(isRoleEnabled).length}</div>
    </div>

    <div class="pregame-role-grid">
      ${mafiaSectionCards}
    </div>
  </div>
`

  render(`
    <div class="card pregame-summary-card">

      <div class="pregame-hero">
        <div class="pregame-kicker">Game Setup</div>
        <h2 class="pregame-title">Pre-Game Summary</h2>
        <div class="pregame-subtitle">
          Review your setup, confirm the balance, and make sure everything looks right before roles are assigned.
        </div>
      </div>

      <div class="pregame-stat-grid">
        <div class="pregame-stat">
          <div class="pregame-stat-value">${playerCount}</div>
          <div class="pregame-stat-label">Players</div>
        </div>

        <div class="pregame-stat">
          <div class="pregame-stat-value">${mafia}</div>
          <div class="pregame-stat-label">Mafia</div>
        </div>

        <div class="pregame-stat">
  <div class="pregame-stat-value">${enabledSpecialRoleTypes + 2}</div>
  <div class="pregame-stat-label">Role Types</div>
</div>

        <div class="pregame-stat">
          <div class="pregame-stat-value">${warnings.length}</div>
          <div class="pregame-stat-label">Warnings</div>
        </div>
      </div>

      <div class="pregame-team-sections">
        ${roleSectionsHTML}
      </div>

      ${warningsHTML}

      <div class="pregame-actions-wrap">
        <div class="pregame-actions">
          <button class="primary-btn" onclick="window.confirmStartGame()">Start Game</button>
          <button class="skip-btn" onclick="window.showSetup()">Back</button>
        </div>
      </div>

    </div>
  `)
}


function getBalanceWarnings(){
  let playerCount = state.players.length
  let mafia = getResolvedMafiaCount(playerCount, state.mafiaCountOverride)

  const warnings = []

  const hasDoctor = state.rolesEnabled.doctor
  const hasSheriff = state.rolesEnabled.sheriff
  const hasMayor = state.rolesEnabled.mayor
  const hasJester = state.rolesEnabled.jester
  const hasExecutioner = state.rolesEnabled.executioner
  const hasCat = state.rolesEnabled.schrodingers_cat
  const hasVigilante = state.rolesEnabled.vigilante
  const hasPriest = state.rolesEnabled.priest
  const hasSpirit = state.rolesEnabled.spirit
  const hasFramer = state.rolesEnabled.framer
  const hasTraitor = state.rolesEnabled.traitor

  let specialRoles = 0
  Object.keys(state.rolesEnabled).forEach(role => {
    if(state.rolesEnabled[role]){
      specialRoles += state.roleCounts[role] || 1
    }
  })

  const infoRoles =
    (hasSheriff ? 1 : 0) +
    (hasSpirit ? 1 : 0) +
    (hasDoctor && state.doctorRevealSave ? 1 : 0) +
    (hasMayor ? 1 : 0)

  const swingRoles =
    (hasJester ? 1 : 0) +
    (hasExecutioner ? 1 : 0) +
    (hasVigilante ? 1 : 0) +
    (hasCat ? 1 : 0) +
    (hasPriest ? 1 : 0)

  // track which specific warnings already cover broader ones
  const covered = {
    mayor: false,
    doctor: false,
    sheriff: false,
    jester: false,
    executioner: false,
    cat: false,
    vigilante: false,
    priest: false,
    spirit: false
  }

  // =========================
  // CORE SETUP WARNINGS
  // =========================

  if(playerCount < 4){
    warnings.push("Minimum 4 players is recommended.")
  }

  if(mafia >= Math.ceil(playerCount / 2)){
    warnings.push("Too many mafia for this player count.")
  }

  if(playerCount <= 5 && mafia >= 2){
    warnings.push("2 mafia with 5 or fewer players may end the game very quickly.")
  }

  if(specialRoles > playerCount - mafia){
    warnings.push("There may be more special roles than available non-mafia players.")
  }

  if(playerCount <= 6 && specialRoles >= 4){
    warnings.push("This is a very role-heavy setup for a smaller lobby.")
  }

  if(playerCount <= 7 && infoRoles >= 3){
    warnings.push("This setup has a lot of information power, which may make mafia weaker.")
  }

  if(playerCount <= 7 && swingRoles >= 3){
    warnings.push("This setup has several swingy roles and may feel chaotic.")
  }

  // =========================
  // SPECIFIC COMBO WARNINGS
  // =========================

  if(hasMayor && hasSheriff && hasDoctor && playerCount < 7){
    warnings.push("Mayor + Sheriff + Doctor can be very powerful together.")
    covered.mayor = true
    covered.sheriff = true
    covered.doctor = true
  } else {
    if(hasMayor && hasSheriff && playerCount < 6){
      warnings.push("Mayor + Sheriff can be very powerful in a smaller lobby.")
      covered.mayor = true
      covered.sheriff = true
    }

    if(hasMayor && hasDoctor && playerCount < 6){
      warnings.push("Mayor + Doctor can be very powerful in a smaller lobby.")
      covered.mayor = true
      covered.doctor = true
    }

    if(hasDoctor && hasSheriff && playerCount < 6){
      warnings.push("Doctor + Sheriff can be very powerful in a smaller lobby.")
      covered.doctor = true
      covered.sheriff = true
    }
  }

  if(hasSpirit && state.spiritActivation === "any_death" && state.spiritRevealType === "exact"){
    warnings.push("Spirit revealing exact roles on any death can create a very high-information game.")
    covered.spirit = true
  }

  if(hasJester && state.jesterWinIfVigilanteKilled && hasVigilante){
    warnings.push("Jester winning from a Vigilante kill makes Vigilante shots much riskier.")
    covered.jester = true
    covered.vigilante = true
  }

  if(hasExecutioner && state.executionerWinIfVigilanteKillsTarget && hasVigilante){
    warnings.push("Executioner winning from a Vigilante kill can create surprise neutral wins.")
    covered.executioner = true
    covered.vigilante = true
  }

  if(hasFramer && !hasSheriff){
    warnings.push("Framer is much weaker if Sheriff is not in the game.")
  }

  // =========================
  // SINGLE-ROLE WARNINGS
  // only show if not already covered
  // =========================

  if(hasMayor && playerCount < 5 && !covered.mayor){
    warnings.push("Mayor can be very strong in smaller games.")
  }

  if(hasDoctor && playerCount < 5 && !covered.doctor){
    warnings.push("Doctor can be very strong in very small games.")
  }

  if(hasSheriff && playerCount < 5 && !covered.sheriff){
    warnings.push("Sheriff can be very strong in very small games.")
  }

  if(hasExecutioner && playerCount < 6 && !covered.executioner){
    warnings.push("Executioner can be very strong in smaller games.")
  }

  if(hasJester && playerCount < 6 && !covered.jester){
    warnings.push("Jester can feel very swingy in smaller games.")
  }

  if(hasCat && playerCount < 6 && !covered.cat){
    warnings.push("Schrödinger's Cat can be very swingy in smaller games.")
  }

  if(hasVigilante && playerCount < 6 && !covered.vigilante){
    warnings.push("Vigilante is extremely swingy in smaller lobbies.")
  }

  if(hasPriest && playerCount < 6 && !covered.priest){
    warnings.push("Priest can be very strong in smaller games.")
  }

  if(
    hasPriest &&
    state.priestUsesPerGame >= 2 &&
    playerCount <= 7 &&
    !covered.priest
  ){
    warnings.push("Multiple Priest uses can heavily reduce mafia pressure.")
  }

  if(
    hasSpirit &&
    state.spiritActivation === "any_death" &&
    playerCount <= 7 &&
    !covered.spirit
  ){
    warnings.push("Spirit activating on any death gives town a lot of extra information.")
  }

  // =========================
  // RULE INTERACTION WARNINGS
  // =========================

  if(
    hasVigilante &&
    state.vigilanteWrongKillOutcome === "only_target_dies"
  ){
    warnings.push("This Vigilante setting is forgiving and makes risky shots stronger.")
  }

  if(
    hasVigilante &&
    !state.vigilanteCanKillNeutrals &&
    (hasJester || hasExecutioner || hasCat)
  ){
    warnings.push("Vigilante cannot kill neutrals, which gives neutral roles more room to survive.")
  }

  if(
    state.revealRolesOnElimination === "death_and_vote" &&
    playerCount <= 6
  ){
    warnings.push("Revealing roles on all eliminations gives a lot of public information in smaller games.")
  }

  if(
    state.revealRolesOnElimination === "death_and_vote" &&
    hasSpirit
  ){
    warnings.push("Public role reveals combined with Spirit can create a very high-information game.")
  }

  if(
    state.mafiaKillMethod === "leader" &&
    !state.mafiaKnowsFirstLeader &&
    mafia >= 3
  ){
    warnings.push("Hidden first mafia leader may slow down the first night for newer groups.")
  }

  return [...new Set(warnings)]
}

revealIndex = 0

function showRoleReveal(){

let player = state.players[revealIndex]

render(`

<div class="card role-pass-card">

  <div class="role-pass-hero">

    <div class="role-pass-kicker">Pass the Phone</div>

    <div class="role-pass-progress">
  <span class="role-pass-progress-dot"></span>
  Player ${revealIndex + 1} of ${state.players.length}
</div>

    <h2 class="role-pass-title">${player.name}</h2>

    <div class="role-pass-subtitle">
      Make sure nobody else is looking.
    </div>

  </div>

  <div class="role-pass-actions">
    <button onclick="window.revealRole()">Reveal Role</button>
  </div>

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
          <div class="framer-target-label">Tonight's kill is chosen by</div>
          <div class="framer-target-name">YOU</div>
        </div>
      `
    }else if(state.mafiaKnowsFirstLeader){
      extraInfo += `
        <div class="framer-target-box">
          <div class="framer-target-label">Tonight's kill is chosen by</div>
          <div class="framer-target-name">${leaderName}</div>
        </div>
      `
    }
  }
}

render(`

<div class="card reveal-role-card role-${player.role}" style="--reveal-role-color:${color};">

  <div class="reveal-role-topbar">
    <div class="reveal-role-kicker">Private Role Reveal</div>
    <div class="reveal-role-progress">
      ${revealIndex + 1} / ${state.players.length}
    </div>
  </div>

  <div class="reveal-role-header">
    <div class="reveal-role-player">${player.name}</div>
    <div class="reveal-role-hint">Tap the card to reveal</div>
  </div>

  <div class="role-card reveal-role-flip" id="roleCard" onclick="flipRole()">
    <div class="role-inner">

      <div class="role-front reveal-role-front">
        <div class="reveal-role-front-shimmer"></div>

        <div class="reveal-role-front-inner">
          <div class="reveal-role-front-icon">✦</div>
          <div class="reveal-role-front-label">Hidden Role</div>
          <div class="reveal-role-front-text">Tap to reveal</div>
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

  ${extraInfo ? `<div class="reveal-role-extra">${extraInfo}</div>` : ""}

  <div class="reveal-role-actions">
    <button onclick="window.nextPlayer()">Hide Role</button>
  </div>

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

<div class="card home-screen-card all-roles-card">

  <div class="home-hero">
    <div class="home-kicker">Game Setup</div>

    <h2 class="home-title">All Roles Assigned</h2>

    <div class="home-subtitle">
      Every player has seen their secret role. The night is ready to begin.
    </div>
  </div>

  <div class="setup-stat-row">
    <div class="setup-stat-pill">
      <span class="setup-stat-value">${state.players.length}</span>
      <span class="setup-stat-text">Roles Revealed</span>
    </div>
  </div>

  <div class="reveal-role-description-wrap">
    <p class="role-description reveal-role-description">
      Hand the phone back to the host and start the first night when the group is ready.
    </p>
  </div>

  <div class="home-actions">
    <button class="primary-btn" onclick="window.startNight()">Start Night</button>
  </div>

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
  state.rolesEnabled.priest = false
  state.rolesEnabled.schrodingers_cat = false
  state.rolesEnabled.traitor = false

  state.roleWeights.traitor = 100
  state.roleWeights.schrodingers_cat = 100
  state.roleWeights.priest = 100
  state.roleWeights.doctor = 100
  state.roleWeights.sheriff = 100
  state.roleWeights.jester = 100
  state.roleWeights.executioner = 100
  state.roleWeights.mayor = 100
  state.roleWeights.spirit = 100
  state.roleWeights.framer = 100
  state.roleWeights.vigilante = 100
  
  state.roleCounts.traitor = 1
  state.roleCounts.schrodingers_cat = 1
  state.roleCounts.priest = 1
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
state.executionerBecomes = "jester"
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

state.rolesEnabled.schrodingers_cat = false
state.roleWeights.schrodingers_cat = 0
state.roleCounts.schrodingers_cat = 1

state.rolesEnabled.traitor = false
state.roleWeights.traitor = 0
state.roleCounts.traitor = 1

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
state.executionerBecomes = "jester"
state.sheriffJesterResult = "not_innocent"
state.sheriffExecutionerResult = "not_innocent"
state.mayorVotePower = 2

state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true
state.mafiaKillMethod = "leader"

state.rolesEnabled.schrodingers_cat = false
state.roleWeights.schrodingers_cat = 0
state.roleCounts.schrodingers_cat = 1

state.rolesEnabled.traitor = false
state.roleWeights.traitor = 0
state.roleCounts.traitor = 1

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
state.rolesEnabled.priest = true

state.roleWeights.priest = 100
state.roleWeights.doctor = 100
state.roleWeights.sheriff = 100
state.roleWeights.jester = 100
state.roleWeights.executioner = 100
state.roleWeights.mayor = 100
state.roleWeights.spirit = 100
state.roleWeights.framer = 100

state.roleCounts.priest = 1
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
state.executionerBecomes = "jester"
state.sheriffJesterResult = "exact"
state.sheriffExecutionerResult = "exact"
state.mayorVotePower = 2.5

state.framerKnowsSuccess = true
state.framerKnowsMafia = true
state.mafiaKnowsFramer = true
state.mafiaKillMethod = "vote"

state.rolesEnabled.schrodingers_cat = true
state.roleWeights.schrodingers_cat = 100
state.roleCounts.schrodingers_cat = 1

state.rolesEnabled.traitor = true
state.roleWeights.traitor = 100
state.roleCounts.traitor = 1

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
refreshPregameSummaryIfOpen()
}

function saveSettingsToStorage(){

localStorage.setItem("mafiaExecutionerBecomes", JSON.stringify(state.executionerBecomes))
localStorage.setItem("mafiaPriestUsesPerGame", JSON.stringify(state.priestUsesPerGame))
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
  refreshPregameSummaryIfOpen()
}

window.setVigilanteWrongKillOutcome = function(value){
  state.vigilanteWrongKillOutcome = value

  localStorage.setItem(
    "mafiaVigilanteWrongKillOutcome",
    JSON.stringify(value)
  )
refreshPregameSummaryIfOpen()
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

export function bootLocalGame() {
  showHome()
}