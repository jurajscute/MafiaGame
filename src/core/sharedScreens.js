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

export function buildSharedMorningScreen({
  resultsHTML = "",
  playersHTML = "",
  progressBoxHTML = "",
  continueButtonHTML = ""
}) {
  return `
    <div class="card morning-card">

      <div class="morning-hero">
        <div class="morning-kicker">Daybreak</div>
        <h2 class="morning-title">Morning</h2>
        <div class="morning-subtitle">
          The town wakes to see what the night has brought.
        </div>
      </div>

      <div class="morning-results-wrap">
        ${resultsHTML}
      </div>

      <div class="player-status-box">
        <h3>Players</h3>
        ${playersHTML}
      </div>

      ${progressBoxHTML}

      <div class="morning-actions">
        ${continueButtonHTML}
      </div>

    </div>
  `
}

export function buildSharedVoteResultsScreen({
  outcomeHTML = "",
  resultsHTML = "",
  playersHTML = "",
  progressBoxHTML = "",
  continueButtonHTML = ""
}) {
  return `
    <div class="card morning-card voting-results-card">

      <div class="morning-header voting-results-header">
        <div class="morning-kicker">Day Resolution</div>
        <h2 class="morning-title">Voting Results</h2>
        <p class="morning-subtitle">
          The town has chosen who to cast out.
        </p>
      </div>

      ${outcomeHTML}

      <div class="vote-results-panel">
        ${resultsHTML}
      </div>

      <div class="player-status-box">
        <h3>Players</h3>
        ${playersHTML}
      </div>

      ${progressBoxHTML}

      <div class="reveal-role-actions">
        ${continueButtonHTML}
      </div>

    </div>
  `
}

export function buildSharedWinScreen({
  bodyClass = "win-village",
  cardClass = "role-doctor",
  title = "GAME OVER",
  linesHTML = "",
  progressBoxHTML = "",
  continueButtonHTML = ""
}) {
  return {
    bodyClass,
    html: `
      <div class="card ${cardClass}">
        <h1 class="role-title">${title}</h1>

        ${linesHTML}

        ${progressBoxHTML}

        ${continueButtonHTML}
      </div>
    `
  }
}

export function buildSharedFinalResultsScreen({
  winnerBanner,
  stats,
  mafiaHTML,
  townHTML,
  neutralHTML,
  logHTML,
  continueButtonHTML = ""
}) {
  return `
    <div class="final-results-centered">
      <div class="card final-results-card final-results-shell">

        <div class="final-results-hero ${winnerBanner.className}">
          <div class="final-results-kicker">${winnerBanner.label}</div>
          <h2 class="final-results-title">${winnerBanner.title}</h2>
          <div class="final-results-subtitle">
            ${winnerBanner.subtitle}
          </div>
        </div>

        <div class="final-summary-grid">
          <div class="final-summary-stat">
            <div class="final-summary-value">${stats.nights}</div>
            <div class="final-summary-label">Nights</div>
          </div>

          <div class="final-summary-stat">
            <div class="final-summary-value">${stats.votesCast}</div>
            <div class="final-summary-label">Votes Cast</div>
          </div>

          <div class="final-summary-stat">
            <div class="final-summary-value">${stats.eliminations}</div>
            <div class="final-summary-label">Deaths</div>
          </div>

          <div class="final-summary-stat">
            <div class="final-summary-value">${stats.players}</div>
            <div class="final-summary-label">Players</div>
          </div>
        </div>

        <div class="final-team-sections">

          <div class="final-team-card final-team-mafia">
            <div class="final-team-header">
              <div>
                <div class="final-team-kicker">Team</div>
                <h3 class="final-team-title mafia-win">Mafia</h3>
              </div>
              <div class="final-team-count">${stats.mafiaCount}</div>
            </div>

            <div class="final-team-list">
              ${mafiaHTML}
            </div>
          </div>

          <div class="final-team-card final-team-town">
            <div class="final-team-header">
              <div>
                <div class="final-team-kicker">Team</div>
                <h3 class="final-team-title village-win">Town</h3>
              </div>
              <div class="final-team-count">${stats.townCount}</div>
            </div>

            <div class="final-team-list">
              ${townHTML}
            </div>
          </div>

          <div class="final-team-card final-team-neutral">
            <div class="final-team-header">
              <div>
                <div class="final-team-kicker">Team</div>
                <h3 class="final-team-title neutral-team">Neutral</h3>
              </div>
              <div class="final-team-count">${stats.neutralCount}</div>
            </div>

            <div class="final-team-list">
              ${neutralHTML}
            </div>
          </div>

        </div>

        <div class="final-log-card">
          <div class="final-log-header">
            <div>
              <div class="final-team-kicker">Timeline</div>
              <h3 class="final-log-title">Game Log</h3>
            </div>
          </div>

          <div class="game-log-box final-log-box">
            ${logHTML}
          </div>
        </div>

        ${continueButtonHTML}

      </div>
    </div>
  `
}