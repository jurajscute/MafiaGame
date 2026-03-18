export function resolveOnlineVotes(gameState) {
  const players = JSON.parse(JSON.stringify(gameState.players || []))
  const votes = gameState.votes || {}

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
  } else {
    gameLog.push("The town chose to skip elimination.")
  }

  eliminated = null
  resultType = tie ? "tie" : "skip"
} else {
    const eliminatedPlayer = players.find(p => p.name === eliminated)

    if (!eliminatedPlayer) {
      eliminated = null
      resultType = "none"
    } else {
      player.alive = false
gameStats.eliminations += 1
gameLog.push(`${player.name} was voted out by the town.`)
resultType = "elimination"

      const revealSetting = gameState?.settings?.revealRolesOnElimination || "none"

      if (
        revealSetting === "vote_only" ||
        revealSetting === "death_and_vote"
      ) {
        revealedRole = eliminatedPlayer.role
      }

      const executioner = players.find(p =>
        p.role === "executioner" &&
        p.alive !== false &&
        gameState.executionerTargets?.[p.name] === eliminated
      )

      const isJester = eliminatedPlayer.role === "jester"
      const isLastMafia =
        eliminatedPlayer.role === "mafia" &&
        players.filter(p => p.alive !== false && p.role === "mafia").length === 0

      if (isJester && executioner) {
        resultType = "jester_executioner_win"
        winner = executioner.name
        finalResult = {
          type: "jester_executioner_win",
          winner: eliminatedPlayer.name,
          executionerWinner: executioner.name
        }
      } else if (isJester) {
        resultType = "jester_win"
        gameLog.push(`${player.name} was voted out and won as the Jester.`)
        finalResult = {
          type: "jester_win",
          winner: eliminatedPlayer.name
        }
      } else if (executioner && isLastMafia) {
        resultType = "village_executioner_win"
        winner = executioner.name
        finalResult = {
          type: "village_executioner_win",
          winner: executioner.name,
          target: eliminatedPlayer.name
        }
      } else if (executioner) {
        resultType = "executioner_win"
        winner = executioner.name
        gameLog.push(`${winner} achieved their goal when ${eliminated} was voted out.`)
        finalResult = {
          type: "executioner_win",
          winner: executioner.name,
          target: eliminatedPlayer.name
        }
      }
    }
  }

  if (!finalResult) {
    const aliveAfterVote = players.filter(player => player.alive !== false)
    const mafiaAlive = aliveAfterVote.filter(player => player.role === "mafia").length
    const nonMafiaAlive = aliveAfterVote.filter(player => player.role !== "mafia").length

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
