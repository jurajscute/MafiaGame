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
    started: true,
    phase: "role_reveal",
    revealIndex: 0,
    hostMessage: "Roles assigned. Everyone check your role.",
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