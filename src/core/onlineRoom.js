import { buildDefaultGameSettings } from "./gameSettings.js"

window.updateOnlineSetting = async function(path, value) {
  if (!currentIsHost || !demoRoom) return

  const settings = structuredClone(demoRoom.settings || {})
  setNestedValue(settings, path, value)

  await update(getOnlineRoomRef(), {
    settings
  })
}

export function createRoom({ roomCode, hostName }) {
  return {
    roomCode,
    hostName,
    createdAt: Date.now(),
    phase: "lobby",
    hostId: null,
    players: [],
    settings: buildDefaultGameSettings(),
  }
}

export function createRoomPlayer({ id, name, isHost = false }) {
  return {
    id,
    name,
    isHost,
    connected: true,
    joinedAt: Date.now()
  }
}