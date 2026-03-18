import { render } from "../local/ui.js"
import { createRoom, createRoomPlayer } from "../core/onlineRoom.js"
import { buildOnlineGameState } from "../core/buildOnlineGameState.js"
import { db } from "./firebase.js"
import { ref, set, get, child, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
import { roleColors, roleDisplayName } from "../core/gameData.js"
import { roles } from "../core/roles.js"
import { resolveOnlineVotes } from "../core/resolveOnlineVotes.js"
import { resolveOnlineNight } from "../core/resolveOnlineNight.js"

let demoRoom = null
let currentRoomCode = null
let currentPlayerId = null
let currentIsHost = false

function getOnlineRoomRef() {
  return ref(db, `rooms/${currentRoomCode}`)
}

function getOnlineSettings() {
  return demoRoom?.settings || null
}

window.submitOnlineVote = async function(targetName) {
  console.log("Vote clicked:", targetName)
  console.log("Room:", currentRoomCode)
  console.log("Player:", currentPlayerId)

  if (!currentRoomCode) {
    console.warn("No room code")
    return
  }

  if (!currentPlayerId) {
    console.warn("No player id")
    return
  }

  const me = getOnlineMe()
  if (!me || me.alive === false) {
    console.warn("Player is dead or missing")
    return
  }

  try {
    await update(ref(db, `rooms/${currentRoomCode}/gameState`), {
      [`votes/${currentPlayerId}`]: targetName
    })

    console.log("Vote submitted")
  } catch (error) {
    console.error("Failed to submit vote:", error)
  }
}

window.markOnlineReady = async function() {
  console.log("markOnlineReady clicked")
  console.log("demoRoom:", demoRoom)
  console.log("currentPlayerId:", currentPlayerId)

  if (!currentRoomCode) {
    console.warn("No currentRoomCode found")
    return
  }

  if (!currentPlayerId) {
    console.warn("No currentPlayerId found")
    return
  }

  const readyRef = ref(
    db,
    `rooms/${currentRoomCode}/gameState/readyMap/${currentPlayerId}`
  )

  try {
    await set(readyRef, true)
    console.log("Ready saved successfully")
  } catch (error) {
    console.error("Failed to mark player ready:", error)
  }
}

async function pushOnlineSettings(partialSettings) {
  if (!currentIsHost || !currentRoomCode) return

  const currentSettings = getOnlineSettings()
  if (!currentSettings) return

  const merged = {
    ...currentSettings,
    ...partialSettings
  }

  await update(getOnlineRoomRef(), {
    settings: merged
  })
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }

  return code
}

function renderOnlineMenu() {
  render(`
    <div class="card home-screen-card">
      <div class="home-hero">
        <div class="home-kicker">Online Multiplayer</div>

        <h1 class="home-title">Online Play</h1>

        <div class="home-subtitle">
          Create a room as host, or join a room with a code.
        </div>
      </div>

      <div class="home-actions">
        <button class="primary-btn" onclick="window.createOnlineRoom()">
          Host Room
        </button>

        <button class="skip-btn" onclick="window.showJoinRoomScreen()">
          Join Room
        </button>

        <button class="skip-btn" onclick="window.backToModeSelect()">
          Back
        </button>
      </div>
    </div>
  `)
}

function renderHostSetup() {
  render(`
    <div class="card setup-screen-card">
      <div class="setup-hero">
        <div class="setup-kicker">Host Setup</div>
        <h2 class="setup-title">Create Online Room</h2>
        <div class="setup-subtitle">
          Enter your name to create a room.
        </div>
      </div>

      <div class="setup-list-panel">
        <input
          id="hostNameInput"
          class="setup-player-input"
          placeholder="Your name"
        >
      </div>

      <div class="setup-actions">
        <button class="primary-btn" onclick="window.confirmCreateOnlineRoom()">
          Create Room
        </button>

        <button class="skip-btn" onclick="window.showOnlineLobbyHome()">
          Back
        </button>
      </div>
    </div>
  `)
}

function renderJoinSetup() {
  render(`
    <div class="card setup-screen-card">
      <div class="setup-hero">
        <div class="setup-kicker">Join Room</div>
        <h2 class="setup-title">Enter Room Code</h2>
        <div class="setup-subtitle">
          This is still a local demo screen for now.
        </div>
      </div>

      <div class="setup-list-panel">
        <input
          id="joinNameInput"
          class="setup-player-input"
          placeholder="Your name"
        >

        <input
          id="joinCodeInput"
          class="setup-player-input"
          placeholder="Room code"
          style="margin-top:12px;"
        >
      </div>

      <div class="setup-actions">
        <button class="primary-btn" onclick="window.fakeJoinRoom()">
          Join Room
        </button>

        <button class="skip-btn" onclick="window.showOnlineLobbyHome()">
          Back
        </button>
      </div>
    </div>
  `)
}

function renderRoomLobby() {
  if (!demoRoom) return

  const players = demoRoom.players || []
  const settings = demoRoom.settings || {}
  const enabledRoles = Object.entries(settings.rolesEnabled || {})
    .filter(([, enabled]) => enabled)
    .map(([role]) => role)

  const playerListHTML = players.length
    ? players.map(player => `
        <li class="setup-player-card">
          <div class="setup-player-left">
            <div class="setup-player-avatar">${player.isHost ? "👑" : "👤"}</div>
            <div class="setup-player-input-wrap">
              <div class="setup-player-label">${player.isHost ? "Host" : "Player"}</div>
              <div class="setup-player-input" style="display:flex;align-items:center;">
                ${player.name}
              </div>
            </div>
          </div>
        </li>
      `).join("")
    : `
      <div class="setup-empty-state">
        <div class="setup-empty-icon">🎭</div>
        <div class="setup-empty-title">No players yet</div>
        <div class="setup-empty-text">
          Waiting for players to join...
        </div>
      </div>
    `

  render(`
    <div class="card setup-screen-card">
      <div class="setup-hero">
        <div class="setup-kicker">Online Lobby</div>
        <h2 class="setup-title">Room ${demoRoom.roomCode}</h2>
        <div class="setup-subtitle">
          Send this room code to your friends so they can join.
        </div>
      </div>

      <div class="setup-stat-row">
        <div class="setup-stat-pill">
          <span class="setup-stat-value">${players.length}</span>
          <span class="setup-stat-text">Player${players.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div class="setup-list-panel">
        <ul class="setup-player-list">
          ${playerListHTML}
        </ul>
      </div>

      <div class="setup-list-panel" style="margin-top:16px;">
        <div class="setup-empty-title" style="margin-bottom:10px;">Online Settings</div>

        <div style="text-align:left; display:flex; flex-direction:column; gap:8px;">
          <div><strong>Mafia kill method:</strong> ${settings.mafiaKillMethod || "leader"}</div>
          <div><strong>Reveal on elimination:</strong> ${settings.revealRolesOnElimination || "none"}</div>
          <div><strong>Mafia count override:</strong> ${settings.mafiaCountOverride || 0}</div>
          <div><strong>Enabled roles:</strong> ${enabledRoles.length ? enabledRoles.join(", ") : "none"}</div>
        </div>
      </div>

            <div class="setup-actions">
        <button class="skip-btn" onclick="window.showOnlineLobbyHome()">Back</button>

        ${
          currentIsHost
            ? `
              <button onclick="window.showOnlineSettingsEditor()">Edit Online Settings</button>
              <button class="primary-btn" onclick="window.startOnlineGame()">Start Online Game</button>
            `
            : `<button class="primary-btn" disabled>Waiting for Host</button>`
        }
      </div>
    </div>
  `)
}

window.renderRoomLobby = renderRoomLobby

function showOnlineSettingsEditor() {
  if (!currentIsHost || !demoRoom) {
    alert("Only the host can edit online settings.")
    return
  }

  const settings = demoRoom.settings || {}
  const rolesEnabled = settings.rolesEnabled || {}

  render(`
    <div class="card setup-screen-card">
      <div class="setup-hero">
        <div class="setup-kicker">Online Lobby</div>
        <h2 class="setup-title">Edit Online Settings</h2>
        <div class="setup-subtitle">
          These settings sync to every player in the room.
        </div>
      </div>

      <div class="setup-list-panel" style="text-align:left;">
        <label style="display:block; margin-bottom:12px;">
          Mafia Kill Method
          <select id="onlineMafiaKillMethod" class="settings-modern-select">
            <option value="leader" ${settings.mafiaKillMethod === "leader" ? "selected" : ""}>Leader chooses</option>
            <option value="vote" ${settings.mafiaKillMethod === "vote" ? "selected" : ""}>Mafia vote</option>
          </select>
        </label>

        <label style="display:block; margin-bottom:12px;">
          Reveal Roles On Elimination
          <select id="onlineRevealRoles" class="settings-modern-select">
            <option value="none" ${settings.revealRolesOnElimination === "none" ? "selected" : ""}>Never</option>
            <option value="death" ${settings.revealRolesOnElimination === "death" ? "selected" : ""}>Night kill only</option>
            <option value="vote_only" ${settings.revealRolesOnElimination === "vote_only" ? "selected" : ""}>Vote only</option>
            <option value="death_and_vote" ${settings.revealRolesOnElimination === "death_and_vote" ? "selected" : ""}>Night kill and vote</option>
          </select>
        </label>

        <label style="display:block; margin-bottom:16px;">
          Mafia Count Override
          <input
            id="onlineMafiaCountOverride"
            type="number"
            min="0"
            max="5"
            value="${settings.mafiaCountOverride ?? 0}"
            class="settings-modern-number"
          >
        </label>

        <div style="margin-bottom:10px; font-weight:700;">Enable Roles</div>

        <div style="display:grid; gap:10px;">
          ${Object.keys(rolesEnabled).map(role => `
            <label style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.04);">
              <span>${roleDisplayName(role)}</span>
              <input type="checkbox" data-online-role="${role}" ${rolesEnabled[role] ? "checked" : ""}>
            </label>
          `).join("")}
        </div>
      </div>

      <div class="setup-actions">
        <button class="skip-btn" onclick="renderRoomLobby()">Back</button>
        <button class="primary-btn" onclick="window.saveOnlineSettings()">Save Online Settings</button>
      </div>
    </div>
  `)
}

window.saveOnlineSettings = async function () {
  if (!currentIsHost || !demoRoom) return

  const mafiaKillMethod = document.getElementById("onlineMafiaKillMethod")?.value || "leader"
  const revealRolesOnElimination = document.getElementById("onlineRevealRoles")?.value || "none"
  const mafiaCountOverride = Number(document.getElementById("onlineMafiaCountOverride")?.value || 0)

  const currentSettings = demoRoom.settings || {}
  const nextRolesEnabled = { ...(currentSettings.rolesEnabled || {}) }

  document.querySelectorAll("[data-online-role]").forEach(input => {
    nextRolesEnabled[input.dataset.onlineRole] = input.checked
  })

  try {
    await pushOnlineSettings({
      mafiaKillMethod,
      revealRolesOnElimination,
      mafiaCountOverride,
      rolesEnabled: nextRolesEnabled
    })

    alert("Online settings saved.")
  } catch (error) {
    console.error("Failed to save online settings:", error)
    alert("Failed to save online settings: " + error.message)
  }
}

function subscribeToRoom(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`)

  onValue(roomRef, async (snapshot) => {
    demoRoom = snapshot.val()

    if (!demoRoom) {
      render(`
        <div class="card home-screen-card">
          <div class="home-hero">
            <div class="home-kicker">Online Room</div>
            <h2 class="home-title">Room Not Found</h2>
            <div class="home-subtitle">
              This room does not exist, or was deleted.
            </div>
          </div>

          <div class="home-actions">
            <button class="primary-btn" onclick="window.showOnlineMenu()">
              Back
            </button>
          </div>
        </div>
      `)
      return
    }

    if (demoRoom.phase === "in_game") {
      renderOnlineGame()
      await maybeAdvanceOnlinePhase()
      return
    }

    renderRoomLobby()
  })
}

window.showOnlineLobbyHome = function () {
  renderOnlineMenu()
}

window.createOnlineRoom = function () {
  renderHostSetup()
}

window.confirmCreateOnlineRoom = async function () {
  const input = document.getElementById("hostNameInput")
  const hostName = (input?.value || "").trim()

  if (!hostName) {
    alert("Please enter your name.")
    return
  }

  const roomCode = generateRoomCode()
  const hostPlayerId = `host-${Date.now()}`

  const room = createRoom({
    roomCode,
    hostName
  })

  const hostPlayer = createRoomPlayer({
    id: hostPlayerId,
    name: hostName,
    isHost: true
  })

  room.players.push(hostPlayer)
  room.hostId = hostPlayer.id

  try {
    await set(ref(db, `rooms/${roomCode}`), room)

    currentRoomCode = roomCode
    currentPlayerId = hostPlayerId
    currentIsHost = true
    demoRoom = room

    subscribeToRoom(roomCode)
  } catch (error) {
    console.error("Failed to create room:", error)
    alert("Failed to create room: " + error.message)
  }
}

window.startOnlineGame = async function () {
  if (!currentIsHost || !demoRoom) {
    alert("Only the host can start the online game.")
    return
  }

  try {
    const onlineGameState = buildOnlineGameState(demoRoom)

    await update(getOnlineRoomRef(), {
      phase: "in_game",
      gameState: onlineGameState
    })
  } catch (error) {
    console.error("Failed to start online game:", error)
    alert("Failed to start online game: " + error.message)
  }
}

window.showJoinRoomScreen = function () {
  renderJoinSetup()
}

window.fakeJoinRoom = async function () {
  const name = (document.getElementById("joinNameInput")?.value || "").trim()
  const code = (document.getElementById("joinCodeInput")?.value || "").trim().toUpperCase()

  if (!name || !code) {
    alert("Please enter your name and room code.")
    return
  }

  try {
    const snapshot = await get(child(ref(db), `rooms/${code}`))

    if (!snapshot.exists()) {
      alert("Room not found.")
      return
    }

    const room = snapshot.val()
    const players = room.players || []

    const newPlayerId = `player-${Date.now()}`
    const newPlayer = createRoomPlayer({
      id: newPlayerId,
      name,
      isHost: false
    })

    const updatedPlayers = [...players, newPlayer]

    await update(ref(db, `rooms/${code}`), {
      players: updatedPlayers
    })

    currentRoomCode = code
    currentPlayerId = newPlayerId
    currentIsHost = false

    subscribeToRoom(code)
  } catch (error) {
    console.error("Failed to join room:", error)
    alert("Failed to join room: " + error.message)
  }
}

function getOnlineMe() {
  return demoRoom?.gameState?.players?.find(player => player.id === currentPlayerId) || null
}

function getOnlineAlivePlayers() {
  return (demoRoom?.gameState?.players || []).filter(player => player.alive !== false)
}

function getOnlineReadyMap() {
  return demoRoom?.gameState?.readyMap || {}
}

function isOnlineMeReady() {
  return !!getOnlineReadyMap()[currentPlayerId]
}

function getOnlineReadyCount() {
  return Object.values(getOnlineReadyMap()).filter(Boolean).length
}

function getOnlineRequiredReadyCount() {
  return getOnlineAlivePlayers().length
}

function renderOnlineProgressBox() {
  return `
    <div class="player-status-box" style="margin-top:16px;">
      <h3>Phase Progress</h3>
      <div class="status-row">
        <span>Ready Players</span>
        <span>${getOnlineReadyCount()} / ${getOnlineRequiredReadyCount()}</span>
      </div>
    </div>
  `
}

function renderOnlineProceedButton(label = "Continue") {
  if (isOnlineMeReady()) {
    return `
      <button class="primary-btn" disabled>
        Waiting For Other Players
      </button>
    `
  }

  return `
    <button class="primary-btn" onclick="window.markOnlineReady()">
      ${label}
    </button>
  `
}

function getNextOnlinePhase(currentPhase) {
  if (currentPhase === "role_reveal") return "night_select"
  if (currentPhase === "night_select") return "night_results"
  if (currentPhase === "night_results") return "morning"
  if (currentPhase === "morning") return "voting"
  if (currentPhase === "voting") return "vote_results"
  if (currentPhase === "vote_results") return "night_select"

  return currentPhase
}

async function maybeAdvanceOnlinePhase() {
  if (!currentIsHost || !demoRoom?.gameState) return

  const gameState = demoRoom.gameState
  const alivePlayers = (gameState.players || []).filter(player => player.alive !== false)

  let everyoneDone = false

  if (gameState.phase === "night_select") {
    const actions = gameState.submittedActions || {}

    everyoneDone =
      alivePlayers.length > 0 &&
      alivePlayers.every(player => actions[player.id])
  } else if (gameState.phase === "voting") {
    const votes = gameState.votes || {}

    everyoneDone =
      alivePlayers.length > 0 &&
      alivePlayers.every(player => votes[player.id])
  } else {
    const readyMap = gameState.readyMap || {}

    everyoneDone =
      alivePlayers.length > 0 &&
      alivePlayers.every(player => readyMap[player.id])
  }

  if (!everyoneDone) return

  try {
    if (gameState.phase === "night_select") {
      const resolved = resolveOnlineNight(gameState, demoRoom.settings || {})

      await update(getOnlineRoomRef(), {
        "gameState/players": resolved.players,
        "gameState/nightDeaths": resolved.nightDeaths,
        "gameState/nightResolved": resolved.nightResolved,
        "gameState/nightPrivateResults": resolved.nightPrivateResults,
        "gameState/phase": "night_results",
        "gameState/readyMap": {},
        "gameState/submittedActions": {}
      })
      return
    }

    if (gameState.phase === "voting") {
      const resolved = resolveOnlineVotes(gameState)

      await update(getOnlineRoomRef(), {
        "gameState/players": resolved.players,
        "gameState/voteResults": resolved.voteResults,
        "gameState/phase": "vote_results",
        "gameState/readyMap": {},
        "gameState/votes": {}
      })
      return
    }

    let nextPhase = gameState.phase

    if (gameState.phase === "role_reveal") nextPhase = "night_select"
    else if (gameState.phase === "night_results") nextPhase = "morning"
    else if (gameState.phase === "morning") nextPhase = "voting"
    else if (gameState.phase === "vote_results") nextPhase = "night_select"

    await update(getOnlineRoomRef(), {
      "gameState/phase": nextPhase,
      "gameState/readyMap": {},
      "gameState/submittedActions": {},
      "gameState/votes": {}
    })
  } catch (error) {
    console.error("Failed to advance online phase:", error)
  }
}

function renderOnlineGame() {
  const gameState = demoRoom?.gameState

  if (!gameState) {
    render(`
      <div class="card home-screen-card">
        <div class="home-hero">
          <div class="home-kicker">Online Game</div>
          <h2 class="home-title">No Game State</h2>
          <div class="home-subtitle">
            The room is missing its game state.
          </div>
        </div>

        <div class="home-actions">
          <button class="primary-btn" onclick="window.showOnlineMenu()">
            Back
          </button>
        </div>
      </div>
    `)
    return
  }

  if (gameState.phase === "role_reveal") {
    renderOnlineRoleReveal()
    return
  }

  if (gameState.phase === "night_select") {
    renderOnlineNightSelect()
    return
  }

  if (gameState.phase === "night_results") {
    renderOnlineNightResults()
    return
  }

  if (gameState.phase === "morning") {
    renderOnlineMorning()
    return
  }

  if (gameState.phase === "voting") {
    renderOnlineVoting()
    return
  }

  if (gameState.phase === "vote_results") {
    renderOnlineVoteResults()
    return
  }

  render(`
    <div class="card home-screen-card">
      <div class="home-hero">
        <div class="home-kicker">Online Game</div>
        <h2 class="home-title">Unknown Phase</h2>
        <div class="home-subtitle">
          Current phase: ${gameState.phase}
        </div>
      </div>
    </div>
  `)
}

function renderOnlineRoleReveal() {
  const me = getOnlineMe()
  if (!me) return

  const color = roleColors[me.role] || "white"
  const role = roles[me.role]
  let extraInfo = ""

  if (me.role === "executioner") {
    const target = demoRoom?.gameState?.executionerTargets?.[me.name]
    if (target) {
      extraInfo = `
        <div class="executioner-target-box">
          <div class="executioner-target-label">Your target is</div>
          <div class="executioner-target-name">${target}</div>
        </div>
      `
    }
  }

  render(`
    <div class="card reveal-role-card role-${me.role}" style="--reveal-role-color:${color};">

      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Online Role Reveal</div>
        <div class="reveal-role-progress">
          ${currentRoomCode}
        </div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${me.name}</div>
        <div class="reveal-role-hint">This is your private role</div>
      </div>

      <div class="role-card reveal-role-flip revealed">
        <div class="role-inner">

          <div class="role-front reveal-role-front">
            <div class="reveal-role-front-shimmer"></div>
            <div class="reveal-role-front-inner">
              <div class="reveal-role-front-icon">✦</div>
              <div class="reveal-role-front-label">Your Role</div>
              <div class="reveal-role-front-text">${roleDisplayName(me.role)}</div>
            </div>
          </div>

          <div class="role-back reveal-role-back" style="color:${color}">
            <div class="reveal-role-back-inner">
              <div class="reveal-role-back-kicker">Your Role</div>
              <div class="reveal-role-name">${roleDisplayName(me.role)}</div>
            </div>
          </div>

        </div>
      </div>

      <div class="reveal-role-description-wrap">
        <p class="role-description reveal-role-description">
          ${role?.description || ""}
        </p>
      </div>

      ${extraInfo ? `<div class="reveal-role-extra">${extraInfo}</div>` : ""}

      ${renderOnlineProgressBox()}

      <div class="reveal-role-actions">
        ${renderOnlineProceedButton("Continue")}
      </div>

    </div>
  `)
}

window.submitNightAction = async function(type, target = null) {
  if (!demoRoom?.gameState || !currentPlayerId) return

  try {
    await update(getOnlineRoomRef(), {
      [`gameState/submittedActions/${currentPlayerId}`]: {
        type,
        target
      },
      [`gameState/readyMap/${currentPlayerId}`]: true
    })
  } catch (error) {
    console.error("Failed to submit action:", error)
  }
}

function renderOnlineNightSelect() {
  const me = getOnlineMe()
  if (!me) return

  const alivePlayers = getOnlineAlivePlayers().filter(p => p.id !== currentPlayerId)

  const targetButtons = alivePlayers.map(player => `
    <button class="primary-btn" onclick="window.submitNightAction('${getActionType(me.role)}', '${player.name}')">
      ${player.name}
    </button>
  `).join("")

  let content = ""

  if (["mafia", "doctor", "sheriff", "vigilante", "framer"].includes(me.role)) {
    content = `
      <div class="player-status-box">
        <h3>Select Target</h3>
        ${targetButtons}
      </div>
    `
  } else {
    content = `
      <div class="player-status-box">
        <h3>No Action</h3>
        <button class="primary-btn" onclick="window.submitNightAction('none')">
          Continue
        </button>
      </div>
    `
  }

  render(`
    <div class="card reveal-role-card role-${me.role}">

      <div class="reveal-role-header">
        <div class="reveal-role-player">${me.name}</div>
        <div class="reveal-role-hint">Choose your night action</div>
      </div>

      ${content}

      ${renderOnlineProgressBox()}

    </div>
  `)
}

function getActionType(role) {
  if (role === "mafia") return "kill"
  if (role === "doctor") return "save"
  if (role === "sheriff") return "investigate"
  if (role === "vigilante") return "kill"
  if (role === "framer") return "frame"
  return "none"
}

function renderOnlineNightResults() {
  const me = getOnlineMe()
  if (!me) return

  const myResult = (demoRoom?.gameState?.nightPrivateResults || []).find(
    result => result.playerId === currentPlayerId
  )

  const color = roleColors[me.role] || "white"

  render(`
    <div class="card reveal-role-card role-${me.role}" style="--reveal-role-color:${color};">

      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Night Results</div>
        <div class="reveal-role-progress">${demoRoom.code}</div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${me.name}</div>
        <div class="reveal-role-hint">Your private night result</div>
      </div>

      <div class="night-action-role-box">
        <div class="night-action-role-kicker">Result</div>

        ${
          myResult
            ? `
              <div class="night-action-role-name" style="color:${color}; text-shadow:0 0 10px ${color};">
                ${me.role === "sheriff" ? "Investigation" : roleDisplayName(me.role)}
              </div>

              <p class="role-description">
                ${myResult.text}
              </p>
            `
            : `
              <div class="night-action-role-name" style="color:${color}; text-shadow:0 0 10px ${color};">
                ${roleDisplayName(me.role)}
              </div>

              <p class="role-description">
                Nothing special happened to you tonight.
              </p>
            `
        }
      </div>

      ${renderOnlineProgressBox()}

      <div class="reveal-role-actions">
        ${renderOnlineProceedButton("Continue")}
      </div>

    </div>
  `)
}

function renderOnlineMorning() {
  const publicResults = demoRoom?.gameState?.nightResolved?.publicResults || []

  const playersHTML = (demoRoom?.gameState?.players || []).map(player => {
    return `
      <div class="status-row ${player.alive !== false ? "alive" : "dead"}">
        <span>${player.name}</span>
        <span>${player.alive !== false ? "Alive" : "Dead ☠"}</span>
      </div>
    `
  }).join("")

  const resultsHTML = publicResults.map(result => `
    <div class="morning-result-card night-result-${result.type}">
      <div class="morning-result-kicker">Night Event</div>
      <div class="morning-result-text">${result.text}</div>
    </div>
  `).join("")

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

      <div class="player-status-box">
        <h3>Players</h3>
        ${playersHTML}
      </div>

      ${renderOnlineProgressBox()}

      <div class="morning-actions">
        ${renderOnlineProceedButton("Continue")}
      </div>

    </div>
  `)
}

function renderOnlineVoting() {
  const me = getOnlineMe()
  if (!me) return

  const alivePlayers = getOnlineAlivePlayers()
  const myVote = demoRoom?.gameState?.votes?.[currentPlayerId] || null

  let buttons = ""

  alivePlayers.forEach(player => {
    buttons += `
      <button
        class="vote-player-btn"
        onclick="window.submitOnlineVote('${player.name}')"
        ${myVote ? "disabled" : ""}
      >
        <span class="vote-player-name">${player.name}</span>
        <span class="vote-player-label">Vote</span>
      </button>
    `
  })

  buttons += `
    <button
      class="skip-btn vote-skip-btn"
      onclick="window.submitOnlineVote('skip')"
      ${myVote ? "disabled" : ""}
    >
      <span class="vote-player-name">Skip Vote</span>
      <span class="vote-player-label">No elimination</span>
    </button>
  `

  const playersHTML = (demoRoom?.gameState?.players || []).map(player => {
    return `
      <div class="status-row ${player.alive !== false ? "alive" : "dead"}">
        <span>${player.name}</span>
        <span>${player.alive !== false ? "Alive" : "Dead ☠"}</span>
      </div>
    `
  }).join("")

  render(`
    <div class="card voting-card morning-vote-card">

      <div class="voting-hero">
        <div class="voting-kicker">Town Judgment</div>
        <h2 class="voting-title">Cast Your Vote</h2>
        <div class="voting-subtitle">
          Choose who should be eliminated before night falls.
        </div>

        ${
          myVote
            ? `
              <div class="current-voter-pill">
                <span class="current-voter-dot"></span>
                <strong>You voted for ${myVote === "skip" ? "Skip Vote" : myVote}</strong>
              </div>
            `
            : ""
        }
      </div>

      <div class="voting-grid">
        ${buttons}
      </div>

      <div class="player-status-box">
        <h3>Players</h3>
        ${playersHTML}
      </div>

      ${renderOnlineProgressBox()}

    </div>
  `)
}

function renderOnlineVoteResults() {
  const voteResults = demoRoom?.gameState?.voteResults || {
    voteCounts: {},
    eliminated: null,
    resultType: "none"
  }

  const voteCounts = voteResults.voteCounts || {}
  const maxVotes = Object.values(voteCounts).length
    ? Math.max(...Object.values(voteCounts))
    : 1

  let resultsHTML = ""

  for (const [name, count] of Object.entries(voteCounts)) {
    const label = name === "skip" ? "Skip Vote" : name
    const percent = (count / maxVotes) * 100
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
  }

  let outcomeHTML = ""

  if (voteResults.resultType === "tie") {
    outcomeHTML = `
      <div class="vote-outcome-banner vote-outcome-tie">
        <div class="vote-outcome-kicker">Outcome</div>
        <div class="vote-outcome-title">It's a tie</div>
        <div class="vote-outcome-subtitle">Nobody was eliminated.</div>
      </div>
    `
  } else if (voteResults.resultType === "skip") {
    outcomeHTML = `
      <div class="vote-outcome-banner vote-outcome-skip">
        <div class="vote-outcome-kicker">Outcome</div>
        <div class="vote-outcome-title">Vote Skipped</div>
        <div class="vote-outcome-subtitle">No one was eliminated today.</div>
      </div>
    `
  } else if (voteResults.resultType === "elimination") {
    outcomeHTML = `
      <div class="vote-outcome-banner vote-outcome-elimination">
        <div class="vote-outcome-kicker">Eliminated</div>
        <div class="vote-outcome-title">${voteResults.eliminated}</div>
        <div class="vote-outcome-subtitle">The town has voted them out.</div>
      </div>
    `
  } else {
    outcomeHTML = `
      <div class="vote-outcome-banner vote-outcome-neutral">
        <div class="vote-outcome-kicker">Outcome</div>
        <div class="vote-outcome-title">No Elimination</div>
      </div>
    `
  }

  const playersHTML = (demoRoom?.gameState?.players || []).map(player => {
    return `
      <div class="status-row ${player.alive !== false ? "alive" : "dead"}">
        <span>${player.name}</span>
        <span>${player.alive !== false ? "Alive" : "Dead ☠"}</span>
      </div>
    `
  }).join("")

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
        ${resultsHTML || `
          <div class="vote-row">
            <div class="vote-label-row">
              <div class="vote-label-main">No votes recorded</div>
              <div class="vote-label-count">0</div>
            </div>
            <div class="vote-bar-bg">
              <div class="vote-bar-fill" style="width:0%"></div>
            </div>
          </div>
        `}
      </div>

      ${outcomeHTML}

      <div class="player-status-box">
        <h3>Players</h3>
        ${playersHTML}
      </div>

      ${renderOnlineProgressBox()}

      <div class="reveal-role-actions">
        ${renderOnlineProceedButton("Continue")}
      </div>

    </div>
  `)
}

function getRoleDescription(role) {
  const roleDescriptions = {
    villager: "You have no special ability. Find the mafia.",
    mafia: "Work with the mafia to eliminate villagers each night.",
    doctor: "Choose one player each night to protect from being killed.",
    sheriff: "Investigate a player each night to learn if they are suspicious.",
    mayor: "Your vote has extra power during the day.",
    jester: "You win if the town votes you out.",
    executioner: "You win if your assigned target is voted out by the town.",
    spirit: "If you die, you may reveal information to the town.",
    framer: "Choose a player each night to make them look suspicious to the Sheriff.",
    vigilante: "At night, you may attack one player, but mistakes are dangerous.",
    priest: "You may shield the town and block all kills for a night.",
    schrodingers_cat: "If attacked, you join the attacker’s side instead of dying.",
    traitor: "You secretly help the mafia win."
  }

  return roleDescriptions[role] || "No description available."
}

window.advanceOnlinePhase = async function () {
  if (!currentIsHost || !demoRoom?.gameState) return

  const nextPhase = getNextOnlinePhase(demoRoom.gameState.phase)

  try {
    await update(getOnlineRoomRef(), {
  "gameState/phase": nextPhase,
  "gameState/readyMap": {},
  "gameState/submittedActions": {}
})
  } catch (error) {
    console.error("Failed to advance phase:", error)
    alert("Failed to advance phase: " + error.message)
  }
}

window.showOnlineNetworkingNotice = function () {
  render(`
    <div class="card home-screen-card">
      <div class="home-hero">
        <div class="home-kicker">Next Milestone</div>
        <h1 class="home-title">Real Networking</h1>
        <div class="home-subtitle">
          The lobby structure is ready. Next we connect it to a real backend so players can join from different devices.
        </div>
      </div>

      <div class="home-actions">
        <button class="primary-btn" onclick="window.showOnlineLobbyHome()">
          Back to Online Menu
        </button>
      </div>
    </div>
  `)
}

export function bootOnlineLobby() {
  renderOnlineMenu()
}

window.renderOnlineGame = renderOnlineGame
window.showOnlineSettingsEditor = showOnlineSettingsEditor