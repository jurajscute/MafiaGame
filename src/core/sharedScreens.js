import { roleColors, roleDisplayName } from "./gameData.js"

export function buildSharedRoleRevealScreen({
  playerName,
  role,
  roleDescription,
  progressText,
  hintText,
  extraInfoHTML = "",
  continueButtonHTML,
  flipped = false,
  flipHandler = ""
}) {
  const color = roleColors[role] || "white"

  return `
    <div class="card reveal-role-card role-${role}" style="--reveal-role-color:${color};">

      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Private Role Reveal</div>
        <div class="reveal-role-progress">${progressText}</div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${playerName}</div>
        <div class="reveal-role-hint">${hintText}</div>
      </div>

      <div class="role-card reveal-role-flip ${flipped ? "revealed" : ""}" ${flipHandler}>
        <div class="role-inner">

          <div class="role-front reveal-role-front">
            <div class="reveal-role-front-shimmer"></div>
            <div class="reveal-role-front-inner">
              <div class="reveal-role-front-icon">✦</div>
              <div class="reveal-role-front-label">Hidden Role</div>
              <div class="reveal-role-front-text">Tap to reveal</div>
            </div>
          </div>

          <div class="role-back reveal-role-back" style="color:${color}">
            <div class="reveal-role-back-inner">
              <div class="reveal-role-back-kicker">Your Role</div>
              <div class="reveal-role-name">${roleDisplayName(role)}</div>
            </div>
          </div>

        </div>
      </div>

      <div class="reveal-role-description-wrap">
        <p class="role-description reveal-role-description">
          ${roleDescription || ""}
        </p>
      </div>

      ${extraInfoHTML ? `<div class="reveal-role-extra">${extraInfoHTML}</div>` : ""}

      <div class="reveal-role-actions">
        ${continueButtonHTML}
      </div>

    </div>
  `
}