import { roles } from "./roles.js"

export const roleColors = {
  mafia: "#e74c3c",
  doctor: "#2e8dcc",
  sheriff: "#e4c200",
  villager: "#8dc2ff",
  jester: "#ff3ea5",
  executioner: "#7a2f6f",
  mayor: "#1d8161",
  spirit: "#e6aafd",
  framer: "#8b0000",
  vigilante: "#3b48ff",
  priest: "#f6df8f",
  schrodingers_cat: "#6d6d6d",
  traitor: "#c44f4f",
}

export function roleDisplayName(role) {
  const customNames = {
    schrodingers_cat: "Schrödinger's Cat"
  }

  return customNames[role] || (role.charAt(0).toUpperCase() + role.slice(1))
}

export function getEffectiveTeam(player) {
  if (!player) return null

  if (player.role === "schrodingers_cat" && player.catAlignment) {
    return player.catAlignment
  }

  return roles[player.role]?.team || null
}