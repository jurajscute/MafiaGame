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

    voteCounts[targetName] += 1
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

  if (tie || !eliminated || eliminated === "skip") {
    eliminated = null
    resultType = tie ? "tie" : "skip"
  } else {
    const player = players.find(p => p.name === eliminated)
    if (player) {
      player.alive = false
      resultType = "elimination"
    } else {
      eliminated = null
      resultType = "none"
    }
  }

  return {
    players,
    voteResults: {
      voteCounts,
      eliminated,
      resultType
    }
  }
}