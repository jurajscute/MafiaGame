export function resolveOnlineVotes(gameState) {
  const players = JSON.parse(JSON.stringify(gameState.players || []))
  const votes = gameState.votes || {}

  const alivePlayers = players.filter(player => player.alive !== false)

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

  if (tie || !eliminated || eliminated === "skip") {
    eliminated = null
    resultType = tie ? "tie" : "skip"
  } else {
    const player = players.find(p => p.name === eliminated)

    if (!player) {
      eliminated = null
      resultType = "none"
    } else {
      player.alive = false
      resultType = "elimination"

      const revealSetting = gameState?.settings?.revealRolesOnElimination || "none"

      if (
        revealSetting === "vote_only" ||
        revealSetting === "death_and_vote"
      ) {
        revealedRole = player.role
      }

      if (player.role === "jester") {
        resultType = "jester_win"
      }

      const executioner = players.find(p =>
        p.role === "executioner" &&
        p.alive !== false &&
        gameState.executionerTargets?.[p.name] === eliminated
      )

      if (executioner) {
        resultType = "executioner_win"
        winner = executioner.name
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
    }
  }
}