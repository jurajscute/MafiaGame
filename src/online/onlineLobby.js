import { render } from "../local/ui.js"
import { createRoom, createRoomPlayer } from "../core/onlineRoom.js"
import { db } from "./firebase.js"
import {
  ref,
  set,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"

let demoRoom = null

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

  const playersHtml = demoRoom.players.map(player => `
    <li class="setup-player-card">
      <div class="setup-player-left">
        <div class="setup-player-avatar">👤</div>

        <div class="setup-player-input-wrap">
          <div class="setup-player-label">
            ${player.isHost ? "Host" : "Player"}
          </div>
          <div class="setup-player-input">${player.name}</div>
        </div>
      </div>
    </li>
  `).join("")

  render(`
    <div class="card setup-screen-card">
      <div class="setup-hero">
        <div class="setup-kicker">Online Lobby</div>
        <h2 class="setup-title">Room ${demoRoom.roomCode}</h2>
        <div class="setup-subtitle">
          This is your future online room. Networking comes next.
        </div>
      </div>

      <div class="setup-stat-row">
        <div class="setup-stat-pill">
          <span class="setup-stat-value">${demoRoom.players.length}</span>
          <span class="setup-stat-text">Player${demoRoom.players.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div class="setup-list-panel">
        <ul class="setup-player-list">
          ${playersHtml}
        </ul>
      </div>

      <div class="setup-actions">
        <button class="primary-btn" onclick="window.showOnlineNetworkingNotice()">
          Continue
        </button>

        <button class="skip-btn" onclick="window.showOnlineLobbyHome()">
          Leave Lobby
        </button>
      </div>
    </div>
  `)
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

  demoRoom = createRoom({
    roomCode,
    hostName
  })

  const hostPlayer = createRoomPlayer({
    id: "local-host",
    name: hostName,
    isHost: true
  })

  demoRoom.players.push(hostPlayer)
  demoRoom.hostId = hostPlayer.id

  try {
    await set(ref(db, `rooms/${roomCode}`), demoRoom)
    renderRoomLobby()
  } catch (error) {
    console.error("Failed to create room:", error)
    alert("Failed to create room.")
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

    render(`
      <div class="card setup-screen-card">
        <div class="setup-hero">
          <div class="setup-kicker">Room Found</div>
          <h2 class="setup-title">Room ${code}</h2>
          <div class="setup-subtitle">
            Connected to Firebase successfully.
          </div>
        </div>

        <div class="setup-list-panel">
          <div class="setup-empty-text">
            Host: <strong>${room.hostName}</strong><br>
            Players currently in room: <strong>${room.players?.length || 0}</strong><br><br>
            Next step: actually add the joining player into the room.
          </div>
        </div>

        <div class="setup-actions">
          <button class="primary-btn" onclick="window.showOnlineLobbyHome()">
            Back
          </button>
        </div>
      </div>
    `)
  } catch (error) {
    console.error("Failed to join room:", error)
    alert("Failed to load room.")
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