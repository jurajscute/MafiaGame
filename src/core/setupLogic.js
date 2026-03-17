import { mafiaCount } from "./utils.js"

export function maxAllowedMafia(playerCount) {
  if (playerCount < 4) return 1
  if (playerCount <= 7) return 2
  if (playerCount <= 10) return 3
  if (playerCount <= 13) return 4
  return 5
}

export function getResolvedMafiaCount(playerCount, mafiaCountOverride = 0) {
  const auto = mafiaCount(playerCount)
  const max = maxAllowedMafia(playerCount)

  if (!mafiaCountOverride || mafiaCountOverride <= 0) {
    return Math.min(auto, max)
  }

  return Math.min(mafiaCountOverride, max)
}