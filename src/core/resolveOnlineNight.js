import { roles } from "./roles.js"

function getPlayerByName(players, name) {
  return players.find(player => player.name === name)
}

function isAlive(player) {
  return !!player && player.alive !== false
}

function markDoomed(player) {
  if (!player) return
  player.doomedTonight = true
}

export function resolveOnlineNight(gameState, roomSettings = {}) {
  const players = structuredClone(gameState.players || [])
  const submittedActions = gameState.submittedActions || {}

  const gameLog = [...(gameState.gameLog || [])]
  const gameStats = {
    nights: 0,
    votesCast: 0,
    eliminations: 0,
    ...(gameState.gameStats || {})
  }

  const actions = Object.entries(submittedActions).map(([playerId, action]) => ({
    playerId,
    ...action
  }))

  gameStats.nights += 1
  gameLog.push(`Night ${gameStats.nights}`)

  const publicResults = []
  const privateResults = []
  const nightDeaths = []

const currentUses = priest.priestUsesLeft ?? 1
if (currentUses <= 0) return

  const holyShieldActive = holyShields.some(action => action.target === "__use__")
  const holyShields = actions.filter(a => a.type === "holy_shield")
  const kills = actions.filter(a => a.type === "kill")
  const saves = actions.filter(a => a.type === "save")
  const investigates = actions.filter(a => a.type === "investigate")
  const frames = actions.filter(a => a.type === "frame")

  let mafiaKill = null

  const mafiaPlayers = players.filter(
    player => player.role === "mafia" && player.alive !== false
  )

let mafiaKillActorId = null

holyShields.forEach(action => {
  if (action.target !== "__use__") return

  const priest = players.find(player => player.id === action.playerId)
  if (!priest || priest.alive === false) return

  const currentUses = priest.priestUsesLeft ?? 1
  priest.priestUsesLeft = Math.max(0, currentUses - 1)
})

if (mafiaPlayers.length) {
  const mafiaKillAction = kills.find(action => {
    const actor = players.find(player => player.id === action.playerId)
    return actor?.role === "mafia"
  })

  if (mafiaKillAction) {
    mafiaKill = mafiaKillAction.target
    mafiaKillActorId = mafiaKillAction.playerId
  }
}

  if (mafiaPlayers.length) {
    const mafiaKillAction = kills.find(action => {
      const actor = players.find(player => player.id === action.playerId)
      return actor?.role === "mafia"
    })

    if (mafiaKillAction) {
      mafiaKill = mafiaKillAction.target
    }
  }

  const savedTargets = saves.map(action => action.target)
  const framedTargets = frames.map(action => action.target)

  investigates.forEach(action => {
    const sheriff = players.find(player => player.id === action.playerId)
    const target = getPlayerByName(players, action.target)

    if (!sheriff || !target || sheriff.alive === false) return

    gameLog.push(`${sheriff.name} investigated someone.`)

    const isFramed = framedTargets.includes(target.name)
    const suspicious = isFramed || roles[target.role]?.team === "mafia"

    privateResults.push({
      playerId: sheriff.id,
      type: "investigate",
      targetName: target.name,
      result: suspicious ? "NOT INNOCENT" : "INNOCENT",
      resultColor: suspicious ? "#e74c3c" : "#b0e2ff"
    })
  })

  frames.forEach(action => {
    const framer = players.find(player => player.id === action.playerId)
    const target = getPlayerByName(players, action.target)

    if (!framer || framer.alive === false || !target) return

    gameLog.push(`${framer.name} framed someone.`)

    privateResults.push({
      playerId: framer.id,
      type: "framer_success",
      targetName: target.name
    })
  })

if (mafiaKill && holyShieldActive) {
  const target = getPlayerByName(players, mafiaKill)

  if (target && isAlive(target)) {
    gameLog.push(`Holy Spirit blocked the Mafia's attack on ${target.name}.`)

    publicResults.push({
      type: "priest_shield",
      text: "A holy spirit shield protected the town last night."
    })

    const mafiaActor = players.find(player => {
      if (player.alive === false) return false
      const submitted = submittedActions[player.id]
      return player.role === "mafia" && submitted?.type === "kill"
    })

    if (mafiaActor) {
      privateResults.push({
        playerId: mafiaActor.id,
        type: "mafia_kill_blocked_priest",
        targetName: target.name
      })
    }
  }
}

  if (mafiaKill) {
  const target = getPlayerByName(players, mafiaKill)

  if (target && isAlive(target)) {
    if (savedTargets.includes(target.name)) {
      publicResults.push({
        type: "save",
        text: `${target.name} was attacked, but someone saved them.`
      })

      saves.forEach(action => {
        const doctor = players.find(player => player.id === action.playerId)
        if (!doctor || doctor.alive === false) return
        if (action.target !== target.name) return

        privateResults.push({
          playerId: doctor.id,
          type: "doctor_save_success",
          targetName: target.name
        })
      })

      const mafiaKiller = players.find(player => player.id === mafiaKillActorId)
      if (mafiaKiller && mafiaKiller.alive !== false) {
        privateResults.push({
          playerId: mafiaKiller.id,
          type: "mafia_kill_blocked",
          targetName: target.name
        })
      }
    } else {
      markDoomed(target)
      nightDeaths.push(target.name)

      publicResults.push({
        type: "death",
        text: `${target.name} was found dead in the morning.`
      })
    }
  }
}

  if (!publicResults.length) {
    gameLog.push("The night was quiet.")

    publicResults.push({
      type: "peace",
      text: "The night was quiet."
    })
  }

  let finalResult = null

  const aliveAfterNight = players.filter(player => player.alive !== false)
  const mafiaAlive = aliveAfterNight.filter(player => {
    const team = roles[player.role]?.team
    return team === "mafia" || player.catAlignment === "mafia"
  }).length

  const nonMafiaAlive = aliveAfterNight.filter(player => {
    const team = player.catAlignment || roles[player.role]?.team
    return team !== "mafia"
  }).length

  if (mafiaAlive === 0) {
    finalResult = {
      type: "village_win"
    }
  } else if (mafiaAlive >= nonMafiaAlive) {
    finalResult = {
      type: "mafia_win"
    }
  }

    return {
    players,
    nightDeaths,
    nightResolved: {
      publicResults
    },
    nightPrivateResults: privateResults,
    gameLog,
    gameStats,
    finalResult
  }
}
