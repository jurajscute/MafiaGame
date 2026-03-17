import { shuffle } from "./utils.js"
import { getResolvedMafiaCount } from "./setupLogic.js"

const OPTIONAL_ROLES = [
  "doctor",
  "sheriff",
  "jester",
  "executioner",
  "mayor",
  "spirit",
  "framer",
  "vigilante",
  "priest",
  "schrodingers_cat",
  "traitor"
]

function buildOptionalRolePool(state) {
  const optionalPool = []

  OPTIONAL_ROLES.forEach(role => {
    if (!state.rolesEnabled?.[role]) return

    const weight = state.roleWeights?.[role] || 0
    const max = state.roleCounts?.[role] || 1

    for (let i = 0; i < max; i++) {
      const roll = Math.random() * 100
      if (roll < weight) {
        optionalPool.push(role)
      }
    }
  })

  return shuffle(optionalPool)
}

function getExecutionerPossibleTargets(players, executioner, executionerTargetRule) {
  return players.filter(p => {
    if (p.name === executioner.name) return false
    if (p.role === "executioner") return false

    if (executionerTargetRule === "neither") {
      return p.role !== "mafia" && p.role !== "jester"
    }

    if (executionerTargetRule === "mafia") {
      return p.role !== "jester"
    }

    if (executionerTargetRule === "jester") {
      return p.role !== "mafia"
    }

    return true
  })
}

export function assignRolesToPlayers(state) {
  const players = state.players
  const mafiaCount = getResolvedMafiaCount(players.length, state.mafiaCountOverride)

  const guaranteedRoles = []
  for (let i = 0; i < mafiaCount; i++) {
    guaranteedRoles.push("mafia")
  }

  const optionalPool = buildOptionalRolePool(state)

  const slotsLeft = Math.max(0, players.length - guaranteedRoles.length)

  const finalPool = [
    ...guaranteedRoles,
    ...optionalPool.slice(0, slotsLeft)
  ]

  while (finalPool.length < players.length) {
    finalPool.push("villager")
  }

  shuffle(finalPool)

  players.forEach((player, index) => {
    player.role = finalPool[index]
    player.catAlignment = null
    player.wasExecutioner = false
    player.executionerConvertedTo = null
    player.alive = true
  })

  players.forEach(player => {
    if (player.role === "priest") {
      player.priestUsesLeft = state.priestUsesPerGame
    } else {
      delete player.priestUsesLeft
    }
  })

  const mafiaPlayers = players
    .filter(player => player.role === "mafia")
    .map(player => player.name)

  state.mafiaLeaderOrder = shuffle([...mafiaPlayers])
  state.mafiaLeaderIndex = 0
  state.currentMafiaLeader = state.mafiaLeaderOrder[0] || null

  state.executionerTargets = {}

  const executioners = players.filter(player => player.role === "executioner")

  executioners.forEach(executioner => {
    const possibleTargets = getExecutionerPossibleTargets(
      players,
      executioner,
      state.executionerTargetRule
    )

    if (possibleTargets.length) {
      const target =
        possibleTargets[Math.floor(Math.random() * possibleTargets.length)]

      state.executionerTargets[executioner.name] = target.name
    }
  })

  return state
}