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

export function buildSharedNightResultScreen({
  playerName,
  role,
  progressText,
  hintText,
  boxClass = "",
  boxKicker = "Result",
  title = "",
  titleColor = "",
  bodyText = "",
  progressBoxHTML = "",
  continueButtonHTML = ""
}) {
  const color = roleColors[role] || "white"
  const displayColor = titleColor || color

  return `
    <div class="card reveal-role-card role-${role}" style="--reveal-role-color:${color};">

      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Night Results</div>
        <div class="reveal-role-progress">${progressText}</div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${playerName}</div>
        <div class="reveal-role-hint">${hintText}</div>
      </div>

      <div class="night-action-role-box ${boxClass}">
        <div class="night-action-role-kicker">${boxKicker}</div>

        ${
          title
            ? `
              <div class="night-action-role-name" style="
                color:${displayColor};
                text-shadow:
                  0 0 10px ${displayColor},
                  0 0 20px ${displayColor};
              ">
                ${title}
              </div>
            `
            : ""
        }

        <p class="role-description">
          ${bodyText}
        </p>
      </div>

      ${progressBoxHTML}

      <div class="reveal-role-actions">
        ${continueButtonHTML}
      </div>

    </div>
  `
}

export function buildSharedNightActionScreen({
  playerName,
  role,
  progressText,
  hintText,
  panelLabel = "Decision",
  panelText = "Choose your target.",
  buttonsHTML = "",
  submitted = false,
  submittedText = "You are ready.",
  progressBoxHTML = "",
  actionButtonHTML = ""
}) {
  const roleColor = roleColors[role] || "white"

  return `
    <div class="card reveal-role-card role-${role} night-action-shell" style="--reveal-role-color:${roleColor};">

      <div class="reveal-role-topbar">
        <div class="reveal-role-kicker">Night Action</div>
        <div class="reveal-role-progress">${progressText}</div>
      </div>

      <div class="reveal-role-header">
        <div class="reveal-role-player">${playerName}</div>
        <div class="reveal-role-hint">${hintText}</div>
      </div>

      <div class="role-card reveal-role-flip revealed">
        <div class="role-inner">
          <div class="role-front reveal-role-front">
            <div class="reveal-role-front-shimmer"></div>
            <div class="reveal-role-front-inner">
              <div class="reveal-role-front-icon">✦</div>
              <div class="reveal-role-front-label">Your Role</div>
              <div class="reveal-role-front-text">${roleDisplayName(role)}</div>
            </div>
          </div>

          <div class="role-back reveal-role-back" style="color:${roleColor}">
            <div class="reveal-role-back-inner">
              <div class="reveal-role-back-kicker">Your Role</div>
              <div class="reveal-role-name">${roleDisplayName(role)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="night-action-panel">
        <div class="night-action-label">${submitted ? "Action Submitted" : panelLabel}</div>
        <div class="night-action-text">
          ${submitted ? submittedText : panelText}
        </div>
      </div>

      ${submitted ? "" : `<div class="night-action-target-grid">${buttonsHTML}</div>`}

      ${progressBoxHTML}

      <div class="reveal-role-actions">
        ${
          submitted
            ? `<button class="primary-btn" disabled>Waiting For Other Players</button>`
            : actionButtonHTML
        }
      </div>

    </div>
  `
}