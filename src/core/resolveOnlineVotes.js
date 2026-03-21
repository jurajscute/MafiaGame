import { roles } from "./roles.js"
import { shouldRevealRoleOnElimination } from "./gameSettings.js"

export function resolveOnlineVotes(gameState, settingsOverride = null) {
  const players = JSON.parse(JSON.stringify(gameState.players || []))
  const votes = gameState.votes || {}

  // ✅ FIX: ensure settings are always available
  const settings = settingsOverride || gameState.settings || {}

  const gameLog = [...(gameState.gameLog || [])]
  const gameStats = {
    nights: 0,
    votesCast: 0,
    eliminations: 0,
    ...(gameState.gameStats || {})
  }

  const alivePlayers = players.filter(player => player.alive !== false)

  gameLog.push(`Day ${gameStats.nights}`)
  gameStats.votesCast += Object.keys(votes).length

  const voteCounts = {}
  let highest = 0
  let eliminatedId = null
  let tie = false

  // ✅ Count votes (store by target ID)
  alivePlayers.forEach(player => {
    const target = votes[player.id] // ⚠️ expected to be player.id (NOT name)

    if (!target) return

    if (!voteCounts[target]) {
      voteCounts[target] = 0
    }

    const voter = players.find(p => p.id === player.id)

    let votePower = 1
    if (voter?.role === "mayor" && voter.alive !== false) {
      votePower = 2
    }

    voteCounts[target] += votePower
  })

  // ✅ Determine highest vote
  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > highest) {
      highest = count
      eliminatedId = targetId
      tie = false
    } else if (count === highest) {
      tie = true
    }
  }

  let resultType = "none"
  let revealedRole = null
  let winner = null
  let finalResult = null
  let eliminatedName = null

  if (tie || !eliminatedId || eliminatedId === "skip") {
    if (tie) {
      gameLog.push("The town vote ended in a tie.")
      resultType = "tie"
    } else {
      gameLog.push("The town chose to skip elimination.")
      resultType = "skip"
    }

    eliminatedId = null
  } else {
    const player = players.find(p => p.id === eliminatedId)

    if (!player) {
      console.error("❌ Could not find eliminated player:", eliminatedId)
      eliminatedId = null
      resultType = "none"
    } else {
      player.alive = false
      eliminatedName = player.name

      gameStats.eliminations += 1
      gameLog.push(`${player.name} was voted out by the town.`)
      resultType = "elimination"

      // ✅ FIX: ensure settings are used correctly
      const reveal = shouldRevealRoleOnElimination("vote", settings)
      revealedRole = reveal ? player.role : null

      // 🎭 Jester win
      if (player.role === "jester") {
        resultType = "jester_win"
        gameLog.push(`${player.name} was voted out and won as the Jester.`)
      }

      // 🎯 Executioner check (uses NAME intentionally for mapping)
      const executioner = players.find(p =>
        (p.role === "executioner" || p.wasExecutioner) &&
        p.alive !== false &&
        gameState.executionerTargets?.[p.name] === player.name
      )

      if (executioner && resultType === "jester_win") {
        finalResult = {
          type: "jester_executioner_win",
          winner: player.name,
          executionerWinner: executioner.name
        }
      } else if (executioner) {
        resultType = "executioner_win"
        winner = executioner.name

        gameLog.push(`${winner} achieved their goal when ${player.name} was voted out.`)

        if (roles[player.role]?.team === "mafia") {
          finalResult = {
            type: "village_executioner_win",
            winner,
            target: player.name
          }
        } else {
          finalResult = {
            type: "executioner_win",
            winner,
            target: player.name
          }
        }
      } else if (resultType === "jester_win") {
        finalResult = {
          type: "jester_win",
          winner: player.name
        }
      }
    }
  }

  // ✅ Win condition check
  const aliveAfterVote = players.filter(player => player.alive !== false)
  const mafiaAlive = aliveAfterVote.filter(player => player.role === "mafia").length
  const nonMafiaAlive = aliveAfterVote.filter(player => player.role !== "mafia").length

  if (!finalResult) {
    if (mafiaAlive === 0) {
      finalResult = { type: "village_win" }
    } else if (mafiaAlive >= nonMafiaAlive) {
      finalResult = { type: "mafia_win" }
    }
  }

  // ✅ Safe debug logs
  console.log("ELIMINATED ID:", eliminatedId)
  console.log("ELIMINATED NAME:", eliminatedName)
  console.log("REVEALED ROLE:", revealedRole)

  return {
    players,
    voteResults: {
      voteCounts,
      eliminated: eliminatedName, // 👈 UI still uses name
      resultType,
      revealedRole,
      winner
    },
    finalResult,
    gameLog,
    gameStats
  }
}
