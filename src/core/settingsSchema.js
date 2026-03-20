export const SETTINGS_SECTIONS = [
  {
    id: "quick",
    title: "Quick Setup",
    fields: [
      {
        key: "revealRolesOnElimination",
        type: "select",
        label: "Reveal roles on elimination",
        options: [
          { value: "none", label: "Never" },
          { value: "death", label: "Night kill only" },
          { value: "vote_only", label: "Vote only" },
          { value: "death_and_vote", label: "Night kill and vote" }
        ]
      },
      {
        key: "mafiaCountOverride",
        type: "number",
        label: "Mafia count override",
        min: 0,
        max: 10
      },
      {
        key: "mafiaKillMethod",
        type: "select",
        label: "Mafia kill method",
        options: [
          { value: "leader", label: "Leader chooses" },
          { value: "vote", label: "Mafia vote" }
        ]
      },
      {
        key: "mafiaKnowsFirstLeader",
        type: "toggle",
        label: "Mafia know the first leader"
      },
      {
        key: "mafiaKnowsFramer",
        type: "toggle",
        label: "Mafia know the Framer"
      }
    ]
  },

  {
    id: "doctor",
    title: "Doctor",
    role: "doctor",
    fields: [
      {
        key: "rolesEnabled.doctor",
        type: "role_toggle",
        label: "Enable Doctor"
      },
      {
        key: "roleWeights.doctor",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.doctor",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "doctorRevealSave",
        type: "toggle",
        label: "Reveal saved player"
      }
    ]
  },

  {
    id: "sheriff",
    title: "Sheriff",
    role: "sheriff",
    fields: [
      {
        key: "rolesEnabled.sheriff",
        type: "role_toggle",
        label: "Enable Sheriff"
      },
      {
        key: "roleWeights.sheriff",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.sheriff",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "sheriffExactReveal",
        type: "toggle",
        label: "Reveal exact role"
      }
    ]
  },

  {
    id: "mayor",
    title: "Mayor",
    role: "mayor",
    fields: [
      {
        key: "rolesEnabled.mayor",
        type: "role_toggle",
        label: "Enable Mayor"
      },
      {
        key: "roleWeights.mayor",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.mayor",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "mayorVotePower",
        type: "select",
        label: "Vote power",
        options: [
          { value: 1.5, label: "1.5 votes" },
          { value: 2, label: "2 votes" },
          { value: 2.5, label: "2.5 votes" },
          { value: 3, label: "3 votes" }
        ]
      }
    ]
  },

  {
    id: "spirit",
    title: "Spirit",
    role: "spirit",
    fields: [
      {
        key: "rolesEnabled.spirit",
        type: "role_toggle",
        label: "Enable Spirit"
      },
      {
        key: "roleWeights.spirit",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.spirit",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "spiritRevealType",
        type: "select",
        label: "Reveal type",
        options: [
          { value: "exact", label: "Exact Role" },
          { value: "team", label: "Team Only" }
        ]
      },
      {
        key: "spiritActivation",
        type: "select",
        label: "Activates on",
        options: [
          { value: "night_only", label: "Night Death Only" },
          { value: "any_death", label: "Any Death" }
        ]
      },
      {
        key: "spiritCanSkipReveal",
        type: "toggle",
        label: "Can skip reveal"
      }
    ]
  },

  {
    id: "framer",
    title: "Framer",
    role: "framer",
    fields: [
      {
        key: "rolesEnabled.framer",
        type: "role_toggle",
        label: "Enable Framer"
      },
      {
        key: "roleWeights.framer",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.framer",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "framerKnowsSuccess",
        type: "toggle",
        label: "Knows if frame was successful"
      },
      {
        key: "framerKnowsMafia",
        type: "toggle",
        label: "Knows who the mafia are"
      }
    ]
  },

  {
    id: "jester",
    title: "Jester",
    role: "jester",
    fields: [
      {
        key: "rolesEnabled.jester",
        type: "role_toggle",
        label: "Enable Jester"
      },
      {
        key: "roleWeights.jester",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.jester",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "sheriffJesterResult",
        type: "select",
        label: "Sheriff sees Jester as",
        options: [
          { value: "innocent", label: "Innocent" },
          { value: "not_innocent", label: "Not Innocent" },
          { value: "exact", label: "Exact Role" }
        ]
      },
      {
        key: "jesterWinIfVigilanteKilled",
        type: "toggle",
        label: "Wins if killed by Vigilante"
      }
    ]
  },

  {
    id: "executioner",
    title: "Executioner",
    role: "executioner",
    fields: [
      {
        key: "rolesEnabled.executioner",
        type: "role_toggle",
        label: "Enable Executioner"
      },
      {
        key: "roleWeights.executioner",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.executioner",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "executionerTargetRule",
        type: "select",
        label: "Can target Jester or Mafia?",
        options: [
          { value: "neither", label: "Neither" },
          { value: "mafia", label: "Mafia" },
          { value: "jester", label: "Jester" },
          { value: "both", label: "Both" }
        ]
      },
      {
        key: "sheriffExecutionerResult",
        type: "select",
        label: "Sheriff sees Executioner as",
        options: [
          { value: "innocent", label: "Innocent" },
          { value: "not_innocent", label: "Not Innocent" },
          { value: "exact", label: "Exact Role" }
        ]
      },
      {
        key: "executionerWinIfDead",
        type: "toggle",
        label: "Can win while dead"
      },
      {
        key: "executionerWinIfVigilanteKillsTarget",
        type: "toggle",
        label: "Wins if Vigilante kills target"
      },
      {
        key: "executionerBecomes",
        type: "select",
        label: "After target dies, becomes",
        options: [
          { value: "jester", label: "Jester" },
          { value: "villager", label: "Villager" },
          { value: "traitor", label: "Traitor" }
        ]
      }
    ]
  },

  {
    id: "vigilante",
    title: "Vigilante",
    role: "vigilante",
    fields: [
      {
        key: "rolesEnabled.vigilante",
        type: "role_toggle",
        label: "Enable Vigilante"
      },
      {
        key: "roleWeights.vigilante",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.vigilante",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "vigilanteCanKillNeutrals",
        type: "toggle",
        label: "Can kill neutrals"
      },
      {
        key: "vigilanteWrongKillOutcome",
        type: "select",
        label: "Wrong target result",
        options: [
          { value: "both_die", label: "Both die" },
          { value: "only_vigilante_dies", label: "Only Vigilante dies" },
          { value: "only_target_dies", label: "Only target dies" }
        ]
      }
    ]
  },

  {
    id: "priest",
    title: "Priest",
    role: "priest",
    fields: [
      {
        key: "rolesEnabled.priest",
        type: "role_toggle",
        label: "Enable Priest"
      },
      {
        key: "roleWeights.priest",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.priest",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      },
      {
        key: "priestUsesPerGame",
        type: "select",
        label: "Holy Spirit uses per game",
        options: [
          { value: 1, label: "1 use" },
          { value: 2, label: "2 uses" },
          { value: 3, label: "3 uses" },
          { value: 4, label: "4 uses" }
        ]
      }
    ]
  },

  {
    id: "cat",
    title: "Schrödinger's Cat",
    role: "schrodingers_cat",
    fields: [
      {
        key: "rolesEnabled.schrodingers_cat",
        type: "role_toggle",
        label: "Enable Schrödinger's Cat"
      },
      {
        key: "roleWeights.schrodingers_cat",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.schrodingers_cat",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      }
    ]
  },

  {
    id: "traitor",
    title: "Traitor",
    role: "traitor",
    fields: [
      {
        key: "rolesEnabled.traitor",
        type: "role_toggle",
        label: "Enable Traitor"
      },
      {
        key: "roleWeights.traitor",
        type: "range",
        label: "Role chance",
        min: 0,
        max: 100,
        suffix: "%"
      },
      {
        key: "roleCounts.traitor",
        type: "number",
        label: "Maximum amount",
        min: 1,
        max: 10
      }
    ]
  },

{
  id: "framer",
  title: "Framer",
  role: "framer",
  fields: [
    {
      key: "rolesEnabled.framer",
      type: "role_toggle",
      label: "Enable Framer"
    },
    {
      key: "roleWeights.framer",
      type: "range",
      label: "Role chance",
      min: 0,
      max: 100,
      suffix: "%"
    },
    {
      key: "roleCounts.framer",
      type: "number",
      label: "Maximum amount",
      min: 1,
      max: 10
    },
    {
      key: "framerKnowsSuccess",
      type: "toggle",
      label: "Knows if frame was successful"
    },
    {
      key: "framerKnowsMafia",
      type: "toggle",
      label: "Knows who the mafia are"
    }
  ]
}

]

export function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj)
}

export function setNestedValue(obj, path, value) {
  const keys = path.split(".")
  const last = keys.pop()
  let target = obj

  for (const key of keys) {
    if (!target[key] || typeof target[key] !== "object") {
      target[key] = {}
    }
    target = target[key]
  }

  target[last] = value
}

export function buildSettingsField(field, settings, onChangeName) {
  const value = getNestedValue(settings, field.key)

  if (field.type === "toggle" || field.type === "role_toggle") {
    return `
      <div class="settings-field">
        <div class="settings-field-inline">
          <span class="settings-field-label-inline">${field.label}</span>
          <label class="switch">
            <input
              type="checkbox"
              ${value ? "checked" : ""}
              onchange="${onChangeName}('${field.key}', this.checked)"
            >
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  if (field.type === "select") {
    return `
      <div class="settings-field">
        <label class="settings-field-label">${field.label}</label>
        <select class="settings-modern-select" onchange="${onChangeName}('${field.key}', this.value)">
          ${field.options.map(option => `
            <option value="${option.value}" ${option.value == value ? "selected" : ""}>
              ${option.label}
            </option>
          `).join("")}
        </select>
      </div>
    `
  }

  if (field.type === "number") {
    return `
      <div class="settings-field">
        <label class="settings-field-label">${field.label}</label>
        <input
          class="settings-modern-number"
          type="number"
          min="${field.min ?? 0}"
          max="${field.max ?? 999}"
          value="${value}"
          onchange="${onChangeName}('${field.key}', Number(this.value))"
        >
      </div>
    `
  }

  if (field.type === "range") {
    return `
      <div class="settings-field">
        <label class="settings-field-label">${field.label}</label>
        <div class="settings-slider-row">
          <input
            type="range"
            min="${field.min ?? 0}"
            max="${field.max ?? 100}"
            value="${value}"
            oninput="${onChangeName}('${field.key}', Number(this.value))"
          >
          <span class="settings-slider-value">${value}${field.suffix || ""}</span>
        </div>
      </div>
    `
  }

  return ""
}
