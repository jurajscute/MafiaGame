import { render } from "../local/ui.js"
import { createRoom, createRoomPlayer } from "../core/onlineRoom.js"
import { roleDisplayName } from "../core/gameData.js"
import { db } from "./firebase.js"
import { ref, set, get, child, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"

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

  onValue(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      alert("Room no longer exists.")
      demoRoom = null
      currentRoomCode = null
      currentPlayerId = null
      currentIsHost = false
      window.showOnlineLobbyHome()
      return
    }

        if (demoRoom.phase === "in_game") {
      renderOnlineGame()
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

function renderOnlineGame() {
  const gameState = demoRoom?.gameState
  if (!gameState) return

  const me = gameState.players?.find(player => player.id === currentPlayerId)
  if (!me) {
    render(`
      <div class="card home-screen-card">
        <div class="home-hero">
          <div class="home-kicker">Online Game</div>
          <h2 class="home-title">Player Not Found</h2>
          <div class="home-subtitle">
            Your player entry was not found in this room.
          </div>
        </div>
      </div>
    `)
    return
  }

  const executionerTarget = gameState.executionerTargets?.[me.name] || null

  render(`
    <div class="card reveal-role-card role-${me.role}">
      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Online Game</div>
        <div class="reveal-role-progress">${gameState.phase}</div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${me.name}</div>
        <div class="reveal-role-hint">
          This is your private role. Do not show other players.
        </div>
      </div>

      <div class="night-action-role-box">
        <div class="night-action-role-kicker">Your Role</div>
        <div class="night-action-role-name">
          ${roleDisplayName(me.role)}
        </div>
        <p class="role-description">
          ${getRoleDescription(me.role)}
        </p>
      </div>

      ${
        executionerTarget
          ? `
            <div class="executioner-target-box">
              <div class="executioner-target-label">Your target is</div>
              <div class="executioner-target-name">${executionerTarget}</div>
            </div>
          `
          : ""
      }

      <div class="player-status-box" style="margin-top:16px;">
        <h3>Players in Game</h3>
        ${gameState.players.map(player => `
          <div class="status-row ${player.alive ? "alive" : "dead"}">
            <span>${player.name}</span>
            <span>${player.alive ? "Alive" : "Dead ☠"}</span>
          </div>
        `).join("")}
      </div>

      ${
        currentIsHost
          ? `
            <button class="primary-btn" onclick="window.advanceOnlinePhase()">
              Advance Phase
            </button>
          `
          : `
            <button class="primary-btn" disabled>
              Waiting For Host
            </button>
          `
      }
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

  const currentPhase = demoRoom.gameState.phase
  let nextPhase = currentPhase

  if (currentPhase === "role_reveal") nextPhase = "day"
  else if (currentPhase === "day") nextPhase = "night"
  else if (currentPhase === "night") nextPhase = "voting"
  else if (currentPhase === "voting") nextPhase = "day"

  try {
    await update(getOnlineRoomRef(), {
      "gameState/phase": nextPhase
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