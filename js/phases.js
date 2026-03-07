import {state,resetVotes,resetNightActions} from "./state.js"
import {render} from "./ui.js"

export function startNight(){

state.phase="night"

resetNightActions()

render(`

<div class="card">

<h2>Night ${state.night}</h2>

<p>Night roles take action.</p>

<button onclick="window.finishNight()">Finish Night</button>

</div>

`)

}

export function finishNight(){

state.phase="day"

render(`

<div class="card">

<h2>Daytime</h2>

<p>Discuss who is suspicious.</p>

<button onclick="window.startVoting()">Start Voting</button>

</div>

`)

}

export function startVoting(){

state.phase="voting"

resetVotes()

let buttons=""

state.players
.filter(p=>p.alive)
.forEach(p=>{

buttons+=`<button onclick="window.vote('${p.name}')">${p.name}</button>`

})

render(`

<div class="card">

<h2>Vote someone out</h2>

${buttons}

</div>

`)

}

export function vote(name){

let player=state.players.find(p=>p.name===name)

player.alive=false

render(`

<div class="card">

<h2>${name} was eliminated</h2>

<button onclick="window.nextNight()">Next Night</button>

</div>

`)

}

export function nextNight(){

state.night++

startNight()

}