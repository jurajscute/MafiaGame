export function createRoom({ roomCode, hostName }) {
  return {
    roomCode,
    hostName,
    createdAt: Date.now(),
    phase: "lobby",
    hostId: null,
    players: [],
    settings: {
      rolesEnabled: {
        ...defaultRolesEnabled()
      },
      roleWeights: {
        ...defaultRoleWeights()
      },
      roleCounts: {
        ...defaultRoleCounts()
      },
      doctorRevealSave: false,
      sheriffExactReveal: false,
      mafiaCountOverride: 0,
      revealRolesOnElimination: "none",
      sheriffJesterResult: "not_innocent",
      sheriffExecutionerResult: "not_innocent",
      framerKnowsSuccess: true,
      framerKnowsMafia: true,
      mafiaKnowsFramer: true,
      spiritRevealType: "exact",
      spiritActivation: "night_only",
      spiritCanSkipReveal: true,
      priestUsesPerGame: 1,
      mayorVotePower: 2,
      mafiaKillMethod: "leader",
      mafiaKnowsFirstLeader: false,
      vigilanteCanKillNeutrals: true,
      vigilanteWrongKillOutcome: "both_die",
      jesterWinIfVigilanteKilled: false,
      executionerWinIfVigilanteKillsTarget: false,
      executionerTargetRule: "neither",
      executionerWinIfDead: false,
      executionerBecomes: "jester"
    },
    gameState: {
  started: false,
  phase: "lobby",
  revealIndex: 0,
  players: [],
  hostMessage: ""
}
  }
}

function defaultRolesEnabled() {
  return {
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
    traitor: false
  }
}

function defaultRoleWeights() {
  return {
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
    traitor: 100
  }
}

function defaultRoleCounts() {
  return {
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
    traitor: 1
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