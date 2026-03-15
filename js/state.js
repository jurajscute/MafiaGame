export const state = {

phase:"home",

players:[],

gameStarted: false,

openExecutionerReveal: null,

doctorRevealSave: false,

sheriffExactReveal: false,

mafiaCountOverride: 0,

revealRolesOnElimination: "none",

nightStep: "select",
nightResultIndex: 0,
nightPrivateResults: [],
nightResolved: null,

sheriffJesterResult: "not_innocent",
sheriffExecutionerResult: "not_innocent",

framerKnowsSuccess: true,
framerKnowsMafia: true,
mafiaKnowsFramer: true,

spiritRevealType: "exact",
spiritActivation: "night_only",
spiritCanSkipReveal: true,

mayorVotePower: 2,

spiritReveal: null,

mafiaKillMethod: "leader",
currentMafiaLeader: null,
mafiaLeaderIndex: 0,

mafiaKnowsFirstLeader: false,

vigilanteOutcomeToShow: null,
vigilantePublicReveal: null,

jesterWinIfVigilanteKilled: false,

executionerWinIfVigilanteKillsTarget: false,

gameLog: [],
gameStats: {
nights: 0,
votesCast: 0,
eliminations: 0
},
hostMode: false,

night:0,

nightTurnIndex: 0,

mafiaLeaderOrder: [],

rolesEnabled:{
doctor:true,
sheriff:true,
jester:true
},

vigilanteCanKillNeutrals: true,
vigilanteWrongKillOutcome: "both_die",

executionerTargets: {},
executionerTargetRule: "neither",
executionerWinIfDead: false,

votes:{},

roleWeights: {
doctor: 50,
sheriff: 50,
jester: 50
},

nightActions:{
kill:null,
save:null,
investigate:null
},

roleCounts:{
doctor:1,
sheriff:1,
jester:1
}

}

export function resetVotes(){

state.votes={}

}

export function resetNightActions(){
  state.nightActions = []
  state.nightPrivateResults = []
  state.nightResolved = null
  state.nightResultIndex = 0
  state.nightDeaths = []
  state.spiritReveal = null
}

export function resetGameTracking(){
  state.gameStats = {
    nights: 0,
    votesCast: 0,
    eliminations: 0
  }

  state.gameLog = []
  state.nightDeaths = []
  state.nightActions = []
  state.nightPrivateResults = []
  state.nightResolved = null
  state.votes = {}
  state.spiritReveal = null
  state.pendingSpiritVoteReveal = null
  state.pendingVoteEliminated = null
  state.pendingVoteResultsHTML = ""
  state.vigilanteOutcomeToShow = null
  state.vigilantePublicReveal = null

  state.players.forEach(p => {
    p.alive = true
  })
}

export function addLogEntry(text){
state.gameLog.push(text)
}

window.toggleHostMode = function(enabled){

state.hostMode = enabled

localStorage.setItem(
"mafiaHostMode",
JSON.stringify(enabled)
)

}
