import { assignRolesToPlayers } from "./roleAssignment.js"

export function buildOnlineGameState(room) {
  const tempState = {
    players: room.players.map(player => ({
      name: player.name,
      id: player.id,
      alive: true,
      role: null,
      catAlignment: null,
      wasExecutioner: false,
      executionerConvertedTo: null
    })),
    rolesEnabled: room.settings.rolesEnabled || {},
    roleWeights: room.settings.roleWeights || {},
    roleCounts: room.settings.roleCounts || {},
    mafiaCountOverride: room.settings.mafiaCountOverride || 0,
    mafiaKillMethod: room.settings.mafiaKillMethod || "leader",
    executionerTargetRule: room.settings.executionerTargetRule || "neither",
    executionerTargets: {},
    mafiaLeaderOrder: [],
    mafiaLeaderIndex: 0,
    currentMafiaLeader: null,
    priestUsesPerGame: room.settings.priestUsesPerGame || 1
  }

  assignRolesToPlayers(tempState)

  return {

  gameLog: [],
gameStats: {
  nights: 0,
  votesCast: 0,
  eliminations: 0,
  nightKills: 0,
  saves: 0,
  investigations: 0,
  frames: 0,
  vigilanteShots: 0,
  skippedVotes: 0
},

  started: true,
  phase: "role_reveal",
  dayNumber: 1,
  nightNumber: 0,
  readyMap: {},
  submittedActions: {},
nightResolved: {
  publicResults: []
},
nightPrivateResults: [],
nightDeaths: [],
votes: {},
voteResults: null,
  players: tempState.players.map(player => ({
    id: player.id,
    name: player.name,
    alive: player.alive,
    role: player.role,
    catAlignment: player.catAlignment,
    wasExecutioner: player.wasExecutioner,
    executionerConvertedTo: player.executionerConvertedTo,
    priestUsesLeft: player.priestUsesLeft ?? null
  })),
  executionerTargets: tempState.executionerTargets || {},
  mafiaLeaderOrder: tempState.mafiaLeaderOrder || [],
  mafiaLeaderIndex: tempState.mafiaLeaderIndex || 0,
  currentMafiaLeader: tempState.currentMafiaLeader || null
}
}