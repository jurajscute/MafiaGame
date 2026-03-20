import { SETTINGS_SECTIONS } from "./settingsScheme.js"
import { buildSettingsField } from "./settingsScheme.js"
import { roleColors, roleDisplayName } from "./gameData.js"

const TOWN_ROLES = ["doctor", "sheriff", "mayor", "spirit", "vigilante", "priest"]
const NEUTRAL_ROLES = ["jester", "executioner", "schrodingers_cat"]
const MAFIA_ROLES = ["framer", "traitor"]

function renderSectionFields(section, settings, onChangeName) {
  return section.fields
    .map(field => buildSettingsField(field, settings, onChangeName))
    .join("")
}

function renderRoleSection(section, settings, onChangeName) {
  const role = section.role
  const enabled = !!settings?.rolesEnabled?.[role]
  const color = roleColors[role] || "#fff"

  return `
    <div class="settings-role-card ${enabled ? "role-enabled" : ""}" data-role="${role}" style="--role-accent:${color}">
      <div class="settings-role-header">
        <div class="settings-role-meta">
          <div class="settings-role-name" style="color:${color}">
            ${roleDisplayName(role)}
          </div>
          <div class="settings-role-subtitle">
            ${section.title}
          </div>
        </div>

        <div class="settings-role-actions">
          <span class="settings-role-state">${enabled ? "ON" : "OFF"}</span>
        </div>
      </div>

      <div class="settings-role-panel show">
        <div class="settings-role-panel-inner">
          ${renderSectionFields(section, settings, onChangeName)}
        </div>
      </div>
    </div>
  `
}

function renderNonRoleSection(section, settings, onChangeName) {
  return `
    <div class="settings-section-modern">
      <div class="settings-section-title-modern">${section.title}</div>
      <div class="settings-grid-two">
        ${section.fields.map(field => `
          <div class="settings-quick-card">
            ${buildSettingsField(field, settings, onChangeName)}
          </div>
        `).join("")}
      </div>
    </div>
  `
}

function getRoleSectionsByGroup() {
  const roleSections = SETTINGS_SECTIONS.filter(section => section.role)

  return {
    town: roleSections.filter(section => TOWN_ROLES.includes(section.role)),
    neutral: roleSections.filter(section => NEUTRAL_ROLES.includes(section.role)),
    mafia: roleSections.filter(section => MAFIA_ROLES.includes(section.role))
  }
}

export function buildSharedSettingsContent({
  title = "Game Settings",
  subtitle = "Configure roles, rules, and special conditions",
  settings,
  onChangeName,
  includePresets = false,
  locked = false,
  mafiaOptionsHTML = "",
  footerHTML = ""
}) {
  const nonRoleSections = SETTINGS_SECTIONS.filter(section => !section.role)
  const grouped = getRoleSectionsByGroup()

  return `
    <div class="modal-content settings-modal-shell ${locked ? "settings-locked-mode" : ""}">
      <div class="settings-header">
        <div class="settings-header-main">
          <div>
            <h2 class="settings-title-modern">${title}</h2>
            <div class="settings-subtitle-modern">${subtitle}</div>
          </div>
          ${locked ? `<div class="settings-lock-badge">🔒 Locked</div>` : ""}
        </div>
      </div>

      <div class="settings-scroll">
        ${nonRoleSections.map(section =>
          renderNonRoleSection(section, settings, onChangeName)
        ).join("")}

        ${
          mafiaOptionsHTML
            ? `
              <div class="settings-section-modern">
                <div class="settings-section-title-modern">Mafia Count</div>
                <div class="settings-grid-two">
                  <div class="settings-quick-card">
                    <label class="settings-field-label">How many mafia?</label>
                    <select class="settings-modern-select" onchange="${onChangeName}('mafiaCountOverride', Number(this.value))">
                      ${mafiaOptionsHTML}
                    </select>
                  </div>
                </div>
              </div>
            `
            : ""
        }

        ${
          includePresets
            ? `
              <div class="settings-section-modern">
                <div class="settings-section-title-modern">Presets</div>
                <div class="settings-quick-card settings-full-width-card">
                  <div class="settings-preset-row">
                    <button type="button" onclick="applyPreset('classic')">Classic</button>
                    <button type="button" onclick="applyPreset('beginner')">Beginner</button>
                    <button type="button" onclick="applyPreset('chaotic')">Chaotic</button>
                  </div>
                </div>
              </div>
            `
            : ""
        }

        <div class="settings-section-modern">
          <div class="settings-section-title-modern">Roles</div>

          <div class="settings-role-group-title">Town</div>
          ${grouped.town.map(section => renderRoleSection(section, settings, onChangeName)).join("")}

          <div class="settings-role-group-title">Neutral</div>
          ${grouped.neutral.map(section => renderRoleSection(section, settings, onChangeName)).join("")}

          <div class="settings-role-group-title">Mafia</div>
          ${grouped.mafia.map(section => renderRoleSection(section, settings, onChangeName)).join("")}
        </div>
      </div>

      <div class="settings-footer">
        ${footerHTML}
      </div>
    </div>
  `
}