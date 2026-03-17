export function createRoom({ roomCode, hostName }) {
  return {
    roomCode,
    hostName,
    createdAt: Date.now(),

    phase: "lobby", // lobby | role_reveal | night | voting | morning | ended

    players: [],
    hostId: null,

    gameState: null
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