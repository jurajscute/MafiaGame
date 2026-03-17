import { appState } from "./appState.js"

function renderModeSelect() {
  const app = document.getElementById("app")

  app.innerHTML = `
    <div class="card home-screen-card">
      <div class="home-hero">
        <div class="home-kicker">Choose Mode</div>

        <h1 class="home-title">
          Juraj's Mafia
        </h1>

        <div class="home-subtitle">
          Play locally on one device, or get ready for online multiplayer.
        </div>
      </div>

      <div class="home-actions">
        <button class="primary-btn" id="localModeBtn">
          Local Play
        </button>

        <button class="skip-btn" id="onlineModeBtn">
          Online Play
        </button>
      </div>
    </div>
  `

  document.getElementById("localModeBtn").addEventListener("click", async () => {
    appState.mode = "local"
    const mod = await import("./local/game.js")
    if (mod && typeof mod.bootLocalGame === "function") {
      mod.bootLocalGame()
    }
  })

  document.getElementById("onlineModeBtn").addEventListener("click", () => {
    appState.mode = "online"
    renderOnlineComingSoon()
  })
}

function renderOnlineComingSoon() {
  const app = document.getElementById("app")

  app.innerHTML = `
    <div class="card home-screen-card">
      <div class="home-hero">
        <div class="home-kicker">Online Mode</div>

        <h1 class="home-title">
          Coming Soon
        </h1>

        <div class="home-subtitle">
          Online multiplayer is not connected yet, but your project is now ready to grow into it.
        </div>
      </div>

      <div class="home-actions">
        <button class="primary-btn" id="backToModesBtn">
          Back
        </button>
      </div>
    </div>
  `

  document.getElementById("backToModesBtn").addEventListener("click", () => {
    appState.mode = null
    renderModeSelect()
  })
}

renderModeSelect()