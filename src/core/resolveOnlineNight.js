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

  const kills = actions.filter(a => a.type === "kill")
  const saves = actions.filter(a => a.type === "save")
  const investigates = actions.filter(a => a.type === "investigate")
  const frames = actions.filter(a => a.type === "frame")

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

    privateResults.push({
      playerId: framer.id,
      type: "framer_success",
      targetName: target.name
    })
  })

  if (mafiaKill) {
    const target = getPlayerByName(players, mafiaKill)

    if (target && isAlive(target)) {
      if (savedTargets.includes(target.name)) {
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
      } else {
        target.alive = false
        nightDeaths.push(target.name)
        gameLog.push(`${target.name} was killed during the night.`)

        publicResults.push({
          type: "death",
          text: `${target.name} was found dead in the morning.`
        })
      }
    }
  }

  if (!publicResults.length) {
    publicResults.push({
      gameLog.push("The night was quiet.")
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
  nightPrivateResults: privateResults,
  gameLog,
  gameStats
}
}