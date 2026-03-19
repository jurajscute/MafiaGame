import { render } from "../local/ui.js"
import { createRoom, createRoomPlayer } from "../core/onlineRoom.js"
import { buildOnlineGameState } from "../core/buildOnlineGameState.js"
import { mergeGameSettings } from "../core/gameSettings.js"
import { SETTINGS_SECTIONS, buildSettingsField } from "../core/settingsSchema.js"
import { db } from "./firebase.js"
import { roleColors, roleDisplayName } from "../core/gameData.js"
import { roles } from "../core/roles.js"
import { ref, set, get, child, onValue, update, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
import { resolveOnlineVotes } from "../core/resolveOnlineVotes.js"
import { resolveOnlineNight } from "../core/resolveOnlineNight.js"
import {
  buildSharedRoleRevealScreen,
  buildSharedNightActionScreen,
  buildSharedNightResultScreen,
  buildSharedMorningScreen,
  buildSharedVoteResultsScreen,
  buildSharedWinScreen,
  buildSharedFinalResultsScreen
} from "../core/sharedScreens.js"

let demoRoom = null
let currentRoomCode = null
let currentPlayerId = null
let currentIsHost = false

let lastRenderedPhase = null
let lastRenderedScreenKey = null

function hasOnlinePlayerSeenMorning() {
  return !!demoRoom?.gameState?.morningSeen?.[currentPlayerId]
}

window.updateOnlineSetting = async function(path, value) {
  if (!currentIsHost || !demoRoom) return

  const settings = mergeGameSettings({}, demoRoom.settings || {})
  setNestedValue(settings, path, value)

  try {
    await update(getOnlineRoomRef(), {
      settings
    })
  } catch (error) {
    console.error("Failed to update online setting:", error)
  }
}

function haveAllOnlinePlayersSeenMorning() {
  const presence = demoRoom?.presence || {}
  const players = (demoRoom?.gameState?.players || []).filter(
    player => player.alive !== false && presence[player.id]
  )
  const seenMap = demoRoom?.gameState?.morningSeen || {}

  return players.length > 0 && players.every(player => seenMap[player.id])
}

window.advanceOnlineMorning = async function () {
  if (!currentRoomCode || !currentPlayerId) return

  try {
    await update(getOnlineRoomRef(), {
      [`gameState/morningSeen/${currentPlayerId}`]: true
    })
  } catch (error) {
    console.error("Failed to mark morning seen:", error)
  }
}

function renderOnlineVoteProgressBox() {
  const votes = demoRoom?.gameState?.votes || {}
  const voteCount = Object.keys(votes).length
  const totalVoters = getOnlineAlivePlayers().length
  const percent = totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0

  return `
    <div class="player-status-box online-progress-box" style="margin-top:16px;">
      <h3>Phase Progress</h3>

      <div class="status-row">
        <span>Votes Cast</span>
        <span id="onlineVoteCount">${voteCount} / ${totalVoters}</span>
      </div>

      <div class="online-progress-track">
        <div
          id="onlineVoteBar"
          class="online-vote-fill"
          style="width:${percent}%"
        ></div>
      </div>
    </div>
  `
}

function hasOnlinePlayerSeenFinalResults() {
  return !!demoRoom?.gameState?.finalResultsSeen?.[currentPlayerId]
}

function haveAllOnlinePlayersSeenFinalResults() {
  const presence = demoRoom?.presence || {}
  const seenMap = demoRoom?.gameState?.finalResultsSeen || {}
  const players = (demoRoom?.gameState?.players || []).filter(player => presence[player.id])

  return players.length > 0 && players.every(player => seenMap[player.id])
}

function getOnlineRoomRef() {
  return ref(db, `rooms/${currentRoomCode}`)
}

function getMySubmittedAction() {
  return demoRoom?.gameState?.submittedActions?.[currentPlayerId] || null
}

function getOnlineSettings() {
  return demoRoom?.settings || null
}


function applyOnlinePhaseTheme(phase) {
  if (phase === "role_reveal" || phase === "night_select" || phase === "night_results") {
    document.body.className = "night"
    return
  }

  if (phase === "morning" || phase === "voting" || phase === "vote_results") {
    document.body.className = "day"
    return
  }

  if (phase === "game_over") {
    return
  }

  document.body.className = ""
}

async function registerPresence(roomCode, playerId) {
  const presenceRef = ref(db, `rooms/${roomCode}/presence/${playerId}`)

  await set(presenceRef, true)
  await onDisconnect(presenceRef).remove()
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

  const phase = demoRoom?.gameState?.phase

if (phase !== "morning" && phase !== "voting") {
  console.warn("Voting is not available right now")
  return
}

if (phase === "morning" && !hasOnlinePlayerSeenMorning()) {
  console.warn("Player has not advanced past morning yet")
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

window.advanceToOnlineFinalResults = async function () {
  if (!currentRoomCode || !currentPlayerId) return

  try {
    await update(getOnlineRoomRef(), {
      [`gameState/finalResultsSeen/${currentPlayerId}`]: true
    })
  } catch (error) {
    console.error("Failed to advance to final results:", error)
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

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }

  return code
}

function renderOnlineMenu() {
  document.body.className = ""
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
  document.body.className = ""
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
  document.body.className = ""
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
  document.body.className = ""
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
  <button class="skip-btn" onclick="window.leaveOnlineRoom()">Leave Room</button>

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

function renderOnlineSettingsSection(section, settings) {
  return `
    <div class="settings-section-modern">
      <div class="settings-section-title-modern">${section.title}</div>
      <div class="settings-grid-two">
        ${section.fields.map(field => `
          <div class="settings-quick-card">
            ${buildSettingsField(field, settings, "window.updateOnlineSetting")}
          </div>
        `).join("")}
      </div>
    </div>
  `
}

function showOnlineSettingsEditor() {
  if (!currentIsHost || !demoRoom) {
    alert("Only the host can edit online settings.")
    return
  }

  const settings = mergeGameSettings({}, demoRoom.settings || {})

  render(`
    <div class="card setup-screen-card">
      <div class="setup-hero">
        <div class="setup-kicker">Online Lobby</div>
        <h2 class="setup-title">Edit Online Settings</h2>
        <div class="setup-subtitle">
          These settings sync live to every player in the room.
        </div>
      </div>

      <div class="setup-list-panel" style="text-align:left;">
        ${SETTINGS_SECTIONS.map(section => renderOnlineSettingsSection(section, settings)).join("")}
      </div>

      <div class="setup-actions">
        <button class="skip-btn" onclick="renderRoomLobby()">Back</button>
      </div>
    </div>
  `)
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

    if (demoRoom.hostId && currentPlayerId) {
      currentIsHost = demoRoom.hostId === currentPlayerId
    }

    if (currentIsHost) {
      const players = demoRoom.players || []
      const presence = demoRoom.presence || {}

      const connectedPlayers = players.filter(player => presence[player.id])
      const disconnectedPlayers = players.filter(player => !presence[player.id])

      if (disconnectedPlayers.length > 0) {
        const updates = {
          players: connectedPlayers
        }

        if (demoRoom.hostId && !presence[demoRoom.hostId]) {
          const nextHost = connectedPlayers[0] || null
          updates.hostId = nextHost ? nextHost.id : null
          updates.hostName = nextHost ? nextHost.name : null

          if (nextHost) {
            updates.players = connectedPlayers.map(player => ({
              ...player,
              isHost: player.id === nextHost.id
            }))
          }
        }

        await update(roomRef, updates)
        return
      }
    }

    if (demoRoom.phase === "in_game") {
      const nextScreenKey = getOnlineScreenKey()

      if (nextScreenKey !== lastRenderedScreenKey) {
        lastRenderedScreenKey = nextScreenKey
        renderOnlineGame()
      } else {
        patchOnlineProgressBox()
      }

      await maybeAdvanceOnlinePhase()
      return
    }

    lastRenderedScreenKey = null
    renderRoomLobby()
  })
}

function patchOnlineProgressBox() {
  const readyEl = document.getElementById("onlineReadyCount")
  const readyBarEl = document.getElementById("onlineReadyBar")

  if (readyEl) {
    const includeDead = readyEl.dataset.includeDead === "true"
    const readyCount = getOnlineReadyCount(includeDead)
    const requiredCount = getOnlineRequiredReadyCount(includeDead)

    readyEl.textContent = `${readyCount} / ${requiredCount}`

    if (readyBarEl) {
      const percent = requiredCount > 0 ? (readyCount / requiredCount) * 100 : 0
      readyBarEl.style.width = `${percent}%`
    }
  }

  const voteEl = document.getElementById("onlineVoteCount")
  const voteBarEl = document.getElementById("onlineVoteBar")

  if (voteEl) {
    const votes = demoRoom?.gameState?.votes || {}
    const voteCount = Object.keys(votes).length
    const totalVoters = getOnlineAlivePlayers().length

    voteEl.textContent = `${voteCount} / ${totalVoters}`

    if (voteBarEl) {
      const percent = totalVoters > 0 ? (voteCount / totalVoters) * 100 : 0
      voteBarEl.style.width = `${percent}%`
    }
  }
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
    await set(ref(db, `rooms/${roomCode}`), {
  ...room,
  presence: {
    [hostPlayerId]: true
  }
})

await onDisconnect(ref(db, `rooms/${roomCode}/presence/${hostPlayerId}`)).remove()

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

window.leaveOnlineRoom = async function () {
  if (!currentRoomCode || !currentPlayerId) {
    window.showOnlineMenu()
    return
  }

  try {
    const roomRef = ref(db, `rooms/${currentRoomCode}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) {
      currentRoomCode = null
      currentPlayerId = null
      currentIsHost = false
      demoRoom = null
      window.showOnlineMenu()
      return
    }

    const room = snapshot.val()
    const players = room.players || []

    const remainingPlayers = players.filter(player => player.id !== currentPlayerId)

    const updates = {
      players: remainingPlayers
    }

    if (room.hostId === currentPlayerId) {
      const nextHost = remainingPlayers[0] || null
      updates.hostId = nextHost ? nextHost.id : null
      updates.hostName = nextHost ? nextHost.name : null

      if (nextHost) {
        updates.players = remainingPlayers.map(player => ({
          ...player,
          isHost: player.id === nextHost.id
        }))
      }
    }

    await update(roomRef, updates)

await remove(ref(db, `rooms/${currentRoomCode}/presence/${currentPlayerId}`))

    currentRoomCode = null
    currentPlayerId = null
    currentIsHost = false
    demoRoom = null

    window.showOnlineMenu()
  } catch (error) {
    console.error("Failed to leave room:", error)
    alert("Failed to leave room: " + error.message)
  }
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

    if (room.phase === "in_game") {
      alert("This game has already started.")
      return
    }

    if (players.some(player => player.name.toLowerCase() === name.toLowerCase())) {
      alert("That name is already taken in this room.")
      return
    }

    if (currentRoomCode === code && currentPlayerId) {
      const alreadyJoined = players.some(player => player.id === currentPlayerId)
      if (alreadyJoined) {
        subscribeToRoom(code)
        return
      }
    }

    const newPlayerId = `player-${Date.now()}`
    const newPlayer = createRoomPlayer({
      id: newPlayerId,
      name,
      isHost: false
    })

    const updatedPlayers = [...players, newPlayer]

await update(ref(db), {
  [`rooms/${code}/players`]: updatedPlayers,
  [`rooms/${code}/presence/${newPlayerId}`]: true
})

await onDisconnect(ref(db, `rooms/${code}/presence/${newPlayerId}`)).remove()

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

function getOnlinePresentAlivePlayers() {
  const presence = demoRoom?.presence || {}
  return (demoRoom?.gameState?.players || []).filter(
    player => player.alive !== false && presence[player.id]
  )
}

function getOnlinePresentPlayers() {
  const presence = demoRoom?.presence || {}
  return (demoRoom?.gameState?.players || []).filter(player => presence[player.id])
}

function getOnlineAlivePlayers() {
  return getOnlinePresentAlivePlayers()
}

function getOnlineReadyMap() {
  return demoRoom?.gameState?.readyMap || {}
}

function isOnlineMeReady() {
  return !!getOnlineReadyMap()[currentPlayerId]
}

function getOnlineReadyCount(includeDead = false, mapName = "readyMap") {
  const sourceMap = demoRoom?.gameState?.[mapName] || {}
  const eligiblePlayers = includeDead ? getOnlinePresentPlayers() : getOnlineAlivePlayers()
  const eligibleIds = new Set(eligiblePlayers.map(player => player.id))

  return Object.entries(sourceMap).filter(([playerId, isReady]) => {
    return isReady && eligibleIds.has(playerId)
  }).length
}

function getOnlineRequiredReadyCount(includeDead = false) {
  return includeDead ? getOnlinePresentPlayers().length : getOnlineAlivePlayers().length
}

function renderOnlineProgressBox({
  includeDead = false,
  label = "Ready Players",
  mapName = "readyMap"
} = {}) {
  const readyCount = getOnlineReadyCount(includeDead, mapName)
  const requiredCount = getOnlineRequiredReadyCount(includeDead)
  const percent = requiredCount > 0 ? (readyCount / requiredCount) * 100 : 0

  return `
    <div class="player-status-box online-progress-box" style="margin-top:16px;">
      <h3>Phase Progress</h3>

      <div class="status-row">
        <span>${label}</span>
        <span
          id="onlineReadyCount"
          data-include-dead="${includeDead ? "true" : "false"}"
          data-map-name="${mapName}"
        >
          ${readyCount} / ${requiredCount}
        </span>
      </div>

      <div class="online-progress-track">
        <div
          id="onlineReadyBar"
          class="online-progress-fill"
          style="width:${percent}%"
        ></div>
      </div>
    </div>
  `
}

function renderOnlineProceedButton(label = "Continue", { includeDead = false } = {}) {
  const me = getOnlineMe()

  if (!me) {
    return `
      <button class="primary-btn" disabled>
        Unavailable
      </button>
    `
  }

  if (!includeDead && me.alive === false) {
    return `
      <button class="skip-btn" disabled>
        You Died
      </button>
    `
  }

  if (isOnlineMeReady()) {
    return `
      <button class="skip-btn" disabled>
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
  const presence = demoRoom?.presence || {}

  if (gameState.phase === "game_over") {
    const allSeenFinalResults = haveAllOnlinePlayersSeenFinalResults()

    if (!allSeenFinalResults) return

    const readyMap = gameState.readyMap || {}
    const playersForLobbyReturn = (gameState.players || []).filter(player => presence[player.id])

    const everyoneReadyToReturn =
      playersForLobbyReturn.length > 0 &&
      playersForLobbyReturn.every(player => readyMap[player.id])

    if (!everyoneReadyToReturn) return

    await update(getOnlineRoomRef(), {
      phase: "lobby",
      gameState: null
    })
    return
  }

  const alivePlayers = (gameState.players || []).filter(
    player => player.alive !== false && presence[player.id]
  )

  let everyoneDone = false

  if (gameState.phase === "night_select") {
  const actions = gameState.submittedActions || {}

  everyoneDone =
    alivePlayers.length > 0 &&
    alivePlayers.every(player => actions[player.id])

} else if (gameState.phase === "morning") {
  const votes = gameState.votes || {}

  everyoneDone =
    alivePlayers.length > 0 &&
    alivePlayers.every(player => votes[player.id])

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
    "gameState/vigilantePublicReveal": resolved.vigilantePublicReveal || null,
    "gameState/gameLog": resolved.gameLog,
    "gameState/gameStats": resolved.gameStats,
    "gameState/finalResult": resolved.finalResult || null,
    "gameState/finalResultsSeen": resolved.finalResult ? {} : (gameState.finalResultsSeen || {}),
    "gameState/phase": resolved.finalResult ? "game_over" : "night_results",
    "gameState/readyMap": {},
    "gameState/submittedActions": {}
  })
  return
}

    if (gameState.phase === "morning" || gameState.phase === "voting") {
  const resolved = resolveOnlineVotes(gameState)

  await update(getOnlineRoomRef(), {
    "gameState/players": resolved.players,
    "gameState/voteResults": resolved.voteResults,
    "gameState/finalResult": resolved.finalResult || null,
    "gameState/gameLog": resolved.gameLog,
    "gameState/gameStats": resolved.gameStats,
    "gameState/phase": resolved.finalResult ? "game_over" : "vote_results",
    "gameState/readyMap": {},
    "gameState/votes": {},
    "gameState/finalResultsSeen": {}
  })

  return
}

    let nextPhase = gameState.phase

    if (gameState.phase === "role_reveal") nextPhase = "night_select"
    if (gameState.phase === "night_results") {
  let eliminatedThisMorning = 0

const nextPlayers = (gameState.players || []).map(player => {
  if (player.doomedTonight) {
    eliminatedThisMorning += 1
    return {
      ...player,
      alive: false,
      doomedTonight: false
    }
  }

  return {
    ...player,
    doomedTonight: false
  }
})

const nextGameStats = {
  ...(gameState.gameStats || {}),
  eliminations: (gameState.gameStats?.eliminations || 0) + eliminatedThisMorning
}

  const mafiaAlive = nextPlayers.filter(player => {
    if (player.alive === false) return false
    return getOnlineEffectiveTeam(player) === "mafia"
  }).length

  const nonMafiaAlive = nextPlayers.filter(player => {
    if (player.alive === false) return false
    return getOnlineEffectiveTeam(player) !== "mafia"
  }).length

  let finalResult = null

  if (mafiaAlive === 0) {
    finalResult = {
      type: "village_win"
    }
  } else if (mafiaAlive >= nonMafiaAlive) {
    finalResult = {
      type: "mafia_win"
    }
  }

  await update(getOnlineRoomRef(), {
  "gameState/players": nextPlayers,
  "gameState/gameStats": nextGameStats,
  "gameState/finalResult": finalResult,
  "gameState/finalResultsSeen": finalResult ? {} : (gameState.finalResultsSeen || {}),
  "gameState/phase": finalResult ? "game_over" : "morning",
  "gameState/readyMap": {},
  "gameState/submittedActions": {},
  "gameState/votes": {},
  "gameState/morningSeen": {}
})
  return
}
    else if (gameState.phase === "morning") nextPhase = "voting"
    else if (gameState.phase === "vote_results") {
      if (gameState.finalResult) {
        nextPhase = "game_over"
      } else {
        nextPhase = "night_select"
      }
    }

    const updates = {
  "gameState/phase": nextPhase,
  "gameState/readyMap": {},
  "gameState/submittedActions": {},
  "gameState/votes": {},
  "gameState/vigilantePublicReveal": null,
}

if (nextPhase === "morning") {
  updates["gameState/morningSeen"] = {}
}

await update(getOnlineRoomRef(), updates)
  } catch (error) {
    console.error("Failed to advance online phase:", error)
  }
}

function getOnlineScreenKey() {
  const gameState = demoRoom?.gameState
  if (!gameState) return "no_game"

  const me = getOnlineMe()
  const myVote = gameState.votes?.[currentPlayerId] || ""
  const myReady = gameState.readyMap?.[currentPlayerId] ? "ready" : "not_ready"
  const myMorningSeen = gameState.morningSeen?.[currentPlayerId] ? "seen" : "not_seen"
  const myFinalResultsSeen = gameState.finalResultsSeen?.[currentPlayerId] ? "seen" : "not_seen"
  const myAction = gameState.submittedActions?.[currentPlayerId]
    ? JSON.stringify(gameState.submittedActions[currentPlayerId])
    : ""

  return JSON.stringify({
    phase: gameState.phase,
    meAlive: me?.alive,
    myVote,
    myReady,
    myMorningSeen,
    myFinalResultsSeen,
    myAction,
    voteResultType: gameState.voteResults?.resultType || "",
    finalResultType: gameState.finalResult?.type || "",
    nightResultCount: (gameState.nightPrivateResults || []).filter(
      r => r.playerId === currentPlayerId
    ).length
  })
}

function renderOnlineGame() {
  const gameState = demoRoom?.gameState
  applyOnlinePhaseTheme(gameState?.phase)

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

const leaveButtonHTML = `
  <div style="margin-top:16px; text-align:center;">
    <button class="skip-btn" onclick="window.leaveOnlineRoom()">Leave Room</button>
  </div>
`

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
  if (hasOnlinePlayerSeenMorning()) {
    renderOnlineVoting()
  } else {
    renderOnlineMorning()
  }
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

  if (gameState.phase === "game_over") {
  if (hasOnlinePlayerSeenFinalResults()) {
    renderOnlineFinalResults()
  } else {
    renderOnlineGameOver()
  }
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


function getOnlineFinalWinnerBanner() {
  const finalResult = demoRoom?.gameState?.finalResult || {}

  if (finalResult.type === "mafia_win") {
    return {
      className: "mafia-win-banner",
      label: "Winner",
      title: "MAFIA WINS",
      subtitle: "The mafia have taken control of the town."
    }
  }

  if (finalResult.type === "village_win") {
    return {
      className: "village-win-banner",
      label: "Winner",
      title: "VILLAGE WINS",
      subtitle: "The town has eliminated all mafia members."
    }
  }

  if (finalResult.type === "jester_win") {
    return {
      className: "neutral-win-banner",
      label: "Winner",
      title: "JESTER WINS",
      subtitle: `${finalResult.winner} tricked the town into voting them out.`
    }
  }

  if (finalResult.type === "executioner_win") {
    return {
      className: "neutral-win-banner",
      label: "Winner",
      title: "EXECUTIONER WINS",
      subtitle: `${finalResult.winner} achieved their goal.`
    }
  }

  if (finalResult.type === "jester_executioner_win") {
    return {
      className: "neutral-win-banner",
      label: "Winners",
      title: "JESTER & EXECUTIONER WIN",
      subtitle: `${finalResult.winner} and ${finalResult.executionerWinner} both achieved victory.`
    }
  }

  if (finalResult.type === "village_executioner_win") {
    return {
      className: "mixed-win-banner",
      label: "Winners",
      title: "VILLAGE & EXECUTIONER WIN",
      subtitle: `${finalResult.winner} succeeded, and the town also won.`
    }
  }

  return {
    className: "village-win-banner",
    label: "Result",
    title: "GAME OVER",
    subtitle: "The match has ended."
  }
}

function getOnlineEffectiveTeam(player) {
  if (player.role === "schrodingers_cat" && player.catAlignment) {
    return player.catAlignment
  }

  return roles[player.role]?.team || "neutral"
}

function renderOnlineFinalRoleList(list) {
  if (!list.length) {
    return `<div class="final-empty-state">None</div>`
  }

  return list.map(p => {
    const color = roleColors[p.role] || "white"
    const target = demoRoom?.gameState?.executionerTargets?.[p.name]

    if (p.role === "executioner" || p.wasExecutioner) {
      const execColor = roleColors.executioner
      const turnedInto = p.wasExecutioner && p.executionerConvertedTo
        ? roleDisplayName(p.executionerConvertedTo)
        : null

      return `
        <div class="final-player-card executioner-row"
             style="--final-role-color:${execColor};">

          <div class="final-player-main">
            <div class="final-player-name">${p.name}</div>
            <div class="final-player-role" style="color:${execColor}">
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
          <div class="executioner-target-reveal final-target-reveal">
            <span class="executioner-target-reveal-label">Target:</span>
            <span class="executioner-target-reveal-name">${target}</span>
          </div>
        ` : ""}
      `
    }

    if (p.role === "schrodingers_cat" && p.catAlignment) {
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

function renderOnlineFinalResults() {
  const players = demoRoom?.gameState?.players || []
  const logEntries = demoRoom?.gameState?.gameLog || []
  const stats = demoRoom?.gameState?.gameStats || {
    nights: 0,
    votesCast: 0,
    eliminations: 0
  }

  const logHTML = logEntries.length
    ? logEntries.map(entry => {
        const isHeader = entry.startsWith("Night ") || entry.startsWith("Day ")
        return `<p class="log-entry ${isHeader ? "log-header" : ""}">${entry}</p>`
      }).join("")
    : `<p style="opacity:0.7;">No log entries recorded.</p>`

  const mafia = players.filter(p => getOnlineEffectiveTeam(p) === "mafia")
  const town = players.filter(p => getOnlineEffectiveTeam(p) === "village")
  const neutral = players.filter(p => getOnlineEffectiveTeam(p) === "neutral")

  const winnerBanner = getOnlineFinalWinnerBanner()

  document.body.className = "win-village"

  render(
    buildSharedFinalResultsScreen({
      winnerBanner,
      stats: {
        nights: stats.nights || 0,
        votesCast: stats.votesCast || 0,
        eliminations: stats.eliminations || 0,
        players: players.length,
        mafiaCount: mafia.length,
        townCount: town.length,
        neutralCount: neutral.length
      },
      mafiaHTML: renderOnlineFinalRoleList(mafia),
      townHTML: renderOnlineFinalRoleList(town),
      neutralHTML: renderOnlineFinalRoleList(neutral),
      logHTML,
      continueButtonHTML: `
  ${renderOnlineProgressBox({
    includeDead: true,
    label: "Players Ready"
  })}
  <div class="reveal-role-actions">
    ${renderOnlineProceedButton("Back To Lobby", { includeDead: true })}
  </div>
`
    })
  )
}

function renderOnlineGameOver() {
  const finalResult = demoRoom?.gameState?.finalResult || {}
  const players = demoRoom?.gameState?.players || []

if (finalResult.type === "jester_executioner_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-jester-executioner",
    cardClass: "role-jester",
    title: "JESTER & EXECUTIONER WIN",
    linesHTML: `
      <p>${finalResult.winner} was voted out and wins as the Jester.</p>
      <p>${finalResult.executionerWinner} also wins because ${finalResult.winner} was their target.</p>
    `,
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

if (finalResult.type === "village_executioner_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-village-executioner",
    cardClass: "role-executioner",
    title: "VILLAGE & EXECUTIONER WIN",
    linesHTML: `
      <p>${finalResult.winner} succeeded in getting ${finalResult.target} voted out!</p>
      <p>The village also wins because ${finalResult.target} was a part of the mafia.</p>
    `,
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

  if (finalResult.type === "jester_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-jester",
    cardClass: "role-jester",
    title: "JESTER WINS",
    linesHTML: `
      <p>${finalResult.winner} tricked the town into voting them out!</p>
    `,
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

  if (finalResult.type === "executioner_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-executioner",
    cardClass: "role-executioner",
    title: "EXECUTIONER WINS",
    linesHTML: `
      <p>${finalResult.winner} succeeded in getting ${finalResult.target} voted out!</p>
    `,
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

  if (finalResult.type === "mafia_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-mafia",
    cardClass: "role-mafia",
    title: "MAFIA WINS",
    linesHTML: `
      <p>The mafia have taken control of the town.</p>
    `,
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

if (finalResult.type === "village_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-village",
    cardClass: "role-doctor",
    title: "VILLAGE WINS",
    linesHTML: `
      <p>The town has eliminated all mafia members.</p>
    `,
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

  document.body.className = "win-village"

  render(`
    <div class="card role-doctor">
      <h1 class="role-title">GAME OVER</h1>
      <p>The game has ended.</p>

      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    </div>
  `)
}

window.flipOnlineRoleCard = function() {
  const card = document.getElementById("roleCard")
  if (card) {
    card.classList.add("revealed")
  }
}

function renderOnlineRoleReveal() {
  const me = getOnlineMe()
  if (!me) return

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

  render(
    buildSharedRoleRevealScreen({
      playerName: me.name,
      role: me.role,
      roleDescription: role?.description || "",
      progressText: currentRoomCode,
      hintText: "Tap the card to reveal",
      extraInfoHTML: extraInfo,
      continueButtonHTML: `
        ${renderOnlineProgressBox()}
        ${renderOnlineProceedButton("Continue")}
      `,
      flipped: false,
      flipHandler: `id="roleCard" onclick="window.flipOnlineRoleCard()"`
    })
  )
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

function renderOnlineNightActionCard({
  me,
  hint = "Choose your action",
  panelLabel = "Decision",
  panelText = "Choose your target.",
  buttonsHTML = "",
  submitted = false,
  submittedText = "You are ready.",
  actionButtonHTML = ""
}) {
  const alivePlayers = getOnlineAlivePlayers()
  const currentNightPlayerNumber =
    alivePlayers.findIndex(player => player.id === me.id) + 1

  render(
    buildSharedNightActionScreen({
      playerName: me.name,
      role: me.role,
      progressText: `${currentNightPlayerNumber} / ${alivePlayers.length}`,
      hintText: hint,
      panelLabel,
      panelText,
      buttonsHTML,
      submitted,
      submittedText,
      progressBoxHTML: renderOnlineProgressBox(),
      actionButtonHTML
    })
  )
}

function renderOnlineNightResultCard({
  me,
  hint = "Your night result",
  boxClass = "",
  boxKicker = "Result",
  title = "",
  titleColor = "",
  bodyText = "",
  continueLabel = "Continue"
}) {
  render(
    buildSharedNightResultScreen({
      playerName: me.name,
      role: me.role,
      progressText: currentRoomCode,
      hintText: hint,
      boxClass,
      boxKicker,
      title,
      titleColor,
      bodyText,
      progressBoxHTML: renderOnlineProgressBox(),
      continueButtonHTML: renderOnlineProceedButton(continueLabel)
    })
  )
}

function renderOnlineNightSelect() {
  const me = getOnlineMe()
  if (!me) return

  const myAction = getMySubmittedAction()
  const role = roles[me.role]

  const actionText = {
    mafia: "Choose someone to eliminate under cover of darkness.",
    doctor: "Choose one player to protect tonight.",
    sheriff: "Choose one player to investigate.",
    framer: "Choose someone to frame before the Sheriff investigates.",
    vigilante: "Serve justice carefully — or stand down."
  }

  const hintText = {
    mafia: "Move in secret",
    doctor: "Protect wisely",
    sheriff: "Seek the truth",
    framer: "Plant suspicion",
    vigilante: "Justice has a cost"
  }

  if (myAction) {
    let submittedText = "You are ready."

    if (myAction.type === "kill" && myAction.target) {
      submittedText = `You chose ${myAction.target}.`
    } else if (myAction.type === "save" && myAction.target) {
      submittedText = `You chose to protect ${myAction.target}.`
    } else if (myAction.type === "investigate" && myAction.target) {
      submittedText = `You chose to investigate ${myAction.target}.`
    } else if (myAction.type === "frame" && myAction.target) {
      submittedText = `You chose to frame ${myAction.target}.`
    } else if (myAction.type === "skip") {
      submittedText = `You chose to skip your action.`
    } else if (myAction.type === "none") {
      submittedText = `You have finished for the night.`
    } else if (myAction.type === "holy_shield" && myAction.target === "__use__") {
  submittedText = `You chose to use Holy Spirit.`
} else if (myAction.type === "holy_shield" && myAction.target === "__skip__") {
  submittedText = `You chose to skip Holy Spirit.`
}

    renderOnlineNightActionCard({
      me,
      hint: "Waiting for the rest of the players",
      submitted: true,
      submittedText
    })
    return
  }

if (me.role === "priest") {
  const usesLeft = me.priestUsesLeft ?? 1
  const canUse = usesLeft > 0

  renderOnlineNightActionCard({
    me,
    hint: "A blessing can change the whole night",
    panelLabel: "Decision",
    panelText: "Call upon the Holy Spirit to shield the town tonight?",
    buttonsHTML: `
      ${
        canUse
          ? `<button onclick="window.submitNightAction('holy_shield', '__use__')">Use Holy Spirit</button>`
          : `<button disabled>No Uses Left</button>`
      }
      <button class="skip-btn" onclick="window.submitNightAction('holy_shield', '__skip__')">Skip Holy Spirit</button>
    `
  })
  return
}

  if (!role?.nightAction) {
  renderOnlineNightActionCard({
    me,
    hint: "Sleep peacefully tonight",
    panelLabel: "Night",
    panelText: "You have no action tonight.",
    actionButtonHTML: `<button class="primary-btn" onclick="window.submitNightAction('none')">Continue</button>`
  })
  return
}

  const alivePlayers = getOnlineAlivePlayers()

  const validTargets = alivePlayers.filter(player => {
    if (player.id === me.id) {
      return me.role === "doctor"
    }

    if (me.role === "mafia") {
      return player.role !== "mafia" && player.role !== "framer" && player.role !== "traitor"
    }

    if (me.role === "framer") {
      return player.role !== "mafia" && player.role !== "framer" && player.role !== "traitor"
    }

    return true
  })

  const buttonsHTML = validTargets.map(player => `
  <button onclick="window.submitNightAction('${getActionType(me.role)}', '${player.name}')">
    ${player.name}${player.id === me.id ? ` <span style="opacity:0.6;">(You)</span>` : ""}
  </button>
`).join("")

  const skipButton =
    me.role === "vigilante"
      ? `<button class="skip-btn" onclick="window.submitNightAction('skip')">Skip Attack</button>`
      : ""

  renderOnlineNightActionCard({
    me,
    hint: hintText[me.role] || "Choose your action",
    panelLabel: "Decision",
    panelText: actionText[me.role] || "Choose your target.",
    buttonsHTML: buttonsHTML + skipButton
  })
}

function getActionType(role) {
  if (role === "mafia") return "kill"
  if (role === "doctor") return "save"
  if (role === "sheriff") return "investigate"
  if (role === "vigilante") return "kill"
  if (role === "framer") return "frame"
  return "none"
}

function getOnlineNoResultText(role) {
  const pool = roles[role]?.noResultTexts || []

  if (!pool.length) {
    return "The night passes in uneasy silence."
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

function renderOnlineNightResults() {
  const me = getOnlineMe()
  if (!me) return

  const myResult = (demoRoom?.gameState?.nightPrivateResults || []).find(
    result => result.playerId === currentPlayerId
  )

  if (myResult?.type === "investigate") {
    renderOnlineNightResultCard({
      me,
      hint: "Your investigation is complete",
      boxClass: "sheriff-result-box",
      boxKicker: "Investigation Result",
      title: myResult.result || "UNKNOWN",
      titleColor: myResult.resultColor || roleColors.sheriff,
      bodyText: `${myResult.targetName} is your result tonight.`
    })
    return
  }

if (myResult?.type === "mafia_kill_blocked") {
  renderOnlineNightResultCard({
    me,
    hint: "Your attack failed",
    boxClass: "mafia-result-box",
    boxKicker: "Attack Failed",
    title: (myResult.targetName || "Unknown").toUpperCase(),
    titleColor: roleColors.mafia,
    bodyText: `Your attack on ${myResult.targetName} was stopped by the Doctor!`
  })
  return
}

if (myResult?.type === "mafia_kill_blocked_priest") {
  renderOnlineNightResultCard({
    me,
    hint: "Holy power stopped the attack",
    boxClass: "priest-result-box",
    boxKicker: "Holy Shield Held",
    title: (myResult.targetName || "Unknown").toUpperCase(),
    titleColor: roleColors.priest,
    bodyText: `Your attack on ${myResult.targetName} was stopped by the Holy Spirit.`
  })
  return
}

  if (myResult?.type === "doctor_save_success") {
    renderOnlineNightResultCard({
      me,
      hint: "You saved someone tonight",
      boxClass: "doctor-result-box",
      boxKicker: "Save Successful",
      title: (myResult.targetName || "Unknown").toUpperCase(),
      titleColor: roleColors.doctor,
      bodyText: "You successfully saved your patient."
    })
    return
  }

  if (myResult?.type === "framer_success") {
    renderOnlineNightResultCard({
      me,
      hint: "Your deception worked",
      boxClass: "framer-result-box",
      boxKicker: "Framed Successfully",
      title: (myResult.targetName || "Unknown").toUpperCase(),
      titleColor: roleColors.framer,
      bodyText: "You successfully framed your target."
    })
    return
  }

  if (myResult?.type === "vigilante_result") {
  let title = "VIGILANTE OUTCOME"
  let bodyText = `You headed to slash ${myResult.targetName}.`

  if (!myResult.targetDied) {
    bodyText = `You headed to slash ${myResult.targetName}. But when you got there, they were already dead.`
  } else if (myResult.wrongTarget) {
    const targetRole = myResult.targetRole?.toUpperCase() || "TOWN"

    if (myResult.vigilanteDies) {
      bodyText = `You headed to slash ${myResult.targetName}. ${myResult.targetName} was a ${targetRole}. How could this have happened? You slash yourself and both of you die.`
    } else {
      bodyText = `You headed to slash ${myResult.targetName}. ${myResult.targetName} was a ${targetRole}. You cannot believe your eyes, but you're determined to correct your mistakes...`
    }
  } else {
    const targetRole = myResult.targetRole?.toUpperCase() || "MAFIA"
    bodyText = `You headed to slash ${myResult.targetName}. ${myResult.targetName} was a ${targetRole}, and you stand proudly over the body.`
  }

  renderOnlineNightResultCard({
    me,
    hint: "You carried out your attack",
    boxClass: "vigilante-result-box",
    boxKicker: "Night Results",
    title,
    titleColor: roleColors.vigilante,
    bodyText
  })
  return
}

  if (myResult?.type === "vigilante_blocked") {
  renderOnlineNightResultCard({
    me,
    hint: "Your attack failed",
    boxClass: "vigilante-result-box",
    boxKicker: "Attack Failed",
    title: (myResult.targetName || "Unknown").toUpperCase(),
    titleColor: roleColors.vigilante,
    bodyText: `Your attack on ${myResult.targetName} was stopped by the Doctor!`
  })
  return
}

if (myResult?.type === "vigilante_blocked_priest") {
  renderOnlineNightResultCard({
    me,
    hint: "Holy power stopped the attack",
    boxClass: "priest-result-box",
    boxKicker: "Holy Shield Held",
    title: (myResult.targetName || "Unknown").toUpperCase(),
    titleColor: roleColors.priest,
    bodyText: `Your attack on ${myResult.targetName} was stopped by the Holy Spirit.`
  })
  return
}

  if (myResult?.type === "priest_result") {
  const blockedRoles = myResult.blockedRoles || []
  const blockedText = blockedRoles.length
    ? blockedRoles.join(" and ")
    : "No attacks"

  renderOnlineNightResultCard({
    me,
    hint: "Your blessing protected the town",
    boxClass: "priest-result-box",
    boxKicker: "Holy Spirit Outcome",
    title: blockedText.toUpperCase(),
    titleColor: roleColors.priest,
    bodyText: blockedRoles.length
      ? "were blocked by the Holy Spirit."
      : "No attacks were blocked by the Holy Spirit."
  })
  return
}

const meInState = getOnlineMe()
const doomedTonight = !!meInState?.doomedTonight

  renderOnlineNightResultCard({
  me,
  hint: "Nothing special reached you tonight",
  boxKicker: "Your Role",
  title: roleDisplayName(me.role),
  titleColor: roleColors[me.role] || "white",
  bodyText: doomedTonight
    ? "You had a terrifying nightmare, you have a bad feeling about tonight..."
    : getOnlineNoResultText(me.role)
})
}

function renderOnlineMorning() {
  const publicResults = demoRoom?.gameState?.nightResolved?.publicResults || []
  const vigilanteReveal = demoRoom?.gameState?.vigilantePublicReveal || null
  const players = getOnlinePresentPlayers()

  const playersHTML = players.map(player => `
    <div class="status-row ${player.alive !== false ? "alive" : "dead"}">
      <span>${player.name}</span>
      <span>${player.alive !== false ? "Alive" : "Dead ☠"}</span>
    </div>
  `).join("")

  const morningCards = [...publicResults]

  if (vigilanteReveal) {
    let text = ""

    if (vigilanteReveal.blocked) {
      if (vigilanteReveal.blockedByHolySpirit) {
        text = `The Vigilante tried to slash <strong>${vigilanteReveal.target}</strong>, but a holy spirit shield protected the town.`
      } else {
        text = `The Vigilante tried to slash <strong>${vigilanteReveal.target}</strong>, but the Doctor protected them.`
      }
    } else if (vigilanteReveal.wrongTarget) {
      text = `${vigilanteReveal.target} was slashed by the Vigilante.`

      if (vigilanteReveal.vigilanteDies) {
        text += `<br>The Vigilante stabs their own heart in devastation.`
      }
    } else if (!vigilanteReveal.targetDied) {
      text = `The Vigilante tried to slash <strong>${vigilanteReveal.target}</strong>, but nothing happened.`
    } else {
      text = `${vigilanteReveal.target} was slashed by the Vigilante.`
    }

    morningCards.push({
      type: "vigilante",
      text
    })
  }

  let resultsHTML = ""

  if (!morningCards.length) {
    resultsHTML = `
      <div class="morning-result-card night-result-peace">
        <div class="morning-result-kicker">Night</div>
        <div class="morning-result-text">The night was quiet.</div>
      </div>
    `
  } else {
    resultsHTML = morningCards.map(result => {
      let extraClass = "night-result-peace"
      let kicker = "Night"

      if (result.type === "death") {
        extraClass = "night-result-death"
        kicker = "Eliminated"
      }

      if (result.type === "save") {
        extraClass = "night-result-save"
        kicker = "Survived"
      }

      if (result.type === "priest_shield") {
        extraClass = "night-result-priest"
        kicker = "Holy Protection"
      }

      if (result.type === "vigilante") {
        extraClass = "night-result-vigilante"
        kicker = "Vigilante"
      }

      return `
        <div class="morning-result-card ${extraClass}">
          <div class="morning-result-kicker">${kicker}</div>
          <div class="morning-result-text">
            ${result.text}
          </div>
        </div>
      `
    }).join("")
  }

  render(
    buildSharedMorningScreen({
      resultsHTML,
      playersHTML,
      progressBoxHTML: renderOnlineVoteProgressBox(),
      continueButtonHTML: hasOnlinePlayerSeenMorning()
        ? `
            <button class="primary-btn" disabled>
              Waiting For Your Vote
            </button>
          `
        : `
            <button class="morning-btn" onclick="window.advanceOnlineMorning()">
              Continue
            </button>
          `
    })
  )
}

function renderOnlineVoting() {
  const me = getOnlineMe()
  if (!me) return

  const alivePlayers = getOnlineAlivePlayers()
  const myVote = demoRoom?.gameState?.votes?.[currentPlayerId] || null
  const votes = demoRoom?.gameState?.votes || {}
const voteCount = Object.keys(votes).length
const totalVoters = getOnlineAlivePlayers().length

  let buttons = ""

  alivePlayers.forEach(player => {
    buttons += `
      <button
  class="vote-player-btn ${myVote === player.name ? "selected-vote" : ""}"
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
      class="skip-btn vote-skip-btn ${myVote === "skip" ? "selected-vote" : ""}"
      onclick="window.submitOnlineVote('skip')"
      ${myVote ? "disabled" : ""}
    >
      <span class="vote-player-name">Skip Vote</span>
      <span class="vote-player-label">No elimination</span>
    </button>
  `

  const playersHTML = getOnlinePresentPlayers().map(player => {
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
    ${
      myVote
        ? `You have chosen ${myVote === "skip" ? "to skip" : myVote}.`
        : "Choose who should be eliminated before night falls."
    }
  </div>

  <div class="current-voter-pill">
  <span class="current-voter-dot"></span>
  <strong id="onlineVoteCount">${voteCount} / ${totalVoters} players have voted</strong>
</div>

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

      <div class="voting-grid">
        ${buttons}
      </div>

      <div class="player-status-box">
        <h3>Players</h3>
        ${playersHTML}
      </div>

      ${renderOnlineVoteProgressBox()}

    </div>
  `)
}

function renderOnlineVoteResults() {
  const voteResults = demoRoom?.gameState?.voteResults || {
    voteCounts: {},
    eliminated: null,
    resultType: "none",
    revealedRole: null,
    winner: null
  }

  if (voteResults.resultType === "jester_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-jester",
    cardClass: "role-jester",
    title: "JESTER WINS",
    linesHTML: `
      <p>${voteResults.eliminated} tricked the town into voting them out!</p>
    `,
    progressBoxHTML: renderOnlineProgressBox(),
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
}

if (voteResults.resultType === "executioner_win") {
  const screen = buildSharedWinScreen({
    bodyClass: "win-executioner",
    cardClass: "role-executioner",
    title: "EXECUTIONER WINS",
    linesHTML: `
      <p>${voteResults.winner} succeeded in getting ${voteResults.eliminated} voted out!</p>
    `,
    progressBoxHTML: renderOnlineProgressBox(),
    continueButtonHTML: `
      <button class="primary-btn" onclick="window.advanceToOnlineFinalResults()">Continue</button>
    `
  })

  document.body.className = screen.bodyClass
  render(screen.html)
  return
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
      ${
        voteResults.revealedRole
          ? `
            <div class="vote-reveal-wrap">
              <div class="revealed-role">
                ${roleDisplayName(voteResults.revealedRole)}
              </div>
            </div>
          `
          : ""
      }
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

  const playersHTML = getOnlinePresentPlayers().map(player => {
    return `
      <div class="status-row ${player.alive !== false ? "alive" : "dead"}">
        <span>${player.name}</span>
        <span>${player.alive !== false ? "Alive" : "Dead ☠"}</span>
      </div>
    `
  }).join("")

  render(
  buildSharedVoteResultsScreen({
    outcomeHTML,
    resultsHTML,
    playersHTML,
    progressBoxHTML: renderOnlineProgressBox(),
    continueButtonHTML: renderOnlineProceedButton("Continue")
  })
)
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

window.showOnlineMenu = renderOnlineMenu
window.renderOnlineGame = renderOnlineGame
window.showOnlineSettingsEditor = showOnlineSettingsEditor