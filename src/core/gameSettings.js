export const DEFAULT_GAME_SETTINGS = {
  hostMode: false,

  mafiaCountOverride: 0,
  mafiaKillMethod: "leader",
  mafiaKnowsFirstLeader: false,
  mafiaKnowsFramer: true,

  revealRolesOnElimination: "none",

  doctorRevealSave: false,
  sheriffExactReveal: false,
  sheriffJesterResult: "not_innocent",
  sheriffExecutionerResult: "not_innocent",

  mayorVotePower: 2,

  spiritRevealType: "exact",
  spiritActivation: "night_only",
  spiritCanSkipReveal: true,

  framerKnowsSuccess: true,
  framerKnowsMafia: true,

  executionerTargetRule: "neither",
  executionerWinIfDead: false,
  executionerWinIfVigilanteKillsTarget: false,
  executionerBecomes: "jester",

  jesterWinIfVigilanteKilled: false,

  vigilanteCanKillNeutrals: true,
  vigilanteWrongKillOutcome: "both_die",

  priestUsesPerGame: 1,

  rolesEnabled: {
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
  },

  roleWeights: {
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
  },

  roleCounts: {
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

export function buildDefaultGameSettings() {
  return structuredClone(DEFAULT_GAME_SETTINGS)
}

export function mergeGameSettings(base = {}, overrides = {}) {
  return {
    ...structuredClone(DEFAULT_GAME_SETTINGS),
    ...base,
    ...overrides,
    rolesEnabled: {
      ...structuredClone(DEFAULT_GAME_SETTINGS.rolesEnabled),
      ...(base.rolesEnabled || {}),
      ...(overrides.rolesEnabled || {})
    },
    roleWeights: {
      ...structuredClone(DEFAULT_GAME_SETTINGS.roleWeights),
      ...(base.roleWeights || {}),
      ...(overrides.roleWeights || {})
    },
    roleCounts: {
      ...structuredClone(DEFAULT_GAME_SETTINGS.roleCounts),
      ...(base.roleCounts || {}),
      ...(overrides.roleCounts || {})
    }
  }
}

export function shouldRevealRoleOnElimination(source, settings) {
  const mode = settings?.revealRolesOnElimination || "none"

  if (mode === "none") return false
  if (mode === "death_and_vote") return true
  if (mode === "death") return source === "death"
  if (mode === "vote_only") return source === "vote"

  return false
}