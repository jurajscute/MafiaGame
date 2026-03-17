import { roles } from "./roles.js"

function getPlayerByName(players, name) {
  return players.find(player => player.name === name)
}

function isAlive(player) {
  return !!player && player.alive !== false
}

export function resolveOnlineNight(gameState, roomSettings = {}) {
  const players = structuredClone(gameState.players || [])
  const submittedActions = gameState.submittedActions || {}

  const actions = Object.entries(submittedActions).map(([playerId, action]) => ({
    playerId,
    ...action
  }))

  const publicResults = []
  const privateResults = []
  const nightDeaths = []

  const kills = actions.filter(a => a.type === "kill")
  const saves = actions.filter(a => a.type === "save")
  const investigates = actions.filter(a => a.type === "investigate")

  let mafiaKill = null

  const mafiaPlayers = players.filter(
    player => player.role === "mafia" && player.alive !== false
  )

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

  investigates.forEach(action => {
    const sheriff = players.find(player => player.id === action.playerId)
    const target = getPlayerByName(players, action.target)

    if (!sheriff || !target || sheriff.alive === false) return

    const suspicious = roles[target.role]?.team === "mafia"

    privateResults.push({
      playerId: sheriff.id,
      type: "investigate",
      text: suspicious
        ? `${target.name} is NOT INNOCENT`
        : `${target.name} is INNOCENT`
    })
  })

  if (mafiaKill) {
    const target = getPlayerByName(players, mafiaKill)

    if (target && isAlive(target)) {
      if (savedTargets.includes(target.name)) {
        publicResults.push({
          type: "save",
          text: `${target.name} was attacked but survived the night.`
        })

        saves.forEach(action => {
          const doctor = players.find(player => player.id === action.playerId)
          if (!doctor || doctor.alive === false) return
          if (action.target !== target.name) return

          privateResults.push({
            playerId: doctor.id,
            type: "doctor_save_success",
            text: `You successfully saved ${target.name}.`
          })
        })
      } else {
        target.alive = false
        nightDeaths.push(target.name)

        publicResults.push({
          type: "death",
          text: `${target.name} was killed during the night.`
        })
      }
    }
  }

  if (!publicResults.length) {
    publicResults.push({
      type: "peace",
      text: "The night was quiet."
    })
  }

  return {
    players,
    nightDeaths,
    nightResolved: {
      publicResults
    },
    nightPrivateResults: privateResults
  }
}