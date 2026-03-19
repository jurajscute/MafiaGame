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

  const priestBlockedRoles = []

  const holyShields = actions.filter(a => a.type === "holy_shield")
  const saves = actions.filter(a => a.type === "save")
  const investigates = actions.filter(a => a.type === "investigate")
  const frames = actions.filter(a => a.type === "frame")

  const mafiaKills = actions.filter(a => {
    const actor = players.find(player => player.id === a.playerId)
    return actor?.role === "mafia" && a.type === "kill"
  })

  const vigilanteShots = actions.filter(a => {
    const actor = players.find(player => player.id === a.playerId)
    return actor?.role === "vigilante" && a.type === "kill"
  })

  const holyShieldUsers = holyShields.filter(action => action.target === "__use__")
  const holyShieldActive = holyShieldUsers.length > 0

  holyShieldUsers.forEach(action => {
    const priest = players.find(player => player.id === action.playerId)
    if (!priest || priest.alive === false) return

    const currentUses = priest.priestUsesLeft ?? 1
    if (currentUses <= 0) return

    priest.priestUsesLeft = Math.max(0, currentUses - 1)
  })

  let mafiaKill = null
  let mafiaKillActorId = null

  const mafiaPlayers = players.filter(
    player => player.role === "mafia" && player.alive !== false
  )

  if (mafiaPlayers.length) {
    const mafiaKillAction = mafiaKills.find(action => {
      const actor = players.find(player => player.id === action.playerId)
      return actor?.role === "mafia" && actor.alive !== false
    })

    if (mafiaKillAction) {
      mafiaKill = mafiaKillAction.target
      mafiaKillActorId = mafiaKillAction.playerId
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

  vigilanteShots.forEach(action => {
    const shooter = players.find(player => player.id === action.playerId)
    const target = getPlayerByName(players, action.target)

    if (!shooter || shooter.alive === false || !target || target.alive === false) {
      return
    }

    if (holyShieldActive) {
      priestBlockedRoles.push("Vigilante")

      privateResults.push({
        playerId: shooter.id,
        type: "vigilante_blocked_priest",
        targetName: target.name
      })

      return
    }

    if (savedTargets.includes(target.name)) {
      privateResults.push({
        playerId: shooter.id,
        type: "vigilante_blocked",
        targetName: target.name
      })

      return
    }

    markDoomed(target)
    if (!nightDeaths.includes(target.name)) {
      nightDeaths.push(target.name)
    }

    const targetTeam = target.catAlignment || roles[target.role]?.team || "neutral"
    const wrongTarget = targetTeam !== "mafia" && targetTeam !== "neutral"

    if (wrongTarget) {
      markDoomed(shooter)

      if (!nightDeaths.includes(shooter.name)) {
        nightDeaths.push(shooter.name)
      }

      gameLog.push(`${shooter.name} attacked the wrong target and will also die.`)

      privateResults.push({
        playerId: shooter.id,
        type: "vigilante_result",
        title: "WRONG TARGET",
        text: `${target.name} was not Mafia or Neutral. You will die too.`
      })
    } else {
      gameLog.push(`${shooter.name} killed ${target.name} as the Vigilante.`)

      privateResults.push({
        playerId: shooter.id,
        type: "vigilante_result",
        title: "TARGET ELIMINATED",
        text: `${target.name} was eliminated.`
      })
    }
  })

  if (mafiaKill) {
    const target = getPlayerByName(players, mafiaKill)

    if (target && isAlive(target)) {
      if (holyShieldActive) {
        priestBlockedRoles.push("Mafia")

        gameLog.push(`Holy Spirit blocked the Mafia's attack on ${target.name}.`)

        publicResults.push({
          type: "priest_shield",
          text: "A holy spirit shield protected the town last night."
        })

        const mafiaKiller = players.find(player => player.id === mafiaKillActorId)
        if (mafiaKiller && mafiaKiller.alive !== false) {
          privateResults.push({
            playerId: mafiaKiller.id,
            type: "mafia_kill_blocked_priest",
            targetName: target.name
          })
        }
      } else if (savedTargets.includes(target.name)) {
        gameLog.push(`${target.name} was saved by the Doctor.`)

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
        if (!nightDeaths.includes(target.name)) {
          nightDeaths.push(target.name)
        }

        gameLog.push(`${target.name} was killed during the night.`)

        publicResults.push({
          type: "death",
          text: `${target.name} was found dead in the morning.`
        })
      }
    }
  }

  holyShieldUsers.forEach(action => {
    const priest = players.find(player => player.id === action.playerId)
    if (!priest || priest.alive === false) return

    privateResults.push({
      playerId: priest.id,
      type: "priest_result",
      blockedRoles: [...new Set(priestBlockedRoles)]
    })
  })

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
    const team = player.catAlignment || roles[player.role]?.team
    return team === "mafia"
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