import { roles } from "./roles.js"
import { shouldRevealRoleOnElimination } from "./gameSettings.js"
export function resolveOnlineVotes(gameState) {
  const players = JSON.parse(JSON.stringify(gameState.players || []))
  const votes = gameState.votes || {}

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
  let eliminated = null
  let tie = false

  alivePlayers.forEach(player => {
    const targetName = votes[player.id]

    if (!targetName) return

    if (!voteCounts[targetName]) {
      voteCounts[targetName] = 0
    }

    const voter = players.find(p => p.id === player.id)

    let votePower = 1

    if (voter?.role === "mayor" && voter.alive !== false) {
      votePower = 2
    }

    voteCounts[targetName] += votePower
  })

  for (const [name, count] of Object.entries(voteCounts)) {
    if (count > highest) {
      highest = count
      eliminated = name
      tie = false
    } else if (count === highest) {
      tie = true
    }
  }

  let resultType = "none"
  let revealedRole = null
  let winner = null
  let finalResult = null

  if (tie || !eliminated || eliminated === "skip") {
    if (tie) {
      gameLog.push("The town vote ended in a tie.")
      resultType = "tie"
    } else {
      gameLog.push("The town chose to skip elimination.")
      resultType = "skip"
    }

    eliminated = null
  } else {
    const player = players.find(p => p.name === eliminated)

    if (!player) {
      eliminated = null
      resultType = "none"
    } else {
      player.alive = false
      gameStats.eliminations += 1
      gameLog.push(`${player.name} was voted out by the town.`)
      resultType = "elimination"

     const reveal = shouldRevealRoleOnElimination(
  "vote",
  gameState.settings
)

revealedRole = reveal ? player.role : null

      if (player.role === "jester") {
        resultType = "jester_win"
        gameLog.push(`${player.name} was voted out and won as the Jester.`)
      }

      const executioner = players.find(p =>
        (p.role === "executioner" || p.wasExecutioner) &&
        p.alive !== false &&
        gameState.executionerTargets?.[p.name] === eliminated
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
        gameLog.push(`${winner} achieved their goal when ${eliminated} was voted out.`)

        if (roles[player.role]?.team === "mafia") {
          finalResult = {
            type: "village_executioner_win",
            winner,
            target: eliminated
          }
        } else {
          finalResult = {
            type: "executioner_win",
            winner,
            target: eliminated
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

  const aliveAfterVote = players.filter(player => player.alive !== false)
  const mafiaAlive = aliveAfterVote.filter(player => player.role === "mafia").length
  const nonMafiaAlive = aliveAfterVote.filter(player => player.role !== "mafia").length

  if (!finalResult) {
    if (mafiaAlive === 0) {
      finalResult = {
        type: "village_win"
      }
    } else if (mafiaAlive >= nonMafiaAlive) {
      finalResult = {
        type: "mafia_win"
      }
    }
  }

  return {
    players,
    voteResults: {
      voteCounts,
      eliminated,
      resultType,
      revealedRole,
      winner
    },
    finalResult,
    gameLog,
    gameStats
  }
}
